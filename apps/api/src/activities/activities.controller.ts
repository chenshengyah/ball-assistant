import { Body, Controller, Get, Param, Post, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { CurrentUser } from "../common/auth/current-user.decorator";
import { JwtAuthGuard } from "../common/auth/jwt-auth.guard";
import type { AuthenticatedUser } from "../common/auth/types";
import { ActivitiesService } from "./activities.service";
import { CreateActivityDto } from "./dto/create-activity.dto";

@ApiTags("activities")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller("activities")
export class ActivitiesController {
  constructor(private readonly activitiesService: ActivitiesService) {}

  @Post()
  @ApiOperation({ summary: "Create an activity" })
  createActivity(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Body() dto: CreateActivityDto
  ) {
    return this.activitiesService.createActivity(currentUser.userId, dto);
  }

  @Get(":activityId")
  @ApiOperation({ summary: "Get activity detail" })
  getActivityDetail(@Param("activityId") activityId: string) {
    return this.activitiesService.getActivityDetail(activityId);
  }
}
