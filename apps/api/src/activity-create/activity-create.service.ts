import { Injectable } from "@nestjs/common";
import { ClubsService } from "../clubs/clubs.service";
import { UsersService } from "../users/users.service";

@Injectable()
export class ActivityCreateService {
  constructor(
    private readonly usersService: UsersService,
    private readonly clubsService: ClubsService
  ) {}

  async getContext(userId: string) {
    const userProfile = await this.usersService.getProfileById(userId);
    const clubs = await this.clubsService.listOwnedClubs(userId);
    const selectedClub = clubs[0];
    const clubStatus = selectedClub ? this.clubsService.getClubStatus(selectedClub) : "NO_CLUB";
    const personalStatus = !userProfile.baseProfileComplete
      ? "NEEDS_PROFILE"
      : !userProfile.contactProfileComplete
        ? "NEEDS_PHONE"
        : "READY";

    return {
      defaultOwnerType: personalStatus === "READY" ? "PERSONAL" : clubs.length > 0 ? "CLUB" : "PERSONAL",
      lastSelectedClubId: selectedClub?.id ?? "",
      personalCard: {
        status: personalStatus,
        label: "个人",
        nickname: userProfile.nickname,
        phoneMasked: userProfile.phoneNumber ? `${userProfile.phoneNumber.slice(0, 3)}****${userProfile.phoneNumber.slice(-4)}` : ""
      },
      clubCard: {
        status: clubStatus,
        selectedClubId: selectedClub?.id ?? "",
        selectedClubName: selectedClub?.name ?? "",
        availableClubs: clubs.map((club) => ({
          clubId: club.id,
          clubName: club.name,
          status: this.clubsService.getClubStatus(club),
          contactName: club.contactName ?? "",
          contactPhone: club.contactPhone ?? ""
        }))
      }
    };
  }
}
