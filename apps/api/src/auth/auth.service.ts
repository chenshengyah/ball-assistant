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
    isProfileComplete: boolean;
  }> {
    const openId = this.toWechatOpenId(code);
    const user = await this.usersService.upsertWechatUser(openId);
    const accessToken = await this.jwtService.signAsync({
      sub: user.id,
      openId: user.openId
    });

    return {
      accessToken,
      user: this.usersService.toProfile(user),
      isProfileComplete: Boolean(user.nickname && user.gender)
    };
  }

  private toWechatOpenId(code: string): string {
    return `dev:${code}`;
  }
}
