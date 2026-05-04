import { Controller, Get, Inject, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { CurrentUser } from "../common/auth/current-user.decorator";
import { JwtAuthGuard } from "../common/auth/jwt-auth.guard";
import type { AuthenticatedUser } from "../common/auth/types";
import { ActivityCreateService } from "./activity-create.service";

@ApiTags("activity-create")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller("activity-create")
export class ActivityCreateController {
  constructor(
    @Inject(ActivityCreateService) private readonly activityCreateService: ActivityCreateService
  ) {}

  @Get("context")
  @ApiOperation({ summary: "Get activity-create role card context for the current user" })
  getContext(@CurrentUser() currentUser: AuthenticatedUser) {
    return this.activityCreateService.getContext(currentUser.userId);
  }
}
