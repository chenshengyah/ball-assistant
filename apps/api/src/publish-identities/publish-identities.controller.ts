import { Controller, Get, Inject, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { CurrentUser } from "../common/auth/current-user.decorator";
import { JwtAuthGuard } from "../common/auth/jwt-auth.guard";
import type { AuthenticatedUser } from "../common/auth/types";
import { PublishIdentitiesService } from "./publish-identities.service";

@ApiTags("publish-identities")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller("publish-identities")
export class PublishIdentitiesController {
  constructor(
    @Inject(PublishIdentitiesService)
    private readonly publishIdentitiesService: PublishIdentitiesService
  ) {}

  @Get()
  @ApiOperation({ summary: "List publish identities available to the current user" })
  listIdentities(@CurrentUser() currentUser: AuthenticatedUser) {
    return this.publishIdentitiesService.listIdentities(currentUser.userId);
  }
}
