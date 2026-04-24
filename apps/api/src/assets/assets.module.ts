import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { JwtModule } from "@nestjs/jwt";
import { ConfigService } from "@nestjs/config";
import { JwtAuthGuard } from "../common/auth/jwt-auth.guard";
import { AssetsController } from "./assets.controller";
import { AssetsService } from "./assets.service";

@Module({
  imports: [
    ConfigModule,
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
  controllers: [AssetsController],
  providers: [AssetsService, JwtAuthGuard]
})
export class AssetsModule {}
