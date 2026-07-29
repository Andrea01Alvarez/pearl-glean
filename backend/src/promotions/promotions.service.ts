import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, LessThan, Repository } from 'typeorm';
import { Promotion } from './entities/promotion.entity';
import { Product } from '../products/entities/product.entity';
import { CreatePromotionDto } from './dto/create-promotion.dto';
import { UpdatePromotionDto } from './dto/update-promotion.dto';

@Injectable()
export class PromotionsService {
  private readonly logger = new Logger(PromotionsService.name);

  constructor(
    @InjectRepository(Promotion)
    private readonly promotionRepository: Repository<Promotion>,
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
  ) {}

  /**
   * Desactiva promociones cuya fecha fin ya pasó y les quita los productos asignados.
   * Se ejecuta automáticamente al consultar promociones.
   */
  async expirePromotions(): Promise<void> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const expired = await this.promotionRepository.find({
      where: {
        isActive: true,
        endDate: LessThan(today),
      },
      relations: { products: true },
    });

    for (const promo of expired) {
      promo.isActive = false;
      promo.products = [];
      await this.promotionRepository.save(promo);
      this.logger.log(
        `Promoción expirada: "${promo.name}" (fin: ${promo.endDate}). Productos liberados.`,
      );
    }
  }

  async findAll(): Promise<Promotion[]> {
    await this.expirePromotions();
    return this.promotionRepository.find({
      relations: { products: true },
      where: { isActive: true },
    });
  }

  async findAllAdmin(): Promise<Promotion[]> {
    await this.expirePromotions();
    return this.promotionRepository.find({
      relations: { products: true },
      order: { isActive: 'DESC' },
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
