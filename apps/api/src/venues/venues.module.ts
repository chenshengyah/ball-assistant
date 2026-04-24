import { Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { JwtModule } from "@nestjs/jwt";
import { ClubsModule } from "../clubs/clubs.module";
import { JwtAuthGuard } from "../common/auth/jwt-auth.guard";
import { PrismaModule } from "../prisma/prisma.module";
import { VenuesController } from "./venues.controller";
import { VenuesService } from "./venues.service";

@Module({
  imports: [
    ConfigModule,
    PrismaModule,
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
  controllers: [VenuesController],
  providers: [VenuesService, JwtAuthGuard],
  exports: [VenuesService]
})
export class VenuesModule {}
