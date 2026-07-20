import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { Promotion } from './entities/promotion.entity';
import { Product } from '../products/entities/product.entity';
import { CreatePromotionDto } from './dto/create-promotion.dto';
import { UpdatePromotionDto } from './dto/update-promotion.dto';

@Injectable()
export class PromotionsService {
  constructor(
    @InjectRepository(Promotion)
    private readonly promotionRepository: Repository<Promotion>,
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
  ) {}

  async findAll(): Promise<Promotion[]> {
    return this.promotionRepository.find({
      relations: { products: true },
      where: { isActive: true },
    });
  }

  async findOne(id: string): Promise<Promotion | null> {
    return this.promotionRepository.findOne({
      where: { id },
      relations: { products: true },
    });
  }

  async create(dto: CreatePromotionDto): Promise<Promotion> {
    const { productIds, ...data } = dto;

    const promotion = this.promotionRepository.create({
      ...data,
      isActive: true,
    });

    if (productIds && productIds.length > 0) {
      promotion.products = await this.productRepository.findBy({
        id: In(productIds),
      });
    }

    return this.promotionRepository.save(promotion);
  }

  async update(id: string, dto: UpdatePromotionDto): Promise<Promotion | null> {
    const promotion = await this.promotionRepository.findOne({
      where: { id },
      relations: { products: true },
    });
    if (!promotion) {
      return null;
    }

    const { productIds, ...data } = dto;
    Object.assign(promotion, data);

    if (productIds !== undefined) {
      promotion.products =
        productIds.length > 0
          ? await this.productRepository.findBy({ id: In(productIds) })
          : [];
    }

    return this.promotionRepository.save(promotion);
  }

  async delete(id: string): Promise<boolean> {
    const promotion = await this.promotionRepository.findOne({
      where: { id },
    });
    if (!promotion) {
      return false;
    }

    promotion.isActive = false;
    await this.promotionRepository.save(promotion);
    return true;
  }

  async addProducts(id: string, productIds: string[]): Promise<Promotion | null> {
    const promotion = await this.promotionRepository.findOne({
      where: { id },
      relations: { products: true },
    });
    if (!promotion) {
      return null;
    }

    const newProducts = await this.productRepository.findBy({
      id: In(productIds),
    });

    const existingIds = new Set(promotion.products.map((p) => p.id));
    for (const product of newProducts) {
      if (!existingIds.has(product.id)) {
        promotion.products.push(product);
      }
    }

    return this.promotionRepository.save(promotion);
  }

  async removeProducts(id: string, productIds: string[]): Promise<Promotion | null> {
    const promotion = await this.promotionRepository.findOne({
      where: { id },
      relations: { products: true },
    });
    if (!promotion) {
      return null;
    }

    const removeSet = new Set(productIds);
    promotion.products = promotion.products.filter((p) => !removeSet.has(p.id));

    return this.promotionRepository.save(promotion);
  }
}
