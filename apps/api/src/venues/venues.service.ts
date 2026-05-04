import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException
} from "@nestjs/common";
import { OwnerType, type Venue, type VenueCourt } from "@prisma/client";
import { ClubsService } from "../clubs/clubs.service";
import { PrismaService } from "../prisma/prisma.service";
import { CreateCourtDto } from "./dto/create-court.dto";
import { CreateVenueDto } from "./dto/create-venue.dto";
import { UpdateCourtDto } from "./dto/update-court.dto";
import { UpdateVenueDto } from "./dto/update-venue.dto";

@Injectable()
export class VenuesService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(ClubsService) private readonly clubsService: ClubsService
  ) {}

  async listVenues(userId: string, ownerType: OwnerType, ownerId: string) {
    await this.assertOwnerAccess(userId, ownerType, ownerId);

    const venues = await this.prisma.venue.findMany({
      where: {
        ownerType,
        ownerId,
        status: "ACTIVE"
      },
      include: {
        courts: {
          where: {
            status: "ACTIVE"
          },
          orderBy: {
            sortOrder: "asc"
          }
        }
      },
      orderBy: {
        createdAt: "asc"
      }
    });

    return venues.map((venue) => this.toVenueResponse(venue));
  }

  async createVenue(userId: string, dto: CreateVenueDto) {
    await this.assertOwnerAccess(userId, dto.ownerType, dto.ownerId);

    const venue = await this.prisma.venue.create({
      data: {
        clubId: dto.ownerType === OwnerType.CLUB ? dto.ownerId : null,
        ownerType: dto.ownerType,
        ownerId: dto.ownerId,
        createdByUserId: userId,
        name: dto.name.trim(),
        shortName: dto.shortName?.trim() || dto.name.trim(),
        province: dto.province?.trim() || null,
        city: dto.city?.trim() || null,
        district: dto.district?.trim() || null,
        address: dto.address.trim(),
        latitude: dto.latitude ?? null,
        longitude: dto.longitude ?? null,
        navigationName: dto.navigationName?.trim() || dto.name.trim()
      },
      include: {
        courts: {
          orderBy: {
            sortOrder: "asc"
          }
        }
      }
    });

    return this.toVenueResponse(venue);
  }

  async updateVenue(userId: string, venueId: string, dto: UpdateVenueDto) {
    const venue = await this.getOwnedVenueOrThrow(userId, venueId);
    const nextOwnerType = dto.ownerType ?? venue.ownerType;
    const nextOwnerId = dto.ownerId ?? venue.ownerId;

    if (nextOwnerType !== venue.ownerType || nextOwnerId !== venue.ownerId) {
      throw new BadRequestException("暂不支持迁移场馆所属主体");
    }

    const updated = await this.prisma.venue.update({
      where: {
        id: venueId
      },
      data: {
        ...(dto.name !== undefined ? { name: dto.name.trim() } : {}),
        ...(dto.shortName !== undefined ? { shortName: dto.shortName.trim() || dto.name?.trim() || venue.shortName } : {}),
        ...(dto.province !== undefined ? { province: dto.province.trim() || null } : {}),
        ...(dto.city !== undefined ? { city: dto.city.trim() || null } : {}),
        ...(dto.district !== undefined ? { district: dto.district.trim() || null } : {}),
        ...(dto.address !== undefined ? { address: dto.address.trim() } : {}),
        ...(dto.latitude !== undefined ? { latitude: dto.latitude } : {}),
        ...(dto.longitude !== undefined ? { longitude: dto.longitude } : {}),
        ...(dto.navigationName !== undefined
          ? { navigationName: dto.navigationName.trim() || dto.name?.trim() || venue.navigationName }
          : {})
      },
      include: {
        courts: {
          orderBy: {
            sortOrder: "asc"
          }
        }
      }
    });

    return this.toVenueResponse(updated);
  }

  async createCourt(userId: string, dto: CreateCourtDto) {
    const venue = await this.getOwnedVenueOrThrow(userId, dto.venueId);
    await this.assertUniqueCourtCode(dto.venueId, dto.courtCode);
    const currentMaxSort = await this.prisma.venueCourt.aggregate({
      where: {
        venueId: dto.venueId
      },
      _max: {
        sortOrder: true
      }
    });
    const court = await this.prisma.venueCourt.create({
      data: {
        venueId: dto.venueId,
        courtCode: dto.courtCode.trim(),
        courtName: dto.courtName.trim(),
        defaultCapacity: dto.defaultCapacity ?? null,
        sortOrder: (currentMaxSort._max.sortOrder ?? 0) + 1
      }
    });

    return this.toCourtResponse(court, venue);
  }

  async updateCourt(userId: string, courtId: string, dto: UpdateCourtDto) {
    const court = await this.prisma.venueCourt.findUnique({
      where: {
        id: courtId
      },
      include: {
        venue: true
      }
    });

    if (!court) {
      throw new NotFoundException("场地不存在");
    }

    await this.getOwnedVenueOrThrow(userId, court.venueId);
    if (dto.courtCode !== undefined) {
      await this.assertUniqueCourtCode(court.venueId, dto.courtCode, courtId);
    }

    const updated = await this.prisma.venueCourt.update({
      where: {
        id: courtId
      },
      data: {
        ...(dto.courtCode !== undefined ? { courtCode: dto.courtCode.trim() } : {}),
        ...(dto.courtName !== undefined ? { courtName: dto.courtName.trim() } : {}),
        ...(dto.defaultCapacity !== undefined ? { defaultCapacity: dto.defaultCapacity } : {})
      }
    });

    return this.toCourtResponse(updated, court.venue);
  }

  async disableCourt(userId: string, courtId: string) {
    const court = await this.prisma.venueCourt.findUnique({
      where: {
        id: courtId
      }
    });

    if (!court) {
      throw new NotFoundException("场地不存在");
    }

    await this.getOwnedVenueOrThrow(userId, court.venueId);
    const disabled = await this.prisma.venueCourt.update({
      where: {
        id: courtId
      },
      data: {
        status: "INACTIVE"
      }
    });

    return this.toCourtResponse(disabled);
  }

  async getOwnedVenueOrThrow(userId: string, venueId: string) {
    const venue = await this.prisma.venue.findUnique({
      where: {
        id: venueId
      }
    });

    if (!venue || venue.status !== "ACTIVE") {
      throw new NotFoundException("场馆不存在");
    }

    await this.assertOwnerAccess(userId, venue.ownerType, venue.ownerId);

    return venue;
  }

  private async assertOwnerAccess(userId: string, ownerType: OwnerType, ownerId: string) {
    if (ownerType === OwnerType.PERSONAL) {
      if (ownerId !== userId) {
        throw new ForbiddenException("你只能操作自己的个人主体数据");
      }
      return;
    }

    await this.clubsService.assertClubOwner(userId, ownerId);
  }

  private async assertUniqueCourtCode(
    venueId: string,
    courtCode: string,
    excludeCourtId?: string
  ) {
    const duplicated = await this.prisma.venueCourt.findFirst({
      where: {
        venueId,
        courtCode: courtCode.trim(),
        id: excludeCourtId
          ? {
              not: excludeCourtId
            }
          : undefined
      }
    });

    if (duplicated) {
      throw new BadRequestException("该场地号已存在，请换一个");
    }
  }

  private toVenueResponse(
    venue: Venue & {
      courts?: VenueCourt[];
    }
  ) {
    return {
      venue: {
        id: venue.id,
        ownerType: venue.ownerType,
        ownerId: venue.ownerId,
        name: venue.name,
        shortName: venue.shortName ?? "",
        province: venue.province ?? "",
        city: venue.city ?? "",
        district: venue.district ?? "",
        address: venue.address,
        latitude: venue.latitude,
        longitude: venue.longitude,
        navigationName: venue.navigationName ?? "",
        status: venue.status
      },
      courts: (venue.courts ?? []).map((court) => this.toCourtResponse(court))
    };
  }

  private toCourtResponse(court: VenueCourt, venue?: Pick<Venue, "id">) {
    return {
      id: court.id,
      venueId: venue?.id ?? court.venueId,
      courtCode: court.courtCode,
      courtName: court.courtName,
      defaultCapacity: court.defaultCapacity,
      sortOrder: court.sortOrder,
      status: court.status
    };
  }
}
