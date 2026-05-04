import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsOptional, IsString } from "class-validator";

export class CreateSignupDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  activityCourtId?: string;
}
