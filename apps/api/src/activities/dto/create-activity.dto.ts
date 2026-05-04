import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { ChargeMode, OwnerType, SignupMode } from "@prisma/client";
import {
  ArrayMinSize,
  IsArray,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  Min,
  MinLength,
  ValidateIf,
  ValidateNested
} from "class-validator";
import { Type } from "class-transformer";

class CreateActivityCourtDto {
  @ApiProperty()
  @IsString()
  @MinLength(1)
  @MaxLength(30)
  courtName!: string;

  @ApiProperty()
  @IsInt()
  @Min(1)
  capacity!: number;

  @ApiProperty()
  @IsInt()
  @Min(1)
  sortOrder!: number;
}

export class CreateActivityDto {
  @ApiProperty({ enum: OwnerType })
  @IsEnum(OwnerType)
  ownerType!: OwnerType;

  @ApiProperty()
  @IsString()
  ownerId!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  coverUrl?: string;

  @ApiProperty()
  @IsString()
  @MinLength(1)
  @MaxLength(30)
  title!: string;

  @ApiProperty({ enum: ChargeMode })
  @IsEnum(ChargeMode)
  chargeMode!: ChargeMode;

  @ApiProperty()
  @IsInt()
  @Min(0)
  chargeAmountCents!: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  chargeDesc?: string;

  @ApiProperty()
  @IsString()
  @MinLength(1)
  @MaxLength(80)
  venueName!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(120)
  venueAddress?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  venueProvince?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  venueCity?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  venueDistrict?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  venueLatitude?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  venueLongitude?: number;

  @ApiProperty({ enum: SignupMode })
  @IsEnum(SignupMode)
  signupMode!: SignupMode;

  @ApiProperty()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  activityDate!: string;

  @ApiProperty()
  @Matches(/^\d{2}:\d{2}$/)
  startTime!: string;

  @ApiProperty()
  @Matches(/^\d{2}:\d{2}$/)
  endTime!: string;

  @ApiProperty()
  @IsInt()
  @Min(0)
  cancelCutoffMinutesBeforeStart!: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  descriptionRichtext?: string;

  @ApiPropertyOptional()
  @ValidateIf((value: CreateActivityDto) => value.signupMode === SignupMode.GENERAL)
  @IsInt()
  @Min(1)
  totalCapacity?: number;

  @ApiProperty({ type: [CreateActivityCourtDto] })
  @IsArray()
  @ValidateIf((value: CreateActivityDto) => value.signupMode === SignupMode.USER_SELECT_COURT)
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CreateActivityCourtDto)
  courts!: CreateActivityCourtDto[];
}
