import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException
} from "@nestjs/common";
import {
  OwnerType,
  SignupMode,
  SignupStatus,
  Prisma,
  type Activity,
  type ActivityCourt,
  type ActivitySignup,
  type User
} from "@prisma/client";
import { ClubsService } from "../clubs/clubs.service";
import { maskPhoneNumber } from "../common/phone";
import { PrismaService } from "../prisma/prisma.service";
import { UsersService } from "../users/users.service";
import { CreateActivityDto } from "./dto/create-activity.dto";
import { CreateSignupDto } from "./dto/create-signup.dto";
import { MoveSignupDto } from "./dto/move-signup.dto";
import { UpdateCourtCapacityDto } from "./dto/update-court-capacity.dto";

type SignupWithUser = ActivitySignup & {
  user: Pick<User, "id" | "nickname" | "avatarColor">;
};

type ActivityDetailModel = Activity & {
  courts: ActivityCourt[];
  signups: SignupWithUser[];
};

@Injectable()
export class ActivitiesService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(UsersService) private readonly usersService: UsersService,
    @Inject(ClubsService) private readonly clubsService: ClubsService
  ) {}

  async createActivity(userId: string, dto: CreateActivityDto) {
    const { ownerDisplay, personalOwnerId, clubId } = await this.resolveOwnerContext(
      userId,
      dto.ownerType,
      dto.ownerId
    );

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
          venueSnapshotName: dto.venueName.trim(),
          venueSnapshotAddress: dto.venueAddress?.trim() || null,
          venueSnapshotProvince: dto.venueProvince?.trim() || null,
          venueSnapshotCity: dto.venueCity?.trim() || null,
          venueSnapshotDistrict: dto.venueDistrict?.trim() || null,
          venueSnapshotLatitude: dto.venueLatitude ?? null,
          venueSnapshotLongitude: dto.venueLongitude ?? null,
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
          const courtName = court.courtName.trim();

          if (!courtName) {
            throw new BadRequestException("请填写场地名称");
          }

          await tx.activityCourt.create({
            data: {
              activityId: activity.id,
              courtCodeSnapshot: `${court.sortOrder}`,
              courtNameSnapshot: courtName,
              capacity: court.capacity,
              sortOrder: court.sortOrder
            }
          });
        }
      }

      return activity;
    });

    return this.getActivityDetail(created.id, userId);
  }

  async listActivities() {
    const activities = await this.prisma.activity.findMany({
      where: {
        status: "PUBLISHED"
      },
      orderBy: {
        activityStartAt: "asc"
      },
      take: 50,
      include: {
        signups: true
      }
    });

    return activities.map((activity) => this.toActivityListItemResponse(activity));
  }

  async listMyActivities(userId: string) {
    const activities = await this.prisma.activity.findMany({
      where: {
        OR: [
          {
            createdByUserId: userId
          },
          {
            signups: {
              some: {
                userId,
                signupStatus: {
                  not: SignupStatus.CANCELLED
                }
              }
            }
          }
        ]
      },
      orderBy: {
        activityStartAt: "asc"
      },
      include: this.getDetailInclude()
    });

    return {
      published: activities
        .filter((activity) => activity.createdByUserId === userId)
        .map((activity) => this.toActivityDetailResponse(activity, userId)),
      joined: activities
        .filter((activity) =>
          activity.signups.some(
            (signup) => signup.userId === userId && signup.signupStatus !== SignupStatus.CANCELLED
          )
        )
        .map((activity) => this.toActivityDetailResponse(activity, userId))
    };
  }

  async getActivityDetail(activityId: string, currentUserId?: string) {
    const activity = await this.findActivityDetail(activityId);

    return this.toActivityDetailResponse(activity, currentUserId ?? "");
  }

  async createSignup(userId: string, activityId: string, dto: CreateSignupDto) {
    await this.assertCanUseSignupActions(userId);

    await this.prisma.$transaction(async (tx) => {
      const activity = await tx.activity.findUnique({
        where: {
          id: activityId
        },
        include: {
          courts: {
            where: {
              status: "ACTIVE"
            }
          },
          signups: {
            where: {
              signupStatus: {
                not: SignupStatus.CANCELLED
              }
            }
          }
        }
      });

      if (!activity) {
        throw new NotFoundException("活动不存在");
      }

      if (!this.isSignupOpen(activity)) {
        throw new BadRequestException("当前活动已截止报名");
      }

      if (activity.signups.some((signup) => signup.userId === userId)) {
        throw new BadRequestException("你已经报过这个活动了");
      }

      const scopeCourtId = this.resolveSignupCourtId(activity, dto.activityCourtId);
      const capacity =
        activity.signupMode === SignupMode.GENERAL
          ? activity.totalCapacity ?? 0
          : activity.courts.find((court) => court.id === scopeCourtId)?.capacity ?? 0;
      const scopedSignups = activity.signups.filter((signup) =>
        scopeCourtId ? signup.activityCourtId === scopeCourtId : !signup.activityCourtId
      );
      const confirmedCount = scopedSignups.filter(
        (signup) => signup.signupStatus === SignupStatus.CONFIRMED
      ).length;
      const waitlistCount = scopedSignups.filter(
        (signup) => signup.signupStatus === SignupStatus.WAITLIST
      ).length;
      const signupStatus =
        capacity > 0 && confirmedCount >= capacity ? SignupStatus.WAITLIST : SignupStatus.CONFIRMED;

      const signup = await tx.activitySignup.create({
        data: {
          activityId,
          userId,
          activityCourtId: scopeCourtId,
          signupStatus,
          queueNo: signupStatus === SignupStatus.WAITLIST ? waitlistCount + 1 : null
        }
      });

      await tx.activitySignupLog.create({
        data: {
          activityId,
          registrationId: signup.id,
          action: "REGISTRATION_CREATED",
          operatorId: userId,
          toActivityCourtId: scopeCourtId,
          detail: signupStatus === SignupStatus.WAITLIST ? "候补报名" : "确认报名"
        }
      });
    });

    return this.getActivityDetail(activityId, userId);
  }

  async cancelSignup(userId: string, signupId: string) {
    const activityId = await this.prisma.$transaction(async (tx) => {
      const signup = await tx.activitySignup.findUnique({
        where: {
          id: signupId
        },
        include: {
          activity: true
        }
      });

      if (!signup || signup.signupStatus === SignupStatus.CANCELLED) {
        throw new NotFoundException("报名记录不存在");
      }

      if (signup.userId !== userId) {
        throw new ForbiddenException("只能取消自己的报名");
      }

      if (!this.canCancelSignup(signup.activity)) {
        throw new BadRequestException("当前活动不可取消报名");
      }

      await tx.activitySignup.update({
        where: {
          id: signup.id
        },
        data: {
          signupStatus: SignupStatus.CANCELLED,
          cancelledAt: new Date(),
          cancelReason: "用户主动取消",
          queueNo: null
        }
      });

      await tx.activitySignupLog.create({
        data: {
          activityId: signup.activityId,
          registrationId: signup.id,
          action: "REGISTRATION_CANCELLED",
          operatorId: userId,
          fromActivityCourtId: signup.activityCourtId,
          detail: "用户主动取消报名"
        }
      });

      if (signup.signupStatus === SignupStatus.CONFIRMED) {
        await this.promoteWaitlist(tx, signup.activity, signup.activityCourtId);
      } else {
        await this.renumberWaitlist(tx, signup.activityId, signup.activityCourtId);
      }

      return signup.activityId;
    });

    return this.getActivityDetail(activityId, userId);
  }

  async updateCourtCapacity(userId: string, courtId: string, dto: UpdateCourtCapacityDto) {
    const activityId = await this.prisma.$transaction(async (tx) => {
      const court = await tx.activityCourt.findUnique({
        where: {
          id: courtId
        },
        include: {
          activity: {
            include: {
              signups: {
                where: {
                  signupStatus: {
                    not: SignupStatus.CANCELLED
                  }
                }
              }
            }
          }
        }
      });

      if (!court || court.status !== "ACTIVE") {
        throw new NotFoundException("活动场地不存在");
      }

      this.assertCanManageActivity(court.activity, userId);

      if (court.activity.signupMode !== SignupMode.USER_SELECT_COURT) {
        throw new BadRequestException("当前活动不可按场地调整容量");
      }

      if (this.isActivityFinished(court.activity)) {
        throw new BadRequestException("活动已结束，不能再调整容量");
      }

      const confirmedCount = court.activity.signups.filter(
        (signup) =>
          signup.activityCourtId === court.id && signup.signupStatus === SignupStatus.CONFIRMED
      ).length;

      if (dto.capacity < confirmedCount) {
        throw new BadRequestException("容量不能小于当前已确认人数");
      }

      await tx.activityCourt.update({
        where: {
          id: court.id
        },
        data: {
          capacity: dto.capacity
        }
      });

      await this.promoteWaitlist(tx, court.activity, court.id, dto.capacity);

      return court.activityId;
    });

    return this.getActivityDetail(activityId, userId);
  }

  async moveSignup(userId: string, signupId: string, dto: MoveSignupDto) {
    const activityId = await this.prisma.$transaction(async (tx) => {
      const signup = await tx.activitySignup.findUnique({
        where: {
          id: signupId
        },
        include: {
          activity: {
            include: {
              courts: {
                where: {
                  status: "ACTIVE"
                }
              },
              signups: {
                where: {
                  signupStatus: {
                    not: SignupStatus.CANCELLED
                  }
                }
              }
            }
          }
        }
      });

      if (!signup || signup.signupStatus === SignupStatus.CANCELLED) {
        throw new NotFoundException("报名记录不存在");
      }

      this.assertCanManageActivity(signup.activity, userId);

      if (signup.activity.signupMode !== SignupMode.USER_SELECT_COURT) {
        throw new BadRequestException("当前活动不是自主选场");
      }

      if (this.isActivityFinished(signup.activity)) {
        throw new BadRequestException("活动已结束，不能再调整场地");
      }

      const targetCourt = signup.activity.courts.find((court) => court.id === dto.activityCourtId);

      if (!targetCourt) {
        throw new NotFoundException("目标场地不存在");
      }

      if (signup.activityCourtId === targetCourt.id) {
        return signup.activityId;
      }

      const targetSignups = signup.activity.signups.filter(
        (item) => item.id !== signup.id && item.activityCourtId === targetCourt.id
      );
      const confirmedCount = targetSignups.filter(
        (item) => item.signupStatus === SignupStatus.CONFIRMED
      ).length;
      const waitlistCount = targetSignups.filter(
        (item) => item.signupStatus === SignupStatus.WAITLIST
      ).length;
      const nextStatus =
        confirmedCount >= targetCourt.capacity ? SignupStatus.WAITLIST : SignupStatus.CONFIRMED;
      const sourceCourtId = signup.activityCourtId;

      await tx.activitySignup.update({
        where: {
          id: signup.id
        },
        data: {
          activityCourtId: targetCourt.id,
          signupStatus: nextStatus,
          queueNo: nextStatus === SignupStatus.WAITLIST ? waitlistCount + 1 : null
        }
      });

      await tx.activitySignupLog.create({
        data: {
          activityId: signup.activityId,
          registrationId: signup.id,
          action: "REGISTRATION_MOVED",
          operatorId: userId,
          fromActivityCourtId: sourceCourtId,
          toActivityCourtId: targetCourt.id,
          detail: nextStatus === SignupStatus.WAITLIST ? "调整场地后候补" : "调整场地后确认"
        }
      });

      await this.renumberWaitlist(tx, signup.activityId, targetCourt.id);
      if (sourceCourtId && signup.signupStatus === SignupStatus.CONFIRMED) {
        await this.promoteWaitlist(tx, signup.activity, sourceCourtId);
      }

      return signup.activityId;
    });

    return this.getActivityDetail(activityId, userId);
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
        throw new BadRequestException("请先填写联系手机号");
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

  private async assertCanUseSignupActions(userId: string) {
    const profile = await this.usersService.getProfileById(userId);

    if (!profile.baseProfileComplete || !profile.contactProfileComplete) {
      throw new BadRequestException("请先完善资料和联系手机号");
    }
  }

  private assertCanManageActivity(activity: Pick<Activity, "createdByUserId">, userId: string) {
    if (activity.createdByUserId !== userId) {
      throw new ForbiddenException("你没有管理该活动的权限");
    }
  }

  private resolveSignupCourtId(
    activity: Activity & { courts: ActivityCourt[] },
    activityCourtId?: string
  ): string | null {
    if (activity.signupMode === SignupMode.GENERAL) {
      if (activityCourtId) {
        throw new BadRequestException("当前活动不支持选择场地");
      }

      return null;
    }

    if (!activityCourtId) {
      throw new BadRequestException("请选择报名场地");
    }

    const court = activity.courts.find((item) => item.id === activityCourtId);

    if (!court) {
      throw new BadRequestException("活动场地不存在");
    }

    return court.id;
  }

  private async findActivityDetail(activityId: string): Promise<ActivityDetailModel> {
    const activity = await this.prisma.activity.findUnique({
      where: {
        id: activityId
      },
      include: this.getDetailInclude()
    });

    if (!activity) {
      throw new NotFoundException("活动不存在");
    }

    return activity;
  }

  private getDetailInclude() {
    return {
      courts: {
        where: {
          status: "ACTIVE" as const
        },
        orderBy: {
          sortOrder: "asc" as const
        }
      },
      signups: {
        where: {
          signupStatus: {
            not: SignupStatus.CANCELLED
          }
        },
        orderBy: {
          createdAt: "asc" as const
        },
        include: {
          user: {
            select: {
              id: true,
              nickname: true,
              avatarColor: true
            }
          }
        }
      }
    };
  }

  private toActivityDetailResponse(activity: ActivityDetailModel, currentUserId: string) {
    const currentTime = new Date();
    const isSignupOpen = this.isSignupOpen(activity, currentTime);
    const isFinished = this.isActivityFinished(activity, currentTime);
    const isInProgress = this.isActivityInProgress(activity, currentTime);
    const currentUserSignup = activity.signups.find((signup) => signup.userId === currentUserId);
    const confirmedCount = activity.signups.filter(
      (signup) => signup.signupStatus === SignupStatus.CONFIRMED
    ).length;
    const waitlistCount = activity.signups.filter(
      (signup) => signup.signupStatus === SignupStatus.WAITLIST
    ).length;
    const currentCourt = currentUserSignup?.activityCourtId
      ? activity.courts.find((court) => court.id === currentUserSignup.activityCourtId)
      : null;

    return {
      activityId: activity.id,
      id: activity.id,
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
      venueSnapshotName: activity.venueSnapshotName,
      venueSnapshotAddress: activity.venueSnapshotAddress ?? "",
      venueSnapshotProvince: activity.venueSnapshotProvince ?? "",
      venueSnapshotCity: activity.venueSnapshotCity ?? "",
      venueSnapshotDistrict: activity.venueSnapshotDistrict ?? "",
      venueSnapshotLatitude: activity.venueSnapshotLatitude,
      venueSnapshotLongitude: activity.venueSnapshotLongitude,
      activityStartAt: activity.activityStartAt.toISOString(),
      activityEndAt: activity.activityEndAt.toISOString(),
      cancelDeadlineAt: activity.cancelDeadlineAt.toISOString(),
      cancelCutoffMinutesBeforeStart: activity.cancelCutoffMinutesBeforeStart,
      descriptionRichtext: activity.descriptionRichtext ?? "",
      signupMode: activity.signupMode,
      totalCapacity: activity.totalCapacity,
      isSignupOpen,
      isFinished,
      isInProgress,
      isManageable: currentUserId ? activity.createdByUserId === currentUserId : false,
      currentUserRegistrationId: currentUserSignup?.id ?? null,
      currentUserSignupStatus: currentUserSignup?.signupStatus ?? null,
      currentUserSignupLabel: this.getCurrentUserSignupLabel(
        activity.signupMode,
        currentUserSignup,
        currentCourt
      ),
      canCancelCurrentUserRegistration:
        Boolean(currentUserSignup) && this.canCancelSignup(activity, currentTime),
      confirmedCount,
      waitlistCount,
      courts: activity.courts.map((court) => {
        const registrations = activity.signups.filter(
          (signup) => signup.activityCourtId === court.id
        );
        const courtConfirmedCount = registrations.filter(
          (signup) => signup.signupStatus === SignupStatus.CONFIRMED
        ).length;
        const courtWaitlistCount = registrations.filter(
          (signup) => signup.signupStatus === SignupStatus.WAITLIST
        ).length;

        return {
          id: court.id,
          venueCourtId: court.venueCourtId,
          label: court.courtNameSnapshot,
          code: court.courtCodeSnapshot,
          capacity: court.capacity,
          confirmedCount: courtConfirmedCount,
          waitlistCount: courtWaitlistCount,
          isFull: courtConfirmedCount >= court.capacity,
          registrations: registrations.map((signup) =>
            this.toRegistrationMemberResponse(signup, currentUserId)
          )
        };
      }),
      registrations:
        activity.signupMode === SignupMode.GENERAL
          ? activity.signups.map((signup) => this.toRegistrationMemberResponse(signup, currentUserId))
          : []
    };
  }

  private toRegistrationMemberResponse(signup: SignupWithUser, currentUserId: string) {
    return {
      registrationId: signup.id,
      userId: signup.userId,
      nickname: signup.user.nickname ?? "球友",
      avatarColor: signup.user.avatarColor,
      signupStatus: signup.signupStatus,
      queueNo: signup.queueNo ?? undefined,
      isCurrentUser: signup.userId === currentUserId
    };
  }

  private getCurrentUserSignupLabel(
    signupMode: SignupMode,
    signup: ActivitySignup | undefined,
    court: ActivityCourt | null | undefined
  ) {
    if (!signup) {
      return "未报名";
    }

    const statusLabel = signup.signupStatus === SignupStatus.WAITLIST ? "候补" : "已确认";

    if (signupMode === SignupMode.USER_SELECT_COURT) {
      return `${court?.courtNameSnapshot ?? "场地"} · ${statusLabel}`;
    }

    return `统一报名 · ${statusLabel}`;
  }

  private toActivityListItemResponse(
    activity: Activity & {
      signups: Array<{
        signupStatus: SignupStatus;
      }>;
    }
  ) {
    const confirmedCount = activity.signups.filter(
      (signup) => signup.signupStatus === SignupStatus.CONFIRMED
    ).length;
    const waitlistCount = activity.signups.filter(
      (signup) => signup.signupStatus === SignupStatus.WAITLIST
    ).length;

    return {
      activityId: activity.id,
      title: activity.title,
      ownerType: activity.ownerType,
      ownerLabel: activity.ownerDisplayName ?? "",
      coverUrl: activity.coverUrl ?? "",
      venueSnapshotName: activity.venueSnapshotName,
      activityStartAt: activity.activityStartAt.toISOString(),
      activityEndAt: activity.activityEndAt.toISOString(),
      chargeMode: activity.chargeMode,
      chargeAmountCents: activity.chargeAmountCents,
      chargeDesc: activity.chargeDesc ?? "",
      confirmedCount,
      waitlistCount
    };
  }

  private async promoteWaitlist(
    tx: Prisma.TransactionClient,
    activity: Pick<Activity, "id" | "signupMode" | "totalCapacity">,
    activityCourtId: string | null,
    capacityOverride?: number
  ) {
    const capacity =
      capacityOverride ??
      (activity.signupMode === SignupMode.GENERAL
        ? activity.totalCapacity ?? 0
        : (
            await tx.activityCourt.findUnique({
              where: {
                id: activityCourtId ?? ""
              }
            })
          )?.capacity ?? 0);

    if (capacity < 1) {
      return;
    }

    let confirmedCount = await tx.activitySignup.count({
      where: {
        activityId: activity.id,
        activityCourtId,
        signupStatus: SignupStatus.CONFIRMED
      }
    });

    while (confirmedCount < capacity) {
      const waitlistSignup = await tx.activitySignup.findFirst({
        where: {
          activityId: activity.id,
          activityCourtId,
          signupStatus: SignupStatus.WAITLIST
        },
        orderBy: {
          createdAt: "asc"
        }
      });

      if (!waitlistSignup) {
        break;
      }

      await tx.activitySignup.update({
        where: {
          id: waitlistSignup.id
        },
        data: {
          signupStatus: SignupStatus.CONFIRMED,
          queueNo: null
        }
      });
      confirmedCount += 1;
    }

    await this.renumberWaitlist(tx, activity.id, activityCourtId);
  }

  private async renumberWaitlist(
    tx: Prisma.TransactionClient,
    activityId: string,
    activityCourtId: string | null
  ) {
    const waitlistSignups = await tx.activitySignup.findMany({
      where: {
        activityId,
        activityCourtId,
        signupStatus: SignupStatus.WAITLIST
      },
      orderBy: {
        createdAt: "asc"
      }
    });

    for (const [index, signup] of waitlistSignups.entries()) {
      await tx.activitySignup.update({
        where: {
          id: signup.id
        },
        data: {
          queueNo: index + 1
        }
      });
    }
  }

  private isSignupOpen(
    activity: Pick<Activity, "status" | "activityStartAt" | "activityEndAt" | "cancelDeadlineAt">,
    currentTime = new Date()
  ) {
    return (
      activity.status === "PUBLISHED" &&
      activity.activityStartAt.getTime() > currentTime.getTime() &&
      activity.activityEndAt.getTime() > currentTime.getTime() &&
      activity.cancelDeadlineAt.getTime() > currentTime.getTime()
    );
  }

  private canCancelSignup(
    activity: Pick<Activity, "status" | "activityStartAt" | "activityEndAt" | "cancelDeadlineAt">,
    currentTime = new Date()
  ) {
    return (
      activity.status === "PUBLISHED" &&
      activity.activityStartAt.getTime() > currentTime.getTime() &&
      activity.activityEndAt.getTime() > currentTime.getTime() &&
      activity.cancelDeadlineAt.getTime() > currentTime.getTime()
    );
  }

  private isActivityInProgress(
    activity: Pick<Activity, "status" | "activityStartAt" | "activityEndAt">,
    currentTime = new Date()
  ) {
    return (
      activity.status === "PUBLISHED" &&
      activity.activityStartAt.getTime() <= currentTime.getTime() &&
      activity.activityEndAt.getTime() > currentTime.getTime()
    );
  }

  private isActivityFinished(
    activity: Pick<Activity, "status" | "activityEndAt">,
    currentTime = new Date()
  ) {
    return activity.status === "PUBLISHED" && activity.activityEndAt.getTime() <= currentTime.getTime();
  }

  private joinDateTime(activityDate: string, time: string): Date {
    return new Date(`${activityDate}T${time}:00+08:00`);
  }
}
