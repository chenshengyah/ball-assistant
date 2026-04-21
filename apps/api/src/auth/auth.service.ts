import { Injectable } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { UsersService } from "../users/users.service";

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService
  ) {}

  async loginWithWechatCode(code: string): Promise<{
    accessToken: string;
    user: ReturnType<UsersService["toProfile"]>;
    baseProfileComplete: boolean;
    contactProfileComplete: boolean;
    isProfileComplete: boolean;
  }> {
    const openId = this.toWechatOpenId(code);
    const user = await this.usersService.upsertWechatUser(openId);
    const profile = this.usersService.toProfile(user);
    const accessToken = await this.jwtService.signAsync({
      sub: user.id,
      openId: user.openId
    });

    return {
      accessToken,
      user: profile,
      baseProfileComplete: profile.baseProfileComplete,
      contactProfileComplete: profile.contactProfileComplete,
      isProfileComplete: profile.isProfileComplete
    };
  }

  private toWechatOpenId(code: string): string {
    return `dev:${code}`;
  }
}
