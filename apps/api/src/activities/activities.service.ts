import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException
} from "@nestjs/common";
import {
  OwnerType,
  SignupMode,
  SignupStatus,
  type Activity,
  type ActivityCourt
} from "@prisma/client";
import { ClubsService } from "../clubs/clubs.service";
import { maskPhoneNumber } from "../common/phone";
import { PrismaService } from "../prisma/prisma.service";
import { UsersService } from "../users/users.service";
import { CreateActivityDto } from "./dto/create-activity.dto";

@Injectable()
export class ActivitiesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly usersService: UsersService,
    private readonly clubsService: ClubsService
  ) {}

  async createActivity(userId: string, dto: CreateActivityDto) {
    const { ownerDisplay, personalOwnerId, clubId } = await this.resolveOwnerContext(
      userId,
      dto.ownerType,
      dto.ownerId
    );
    const venue = await this.prisma.venue.findUnique({
      where: {
        id: dto.venueId
      }
    });

    if (!venue || venue.status !== "ACTIVE") {
      throw new NotFoundException("请选择有效场馆");
    }

    if (venue.ownerType !== dto.ownerType || venue.ownerId !== dto.ownerId) {
      throw new ForbiddenException("场馆不属于当前发布主体");
    }

    const activityStartAt = this.joinDateTime(dto.activityDate, dto.startTime);
    const activityEndAt = this.joinDateTime(dto.activityDate, dto.endTime);
    const cancelDeadlineAt = new Date(
      activityStartAt.getTime() - dto.cancelCutoffMinutesBeforeStart * 60 * 1000
    );

    if (activityEndAt.getTime() <= activityStartAt.getTime()) {
      throw new BadRequestException("结束时间需要晚于开始时间");
    }

    if (cancelDeadlineAt.getTime() > activityStartAt.getTime()) {
      throw new BadRequestException("停止取消时间不能晚于活动开始时间");
    }

    const created = await this.prisma.$transaction(async (tx) => {
      const activity = await tx.activity.create({
        data: {
          ownerType: dto.ownerType,
          ownerId: dto.ownerId,
          createdByUserId: userId,
          coverUrl: dto.coverUrl?.trim() || null,
          clubId,
          personalOwnerId,
          ownerDisplayMode: dto.ownerType,
          ownerDisplayName: ownerDisplay.name,
          ownerDisplayAvatarUrl: ownerDisplay.avatarUrl,
          ownerDisplayAvatarColor: ownerDisplay.avatarColor,
          ownerDisplayLogoUrl: ownerDisplay.logoUrl,
          ownerDisplayContactName: ownerDisplay.contactName,
          ownerDisplayContactPhone: ownerDisplay.contactPhone,
          title: dto.title.trim(),
          chargeMode: dto.chargeMode,
          chargeAmountCents: dto.chargeAmountCents,
          chargeDesc: dto.chargeDesc?.trim() || null,
          venueId: dto.venueId,
          venueSnapshotName: venue.name,
          activityStartAt,
          activityEndAt,
          cancelCutoffMinutesBeforeStart: dto.cancelCutoffMinutesBeforeStart,
          cancelDeadlineAt,
          descriptionRichtext: dto.descriptionRichtext?.trim() || null,
          signupMode: dto.signupMode,
          totalCapacity: dto.signupMode === SignupMode.GENERAL ? dto.totalCapacity ?? null : null
        }
      });

      if (dto.signupMode === SignupMode.USER_SELECT_COURT) {
        for (const court of dto.courts) {
          const venueCourt = await tx.venueCourt.findUnique({
            where: {
              id: court.venueCourtId
            }
          });

          if (!venueCourt || venueCourt.venueId !== dto.venueId || venueCourt.status !== "ACTIVE") {
            throw new BadRequestException("存在无效场地，请刷新后重试");
          }

          await tx.activityCourt.create({
            data: {
              activityId: activity.id,
              venueCourtId: court.venueCourtId,
              courtCodeSnapshot: venueCourt.courtCode,
              courtNameSnapshot: venueCourt.courtName,
              capacity: court.capacity,
              feeSnapshotCents: venueCourt.defaultFeeCents,
              descriptionSnapshot: venueCourt.description,
              sortOrder: court.sortOrder
            }
          });
        }
      }

      return activity;
    });

    return this.getActivityDetail(created.id);
  }

  async getActivityDetail(activityId: string) {
    const activity = await this.prisma.activity.findUnique({
      where: {
        id: activityId
      },
      include: {
        courts: {
          where: {
            status: "ACTIVE"
          },
          orderBy: {
            sortOrder: "asc"
          }
        },
        signups: true
      }
    });

    if (!activity) {
      throw new NotFoundException("活动不存在");
    }

    return this.toActivityDetailResponse(activity);
  }

  private async resolveOwnerContext(
    userId: string,
    ownerType: OwnerType,
    ownerId: string
  ): Promise<{
    ownerDisplay: {
      name: string;
      avatarUrl: string | null;
      avatarColor: string | null;
      logoUrl: string | null;
      contactName: string | null;
      contactPhone: string | null;
    };
    personalOwnerId: string | null;
    clubId: string | null;
  }> {
    if (ownerType === OwnerType.PERSONAL) {
      if (ownerId !== userId) {
        throw new ForbiddenException("你只能以自己的个人身份发布");
      }

      const profile = await this.usersService.getProfileById(userId);

      if (!profile.contactProfileComplete) {
        throw new BadRequestException("请先完成手机号验证");
      }

      return {
        ownerDisplay: {
          name: profile.nickname || "个人发起人",
          avatarUrl: profile.avatarUrl || null,
          avatarColor: profile.avatarColor || null,
          logoUrl: null,
          contactName: profile.nickname || "活动发起人",
          contactPhone: profile.phoneNumber || null
        },
        personalOwnerId: userId,
        clubId: null
      };
    }

    const club = await this.clubsService.assertClubOwner(userId, ownerId);

    if (!club.contactPhone?.trim()) {
      throw new BadRequestException("俱乐部缺少联系人手机号，请先补齐");
    }

    return {
      ownerDisplay: {
        name: club.name,
        avatarUrl: null,
        avatarColor: null,
        logoUrl: club.logoUrl,
        contactName: club.contactName ?? club.name,
        contactPhone: club.contactPhone
      },
      personalOwnerId: null,
      clubId: club.id
    };
  }

  private toActivityDetailResponse(
    activity: Activity & {
      courts: ActivityCourt[];
      signups: Array<{
        activityCourtId: string | null;
        signupStatus: SignupStatus;
      }>;
    }
  ) {
    const isSignupOpen =
      activity.status === "PUBLISHED" && new Date(activity.cancelDeadlineAt).getTime() > Date.now();

    return {
      activityId: activity.id,
      status: activity.status,
      ownerType: activity.ownerType,
      ownerId: activity.ownerId,
      ownerLabel: activity.ownerDisplayName ?? "",
      ownerDisplay: {
        mode: activity.ownerDisplayMode ?? activity.ownerType,
        name: activity.ownerDisplayName ?? "",
        avatarUrl: activity.ownerDisplayAvatarUrl ?? "",
        avatarColor: activity.ownerDisplayAvatarColor ?? "",
        logoUrl: activity.ownerDisplayLogoUrl ?? "",
        contactName: activity.ownerDisplayContactName ?? "",
        contactPhoneMasked: activity.ownerDisplayContactPhone
          ? maskPhoneNumber(activity.ownerDisplayContactPhone)
          : ""
      },
      title: activity.title,
      coverUrl: activity.coverUrl ?? "",
      chargeMode: activity.chargeMode,
      chargeAmountCents: activity.chargeAmountCents,
      chargeDesc: activity.chargeDesc ?? "",
      venueId: activity.venueId,
      venueSnapshotName: activity.venueSnapshotName,
      activityStartAt: activity.activityStartAt.toISOString(),
      activityEndAt: activity.activityEndAt.toISOString(),
      cancelDeadlineAt: activity.cancelDeadlineAt.toISOString(),
      cancelCutoffMinutesBeforeStart: activity.cancelCutoffMinutesBeforeStart,
      descriptionRichtext: activity.descriptionRichtext ?? "",
      signupMode: activity.signupMode,
      totalCapacity: activity.totalCapacity,
      isSignupOpen,
      courts: activity.courts.map((court) => {
        const confirmedCount = activity.signups.filter(
          (signup) =>
            signup.activityCourtId === court.id && signup.signupStatus === SignupStatus.CONFIRMED
        ).length;
        const waitlistCount = activity.signups.filter(
          (signup) =>
            signup.activityCourtId === court.id && signup.signupStatus === SignupStatus.WAITLIST
        ).length;

        return {
          id: court.id,
          venueCourtId: court.venueCourtId,
          label: court.courtNameSnapshot,
          code: court.courtCodeSnapshot,
          capacity: court.capacity,
          confirmedCount,
          waitlistCount
        };
      })
    };
  }

  private joinDateTime(activityDate: string, time: string): Date {
    return new Date(`${activityDate}T${time}:00+08:00`);
  }
}
