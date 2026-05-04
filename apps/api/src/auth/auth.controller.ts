import { Body, Controller, Inject, Post } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { AuthService } from "./auth.service";
import { WechatLoginDto } from "./dto/wechat-login.dto";

@ApiTags("auth")
@Controller("auth")
export class AuthController {
  constructor(@Inject(AuthService) private readonly authService: AuthService) {}

  @Post("wechat/login")
  @ApiOperation({ summary: "Exchange a miniapp login code for an access token" })
  login(@Body() dto: WechatLoginDto) {
    return this.authService.loginWithWechatCode(dto.code);
  }
}
