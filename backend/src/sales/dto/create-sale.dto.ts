import {
  IsBoolean,
  IsDateString,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateSaleDto {
  @IsUUID()
  @IsNotEmpty()
  productId: string;

  @IsString()
  @IsNotEmpty()
  productName: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  quantity: number;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  unitPrice: number;

  @IsBoolean()
  @IsOptional()
  hasDiscount?: boolean;

  @IsString()
  @IsOptional()
  discountType?: string;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(100)
  @IsOptional()
  discountPercentage?: number;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  subtotal: number;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  total: number;

  @IsDateString()
  @IsNotEmpty()
  saleDate: string;
}
