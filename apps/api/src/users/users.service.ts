import { Injectable, NotFoundException } from "@nestjs/common";
import { Prisma, type User } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { UpdateProfileDto } from "./dto/update-profile.dto";

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

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
        avatarColor: this.pickAvatarColor(openId)
      }
    });
  }

  async getProfileById(userId: string) {
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

  async updateProfile(userId: string, dto: UpdateProfileDto) {
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

  toProfile(user: Pick<User, "id" | "nickname" | "gender" | "avatarUrl" | "avatarColor">) {
    return {
      userId: user.id,
      nickname: user.nickname ?? "",
      gender: user.gender,
      avatarUrl: user.avatarUrl ?? "",
      avatarColor: user.avatarColor
    };
  }

  private pickAvatarColor(seed: string): string {
    const palette = ["#4C7CF0", "#43B581", "#FF8A65", "#A66BFF", "#FFB547"];
    const hash = seed.split("").reduce((sum, character) => sum + character.charCodeAt(0), 0);

    return palette[hash % palette.length] ?? "#4C7CF0";
  }
}
