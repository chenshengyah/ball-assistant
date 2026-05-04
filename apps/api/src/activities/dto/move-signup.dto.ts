import { ApiProperty } from "@nestjs/swagger";
import { IsString, MinLength } from "class-validator";

export class MoveSignupDto {
  @ApiProperty()
  @IsString()
  @MinLength(1)
  activityCourtId!: string;
}
