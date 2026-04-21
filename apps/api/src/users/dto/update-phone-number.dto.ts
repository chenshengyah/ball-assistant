import { ApiProperty } from "@nestjs/swagger";
import { IsString, MinLength } from "class-validator";

export class UpdatePhoneNumberDto {
  @ApiProperty({
    example: "1af3d52c9b7e2d4f90"
  })
  @IsString()
  @MinLength(1)
  code!: string;
}
