import { ApiProperty } from "@nestjs/swagger";
import { IsString, Matches } from "class-validator";

export class UpdatePhoneNumberDto {
  @ApiProperty({
    example: "13800138000"
  })
  @IsString()
  @Matches(/^1[3-9]\d{9}$/, {
    message: "手机号格式不正确"
  })
  phoneNumber!: string;
}
