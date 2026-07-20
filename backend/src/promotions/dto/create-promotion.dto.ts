import {
  IsArray,
  IsDateString,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { PromotionType } from '../entities/promotion.entity';

export class CreatePromotionDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsEnum(PromotionType)
  type: PromotionType;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(100)
  @IsOptional()
  discountPercentage?: number;

  @IsString()
  @IsOptional()
  label?: string;

  @IsDateString()
  @IsOptional()
  startDate?: string;

  @IsDateString()
  @IsOptional()
  endDate?: string;

  @IsArray()
  @IsUUID('4', { each: true })
  @IsOptional()
  productIds?: string[];
}
