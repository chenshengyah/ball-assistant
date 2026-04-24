import { Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { JwtModule } from "@nestjs/jwt";
import { JwtAuthGuard } from "../common/auth/jwt-auth.guard";
import { PrismaModule } from "../prisma/prisma.module";
import { ClubsController } from "./clubs.controller";
import { ClubsService } from "./clubs.service";

@Module({
  imports: [
    ConfigModule,
    PrismaModule,
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
  controllers: [ClubsController],
  providers: [ClubsService, JwtAuthGuard],
  exports: [ClubsService]
})
export class ClubsModule {}
