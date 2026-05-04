import { Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { JwtModule } from "@nestjs/jwt";
import { ClubsModule } from "../clubs/clubs.module";
import { JwtAuthGuard } from "../common/auth/jwt-auth.guard";
import { OptionalJwtAuthGuard } from "../common/auth/optional-jwt-auth.guard";
import { PrismaModule } from "../prisma/prisma.module";
import { UsersModule } from "../users/users.module";
import { ActivitiesController } from "./activities.controller";
import { ActivitiesService } from "./activities.service";

@Module({
  imports: [
    ConfigModule,
    PrismaModule,
    UsersModule,
    ClubsModule,
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>("JWT_SECRET", "ball-assistant-dev-secret"),
        signOptions: {
          expiresIn: "7d"
        }
      })
    })
  ],
  controllers: [ActivitiesController],
  providers: [ActivitiesService, JwtAuthGuard, OptionalJwtAuthGuard]
})
export class ActivitiesModule {}
