import { Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { JwtModule } from "@nestjs/jwt";
import { ClubsModule } from "../clubs/clubs.module";
import { JwtAuthGuard } from "../common/auth/jwt-auth.guard";
import { PublishIdentitiesController } from "./publish-identities.controller";
import { PublishIdentitiesService } from "./publish-identities.service";

@Module({
  imports: [
    ConfigModule,
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
  controllers: [PublishIdentitiesController],
  providers: [PublishIdentitiesService, JwtAuthGuard]
})
export class PublishIdentitiesModule {}
