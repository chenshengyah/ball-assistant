import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { ActivitiesModule } from "./activities/activities.module";
import { ActivityCreateModule } from "./activity-create/activity-create.module";
import { AssetsModule } from "./assets/assets.module";
import { AuthModule } from "./auth/auth.module";
import { ClubsModule } from "./clubs/clubs.module";
import { HealthModule } from "./health/health.module";
import { PrismaModule } from "./prisma/prisma.module";
import { PublishIdentitiesModule } from "./publish-identities/publish-identities.module";
import { UsersModule } from "./users/users.module";
import { VenuesModule } from "./venues/venues.module";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: [".env.local", ".env"]
    }),
    PrismaModule,
    HealthModule,
    AuthModule,
    UsersModule,
    AssetsModule,
    ClubsModule,
    PublishIdentitiesModule,
    ActivityCreateModule,
    VenuesModule,
    ActivitiesModule
  ]
})
export class AppModule {}
