import { ApiProperty } from "@nestjs/swagger";
import { IsInt, Min } from "class-validator";

export class UpdateCourtCapacityDto {
  @ApiProperty()
  @IsInt()
  @Min(1)
  capacity!: number;
}
