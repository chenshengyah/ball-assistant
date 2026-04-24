import { Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { JwtModule } from "@nestjs/jwt";
import { ClubsModule } from "../clubs/clubs.module";
import { JwtAuthGuard } from "../common/auth/jwt-auth.guard";
import { UsersModule } from "../users/users.module";
import { ActivityCreateController } from "./activity-create.controller";
import { ActivityCreateService } from "./activity-create.service";

@Module({
  imports: [
    ConfigModule,
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
  controllers: [ActivityCreateController],
  providers: [ActivityCreateService, JwtAuthGuard]
})
export class ActivityCreateModule {}
