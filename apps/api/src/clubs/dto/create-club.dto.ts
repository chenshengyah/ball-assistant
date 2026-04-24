import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { ClubCategory } from "@prisma/client";
import { IsEnum, IsNumber, IsOptional, IsString, Matches, MaxLength, MinLength } from "class-validator";

export class CreateClubDto {
  @ApiProperty({ example: "企鹅羽球俱乐部" })
  @IsString()
  @MinLength(2)
  @MaxLength(30)
  name!: string;

  @ApiProperty({ enum: ClubCategory, default: ClubCategory.BADMINTON })
  @IsEnum(ClubCategory)
  category!: ClubCategory;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  coverUrl?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  logoUrl?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

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

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  address?: string;

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
  wechatId?: string;

  @ApiProperty({ example: "阿鹏" })
  @IsString()
  @MinLength(1)
  @MaxLength(20)
  contactName!: string;

  @ApiProperty({ example: "13912345678" })
  @Matches(/^1\d{10}$/)
  contactPhone!: string;
}
