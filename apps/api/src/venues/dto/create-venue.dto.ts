import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { OwnerType } from "@prisma/client";
import { IsEnum, IsNumber, IsOptional, IsString, MinLength } from "class-validator";

export class CreateVenueDto {
  @ApiProperty({ enum: OwnerType })
  @IsEnum(OwnerType)
  ownerType!: OwnerType;

  @ApiProperty()
  @IsString()
  ownerId!: string;

  @ApiProperty()
  @IsString()
  @MinLength(1)
  name!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  shortName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  province?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  city?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  district?: string;

  @ApiProperty()
  @IsString()
  @MinLength(1)
  address!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  latitude?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  longitude?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  navigationName?: string;
}
