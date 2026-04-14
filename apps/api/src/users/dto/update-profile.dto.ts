import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { UserGender } from "@prisma/client";
import { IsEnum, IsOptional, IsString, MaxLength, MinLength } from "class-validator";

export class UpdateProfileDto {
  @ApiProperty({
    example: "小陈"
  })
  @IsString()
  @MinLength(1)
  @MaxLength(20)
  nickname!: string;

  @ApiProperty({
    enum: UserGender
  })
  @IsEnum(UserGender)
  gender!: UserGender;

  @ApiPropertyOptional({
    example: "https://example.com/avatar.png"
  })
  @IsOptional()
  @IsString()
  avatarUrl?: string;
}
