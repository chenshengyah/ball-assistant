import { Body, Controller, Get, Inject, Post, Put, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { CurrentUser } from "../common/auth/current-user.decorator";
import { JwtAuthGuard } from "../common/auth/jwt-auth.guard";
import type { AuthenticatedUser } from "../common/auth/types";
import { UpdatePhoneNumberDto } from "./dto/update-phone-number.dto";
import { UpdateProfileDto } from "./dto/update-profile.dto";
import { UsersService } from "./users.service";

@ApiTags("users")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller("users")
export class UsersController {
  constructor(@Inject(UsersService) private readonly usersService: UsersService) {}

  @Get("me")
  @ApiOperation({ summary: "Get the current authenticated user profile" })
  getMe(@CurrentUser() currentUser: AuthenticatedUser) {
    return this.usersService.getProfileById(currentUser.userId);
  }

  @Put("me/profile")
  @ApiOperation({ summary: "Create or update the current user profile" })
  updateProfile(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Body() dto: UpdateProfileDto
  ) {
    return this.usersService.updateProfile(currentUser.userId, dto);
  }

  @Post("me/phone-number")
  @ApiOperation({ summary: "Save the current user contact phone number" })
  updatePhoneNumber(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Body() dto: UpdatePhoneNumberDto
  ) {
    return this.usersService.updatePhoneNumber(currentUser.userId, dto);
  }
}
