import { Body, Controller, Get, Param, Post, Put, Query, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { OwnerType } from "@prisma/client";
import { CurrentUser } from "../common/auth/current-user.decorator";
import { JwtAuthGuard } from "../common/auth/jwt-auth.guard";
import type { AuthenticatedUser } from "../common/auth/types";
import { CreateCourtDto } from "./dto/create-court.dto";
import { CreateVenueDto } from "./dto/create-venue.dto";
import { UpdateCourtDto } from "./dto/update-court.dto";
import { UpdateVenueDto } from "./dto/update-venue.dto";
import { VenuesService } from "./venues.service";

@ApiTags("venues")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller()
export class VenuesController {
  constructor(private readonly venuesService: VenuesService) {}

  @Get("venues")
  @ApiOperation({ summary: "List venues for a given personal or club owner" })
  listVenues(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Query("ownerType") ownerType: OwnerType,
    @Query("ownerId") ownerId: string
  ) {
    return this.venuesService.listVenues(currentUser.userId, ownerType, ownerId);
  }

  @Post("venues")
  @ApiOperation({ summary: "Create a venue for a given personal or club owner" })
  createVenue(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Body() dto: CreateVenueDto
  ) {
    return this.venuesService.createVenue(currentUser.userId, dto);
  }

  @Put("venues/:venueId")
  @ApiOperation({ summary: "Update a venue" })
  updateVenue(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Param("venueId") venueId: string,
    @Body() dto: UpdateVenueDto
  ) {
    return this.venuesService.updateVenue(currentUser.userId, venueId, dto);
  }

  @Post("courts")
  @ApiOperation({ summary: "Create a venue court" })
  createCourt(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Body() dto: CreateCourtDto
  ) {
    return this.venuesService.createCourt(currentUser.userId, dto);
  }

  @Put("courts/:courtId")
  @ApiOperation({ summary: "Update a venue court" })
  updateCourt(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Param("courtId") courtId: string,
    @Body() dto: UpdateCourtDto
  ) {
    return this.venuesService.updateCourt(currentUser.userId, courtId, dto);
  }

  @Post("courts/:courtId/disable")
  @ApiOperation({ summary: "Disable a venue court" })
  disableCourt(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Param("courtId") courtId: string
  ) {
    return this.venuesService.disableCourt(currentUser.userId, courtId);
  }
}
