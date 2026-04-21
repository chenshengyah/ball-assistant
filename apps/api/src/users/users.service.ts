import {
  BadRequestException,
  Injectable,
  NotFoundException,
  ServiceUnavailableException
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { type User } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { UpdatePhoneNumberDto } from "./dto/update-phone-number.dto";
import { UpdateProfileDto } from "./dto/update-profile.dto";

type UserProfile = {
  userId: string;
  nickname: string;
  gender: User["gender"];
  avatarUrl: string;
  avatarColor: string;
  phoneNumber: string;
  phoneCountryCode: string;
  phoneVerifiedAt: string;
  baseProfileComplete: boolean;
  contactProfileComplete: boolean;
  isProfileComplete: boolean;
};

type WechatAccessTokenResponse = {
  access_token?: string;
  expires_in?: number;
  errcode?: number;
  errmsg?: string;
};

type WechatPhoneNumberResponse = {
  errcode?: number;
  errmsg?: string;
  phone_info?: {
    phoneNumber?: string;
    purePhoneNumber?: string;
    countryCode?: string;
  };
};

@Injectable()
export class UsersService {
  private wechatAccessToken:
    | {
        value: string;
        expiresAt: number;
      }
    | null = null;

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService
  ) {}

  async upsertWechatUser(openId: string): Promise<User> {
    return this.prisma.user.upsert({
      where: {
        openId
      },
      update: {},
      create: {
        openId,
        nickname: null,
        gender: null,
        avatarColor: this.pickAvatarColor(openId),
        phoneNumber: null,
        phoneCountryCode: null,
        phoneVerifiedAt: null
      }
    });
  }

  async getProfileById(userId: string): Promise<UserProfile> {
    const user = await this.prisma.user.findUnique({
      where: {
        id: userId
      }
    });

    if (!user) {
      throw new NotFoundException("User not found");
    }

    return this.toProfile(user);
  }

  async updateProfile(userId: string, dto: UpdateProfileDto): Promise<UserProfile> {
    const user = await this.prisma.user.update({
      where: {
        id: userId
      },
      data: {
        nickname: dto.nickname.trim(),
        gender: dto.gender,
        avatarUrl: dto.avatarUrl?.trim() || null
      }
    });

    return this.toProfile(user);
  }

  async updatePhoneNumber(userId: string, dto: UpdatePhoneNumberDto): Promise<UserProfile> {
    const phoneInfo = await this.exchangePhoneNumber(dto.code.trim());
    const phoneNumber = phoneInfo.purePhoneNumber || phoneInfo.phoneNumber;

    if (!phoneNumber) {
      throw new ServiceUnavailableException("微信手机号返回缺少号码信息");
    }

    const user = await this.prisma.user.update({
      where: {
        id: userId
      },
      data: {
        phoneNumber,
        phoneCountryCode: phoneInfo.countryCode || null,
        phoneVerifiedAt: new Date()
      }
    });

    return this.toProfile(user);
  }

  toProfile(
    user: Pick<
      User,
      | "id"
      | "nickname"
      | "gender"
      | "avatarUrl"
      | "avatarColor"
      | "phoneNumber"
      | "phoneCountryCode"
      | "phoneVerifiedAt"
    >
  ): UserProfile {
    const baseProfileComplete = Boolean(user.nickname && user.gender);
    const contactProfileComplete = Boolean(user.phoneNumber && user.phoneVerifiedAt);

    return {
      userId: user.id,
      nickname: user.nickname ?? "",
      gender: user.gender,
      avatarUrl: user.avatarUrl ?? "",
      avatarColor: user.avatarColor,
      phoneNumber: user.phoneNumber ?? "",
      phoneCountryCode: user.phoneCountryCode ?? "",
      phoneVerifiedAt: user.phoneVerifiedAt?.toISOString() ?? "",
      baseProfileComplete,
      contactProfileComplete,
      isProfileComplete: baseProfileComplete && contactProfileComplete
    };
  }

  private pickAvatarColor(seed: string): string {
    const palette = ["#4C7CF0", "#43B581", "#FF8A65", "#A66BFF", "#FFB547"];
    const hash = seed.split("").reduce((sum, character) => sum + character.charCodeAt(0), 0);

    return palette[hash % palette.length] ?? "#4C7CF0";
  }

  private async exchangePhoneNumber(code: string): Promise<{
    phoneNumber?: string;
    purePhoneNumber?: string;
    countryCode?: string;
  }> {
    if (!code) {
      throw new BadRequestException("手机号 code 不能为空");
    }

    const accessToken = await this.getWechatAccessToken();
    const response = await fetch(
      `https://api.weixin.qq.com/wxa/business/getuserphonenumber?access_token=${encodeURIComponent(
        accessToken
      )}`,
      {
        method: "POST",
        headers: {
          "content-type": "application/json"
        },
        body: JSON.stringify({ code })
      }
    );

    if (!response.ok) {
      throw new ServiceUnavailableException("微信手机号接口暂时不可用");
    }

    const payload = (await response.json()) as WechatPhoneNumberResponse;

    if (payload.errcode) {
      throw new BadRequestException(this.toWechatPhoneErrorMessage(payload));
    }

    if (!payload.phone_info) {
      throw new ServiceUnavailableException("微信手机号接口返回为空");
    }

    return payload.phone_info;
  }

  private async getWechatAccessToken(): Promise<string> {
    const cachedAccessToken = this.wechatAccessToken;

    if (cachedAccessToken && cachedAccessToken.expiresAt > Date.now()) {
      return cachedAccessToken.value;
    }

    const appId = this.configService.get<string>("WECHAT_MINIAPP_APP_ID", "");
    const appSecret = this.configService.get<string>("WECHAT_MINIAPP_APP_SECRET", "");

    if (!appId || !appSecret) {
      throw new ServiceUnavailableException(
        "未配置 WECHAT_MINIAPP_APP_ID / WECHAT_MINIAPP_APP_SECRET"
      );
    }

    const response = await fetch(
      `https://api.weixin.qq.com/cgi-bin/token?grant_type=client_credential&appid=${encodeURIComponent(
        appId
      )}&secret=${encodeURIComponent(appSecret)}`
    );

    if (!response.ok) {
      throw new ServiceUnavailableException("微信 access_token 获取失败");
    }

    const payload = (await response.json()) as WechatAccessTokenResponse;

    if (!payload.access_token || !payload.expires_in) {
      throw new ServiceUnavailableException(
        payload.errmsg ? `微信 access_token 获取失败：${payload.errmsg}` : "微信 access_token 获取失败"
      );
    }

    this.wechatAccessToken = {
      value: payload.access_token,
      expiresAt: Date.now() + Math.max(payload.expires_in - 120, 60) * 1000
    };

    return payload.access_token;
  }

  private toWechatPhoneErrorMessage(payload: WechatPhoneNumberResponse): string {
    if (payload.errcode === 40029) {
      return "手机号验证 code 已失效，请重新获取";
    }

    if (payload.errcode === 48001) {
      return "当前小程序主体未开通手机号快速验证能力";
    }

    if (payload.errcode === 45011) {
      return "微信手机号接口调用过于频繁，请稍后再试";
    }

    return payload.errmsg
      ? `微信手机号验证失败：${payload.errmsg}`
      : "微信手机号验证失败，请稍后重试";
  }
}
