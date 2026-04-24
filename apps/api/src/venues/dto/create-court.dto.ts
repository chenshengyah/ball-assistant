import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsInt, IsOptional, IsString, Min, MinLength } from "class-validator";

export class CreateCourtDto {
  @ApiProperty()
  @IsString()
  venueId!: string;

  @ApiProperty()
  @IsString()
  @MinLength(1)
  courtCode!: string;

  @ApiProperty()
  @IsString()
  @MinLength(1)
  courtName!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(1)
  defaultCapacity?: number;
}
