import {
  Injectable,
  NotFoundException
} from "@nestjs/common";
import { ClubRole, type Club } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { CreateClubDto } from "./dto/create-club.dto";
import { UpdateClubDto } from "./dto/update-club.dto";

@Injectable()
export class ClubsService {
  constructor(private readonly prisma: PrismaService) {}

  async listOwnedClubs(userId: string): Promise<Club[]> {
    return this.prisma.club.findMany({
      where: {
        status: "ACTIVE",
        members: {
          some: {
            userId,
            role: ClubRole.OWNER
          }
        }
      },
      orderBy: {
        createdAt: "asc"
      }
    });
  }

  async getOwnedClubOrThrow(userId: string, clubId: string): Promise<Club> {
    const club = await this.prisma.club.findFirst({
      where: {
        id: clubId,
        status: "ACTIVE",
        members: {
          some: {
            userId,
            role: ClubRole.OWNER
          }
        }
      }
    });

    if (!club) {
      throw new NotFoundException("俱乐部不存在，或你没有操作权限");
    }

    return club;
  }

  async createClub(userId: string, dto: CreateClubDto) {
    const club = await this.prisma.club.create({
      data: {
        name: dto.name.trim(),
        category: dto.category,
        coverUrl: dto.coverUrl?.trim() || null,
        logoUrl: dto.logoUrl?.trim() || null,
        description: dto.description?.trim() || null,
        province: dto.province?.trim() || null,
        city: dto.city?.trim() || null,
        district: dto.district?.trim() || null,
        address: dto.address?.trim() || null,
        latitude: dto.latitude ?? null,
        longitude: dto.longitude ?? null,
        wechatId: dto.wechatId?.trim() || null,
        contactName: dto.contactName.trim(),
        contactPhone: dto.contactPhone.trim(),
        creatorId: userId,
        members: {
          create: {
            userId,
            role: ClubRole.OWNER
          }
        }
      }
    });

    return this.toClubResponse(club);
  }

  async updateClub(userId: string, clubId: string, dto: UpdateClubDto) {
    await this.getOwnedClubOrThrow(userId, clubId);
    const club = await this.prisma.club.update({
      where: {
        id: clubId
      },
      data: {
        ...(dto.name !== undefined ? { name: dto.name.trim() } : {}),
        ...(dto.category !== undefined ? { category: dto.category } : {}),
        ...(dto.coverUrl !== undefined ? { coverUrl: dto.coverUrl.trim() || null } : {}),
        ...(dto.logoUrl !== undefined ? { logoUrl: dto.logoUrl.trim() || null } : {}),
        ...(dto.description !== undefined ? { description: dto.description.trim() || null } : {}),
        ...(dto.province !== undefined ? { province: dto.province.trim() || null } : {}),
        ...(dto.city !== undefined ? { city: dto.city.trim() || null } : {}),
        ...(dto.district !== undefined ? { district: dto.district.trim() || null } : {}),
        ...(dto.address !== undefined ? { address: dto.address.trim() || null } : {}),
        ...(dto.latitude !== undefined ? { latitude: dto.latitude } : {}),
        ...(dto.longitude !== undefined ? { longitude: dto.longitude } : {}),
        ...(dto.wechatId !== undefined ? { wechatId: dto.wechatId.trim() || null } : {}),
        ...(dto.contactName !== undefined ? { contactName: dto.contactName.trim() } : {}),
        ...(dto.contactPhone !== undefined ? { contactPhone: dto.contactPhone.trim() } : {})
      }
    });

    return this.toClubResponse(club);
  }

  async listMyClubs(userId: string) {
    const clubs = await this.listOwnedClubs(userId);

    return clubs.map((club) => this.toClubResponse(club));
  }

  getClubStatus(club: Pick<Club, "name" | "contactName" | "contactPhone" | "address">):
    | "READY"
    | "NEEDS_CLUB_PROFILE"
    | "NEEDS_CLUB_PHONE" {
    if (!club.contactPhone?.trim()) {
      return "NEEDS_CLUB_PHONE";
    }

    if (!club.name.trim() || !club.contactName?.trim() || !club.address?.trim()) {
      return "NEEDS_CLUB_PROFILE";
    }

    return "READY";
  }

  assertClubOwner(userId: string, clubId: string): Promise<Club> {
    return this.getOwnedClubOrThrow(userId, clubId);
  }

  private toClubResponse(club: Club) {
    return {
      clubId: club.id,
      clubName: club.name,
      category: club.category,
      coverUrl: club.coverUrl ?? "",
      logoUrl: club.logoUrl ?? "",
      description: club.description ?? "",
      province: club.province ?? "",
      city: club.city ?? "",
      district: club.district ?? "",
      address: club.address ?? "",
      latitude: club.latitude,
      longitude: club.longitude,
      wechatId: club.wechatId ?? "",
      contactName: club.contactName ?? "",
      contactPhone: club.contactPhone ?? "",
      status: club.status,
      createdAt: club.createdAt.toISOString(),
      updatedAt: club.updatedAt.toISOString()
    };
  }
}
