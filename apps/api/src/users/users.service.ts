import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException
} from "@nestjs/common";
import { type User } from "@prisma/client";
import { isMainlandPhoneNumber } from "../common/phone";
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

@Injectable()
export class UsersService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

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
    const phoneNumber = dto.phoneNumber.trim();

    if (!isMainlandPhoneNumber(phoneNumber)) {
      throw new BadRequestException("手机号格式不正确");
    }

    const user = await this.prisma.user.update({
      where: {
        id: userId
      },
      data: {
        phoneNumber,
        phoneCountryCode: "86",
        phoneVerifiedAt: null
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
    const contactProfileComplete = Boolean(user.phoneNumber && isMainlandPhoneNumber(user.phoneNumber));

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
}
