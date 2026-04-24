import { Injectable } from "@nestjs/common";
import { ClubsService } from "../clubs/clubs.service";

@Injectable()
export class PublishIdentitiesService {
  constructor(private readonly clubsService: ClubsService) {}

  async listIdentities(userId: string) {
    const clubs = await this.clubsService.listOwnedClubs(userId);

    return [
      {
        identityId: `identity_personal_${userId}`,
        identityType: "PERSONAL",
        identityName: "个人",
        isDefault: true,
        status: "ACTIVE"
      },
      ...clubs.map((club) => ({
        identityId: `identity_club_${club.id}`,
        identityType: "CLUB",
        identityName: club.name,
        clubId: club.id,
        isDefault: false,
        status: "ACTIVE"
      }))
    ];
  }
}
