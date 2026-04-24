import { Body, Controller, Get, Param, Post, Put, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { CurrentUser } from "../common/auth/current-user.decorator";
import { JwtAuthGuard } from "../common/auth/jwt-auth.guard";
import type { AuthenticatedUser } from "../common/auth/types";
import { ClubsService } from "./clubs.service";
import { CreateClubDto } from "./dto/create-club.dto";
import { UpdateClubDto } from "./dto/update-club.dto";

@ApiTags("clubs")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller("clubs")
export class ClubsController {
  constructor(private readonly clubsService: ClubsService) {}

  @Post()
  @ApiOperation({ summary: "Create a club owned by the current user" })
  createClub(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Body() dto: CreateClubDto
  ) {
    return this.clubsService.createClub(currentUser.userId, dto);
  }

  @Put(":clubId")
  @ApiOperation({ summary: "Update a club owned by the current user" })
  updateClub(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Param("clubId") clubId: string,
    @Body() dto: UpdateClubDto
  ) {
    return this.clubsService.updateClub(currentUser.userId, clubId, dto);
  }

  @Get("my")
  @ApiOperation({ summary: "List clubs owned by the current user" })
  listMyClubs(@CurrentUser() currentUser: AuthenticatedUser) {
    return this.clubsService.listMyClubs(currentUser.userId);
  }
}
