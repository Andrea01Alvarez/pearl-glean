import {
  IsArray,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ProductCategory } from '../entities/product.entity';

export class CreateProductDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsEnum(ProductCategory)
  category: ProductCategory;

  @Type(() => Number)
  @IsNumber()
  @Min(0.01)
  price: number;

  @IsString()
  @IsNotEmpty()
  description: string;

  @IsString()
  @IsOptional()
  imageUrl?: string;

  @IsString()
  @IsOptional()
  imagePublicId?: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  additionalImages?: string[];

  @IsString()
  @IsOptional()
  altText?: string;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  @IsOptional()
  stock?: number;

  @IsString()
  @IsOptional()
  material?: string;

  @IsString()
  @IsOptional()
  dimensions?: string;
}
