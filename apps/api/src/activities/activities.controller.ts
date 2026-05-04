import { Body, Controller, Get, Inject, Param, Post, Put, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { CurrentUser } from "../common/auth/current-user.decorator";
import { JwtAuthGuard } from "../common/auth/jwt-auth.guard";
import { OptionalJwtAuthGuard } from "../common/auth/optional-jwt-auth.guard";
import type { AuthenticatedUser } from "../common/auth/types";
import { ActivitiesService } from "./activities.service";
import { CreateActivityDto } from "./dto/create-activity.dto";
import { CreateSignupDto } from "./dto/create-signup.dto";
import { MoveSignupDto } from "./dto/move-signup.dto";
import { UpdateCourtCapacityDto } from "./dto/update-court-capacity.dto";

@ApiTags("activities")
@ApiBearerAuth()
@Controller("activities")
export class ActivitiesController {
  constructor(@Inject(ActivitiesService) private readonly activitiesService: ActivitiesService) {}

  @Get()
  @ApiOperation({ summary: "List public activities" })
  listActivities() {
    return this.activitiesService.listActivities();
  }

  @Get("my")
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "List current user's published and joined activities" })
  listMyActivities(@CurrentUser() currentUser: AuthenticatedUser) {
    return this.activitiesService.listMyActivities(currentUser.userId);
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "Create an activity" })
  createActivity(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Body() dto: CreateActivityDto
  ) {
    return this.activitiesService.createActivity(currentUser.userId, dto);
  }

  @Get(":activityId")
  @UseGuards(OptionalJwtAuthGuard)
  @ApiOperation({ summary: "Get activity detail" })
  getActivityDetail(
    @Param("activityId") activityId: string,
    @CurrentUser() currentUser?: AuthenticatedUser
  ) {
    return this.activitiesService.getActivityDetail(activityId, currentUser?.userId);
  }

  @Post(":activityId/signups")
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "Sign up for an activity" })
  createSignup(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Param("activityId") activityId: string,
    @Body() dto: CreateSignupDto
  ) {
    return this.activitiesService.createSignup(currentUser.userId, activityId, dto);
  }

  @Post("signups/:signupId/cancel")
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "Cancel a signup" })
  cancelSignup(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Param("signupId") signupId: string
  ) {
    return this.activitiesService.cancelSignup(currentUser.userId, signupId);
  }

  @Put("courts/:courtId/capacity")
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "Update an activity court capacity" })
  updateCourtCapacity(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Param("courtId") courtId: string,
    @Body() dto: UpdateCourtCapacityDto
  ) {
    return this.activitiesService.updateCourtCapacity(currentUser.userId, courtId, dto);
  }

  @Put("signups/:signupId/court")
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "Move a signup to another court" })
  moveSignup(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Param("signupId") signupId: string,
    @Body() dto: MoveSignupDto
  ) {
    return this.activitiesService.moveSignup(currentUser.userId, signupId, dto);
  }
}
