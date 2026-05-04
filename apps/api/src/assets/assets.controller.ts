import { Controller, Inject, Post, Req, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiConsumes, ApiOperation, ApiTags } from "@nestjs/swagger";
import { JwtAuthGuard } from "../common/auth/jwt-auth.guard";
import { AssetsService } from "./assets.service";

@ApiTags("assets")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller("assets")
export class AssetsController {
  constructor(@Inject(AssetsService) private readonly assetsService: AssetsService) {}

  @Post("images")
  @ApiOperation({ summary: "Upload an image asset" })
  @ApiConsumes("multipart/form-data")
  uploadImage(@Req() request: { file: () => Promise<unknown> }) {
    return this.assetsService.uploadImage(request as never);
  }
}
