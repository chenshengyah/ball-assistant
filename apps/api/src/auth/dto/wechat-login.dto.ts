import { ApiProperty } from "@nestjs/swagger";
import { IsString, MinLength } from "class-validator";

export class WechatLoginDto {
  @ApiProperty({
    example: "wx-login-code"
  })
  @IsString()
  @MinLength(1)
  code!: string;
}
