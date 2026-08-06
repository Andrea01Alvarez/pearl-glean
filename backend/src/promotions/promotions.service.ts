import { Injectable, Logger, BadRequestException } from '@nestjs/common';
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

  /**
   * Quita los productos dados de cualquier otra promoción activa.
   * Se usa al crear/editar para garantizar que un producto solo tenga una promo activa.
   */
  private async liberarProductosDeOtrasPromos(
    productIds: string[],
    excludePromoId: string | null,
  ): Promise<void> {
    if (!productIds || productIds.length === 0) return;

    const otrasPromos = await this.promotionRepository.find({
      where: { isActive: true },
      relations: { products: true },
    });

    const idSet = new Set(productIds);

    for (const promo of otrasPromos) {
      if (excludePromoId && promo.id === excludePromoId) continue;
      const antes = promo.products.length;
      promo.products = promo.products.filter((p) => !idSet.has(p.id));
      if (promo.products.length !== antes) {
        await this.promotionRepository.save(promo);
        this.logger.log(
          `Producto(s) trasladados a nueva promoción. Promo afectada: "${promo.name}"`,
        );
      }
    }
  }

  private validateDateRange(startDate?: string, endDate?: string): void {
    if (startDate && endDate && new Date(endDate) < new Date(startDate)) {
      throw new BadRequestException('La fecha de fin no puede ser anterior a la fecha de inicio.');
    }
  }

  async create(dto: CreatePromotionDto): Promise<Promotion> {
    this.validateDateRange(dto.startDate, dto.endDate);
    const { productIds, ...data } = dto;

    const promotion = this.promotionRepository.create({
      ...data,
      isActive: true,
    });

    if (productIds && productIds.length > 0) {
      // Quitar estos productos de cualquier otra promo activa antes de asignarlos
      await this.liberarProductosDeOtrasPromos(productIds, null);
      promotion.products = await this.productRepository.findBy({
        id: In(productIds),
      });
    }

    return this.promotionRepository.save(promotion);
  }

  async update(id: string, dto: UpdatePromotionDto): Promise<Promotion | null> {
    this.validateDateRange(dto.startDate, dto.endDate);

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
      if (productIds.length > 0) {
        // Quitar estos productos de otras promos activas (no de la actual)
        await this.liberarProductosDeOtrasPromos(productIds, id);
        promotion.products = await this.productRepository.findBy({ id: In(productIds) });
      } else {
        promotion.products = [];
      }
    }

    return this.promotionRepository.save(promotion);
  }

  async delete(id: string): Promise<boolean> {
    // Cargar con relaciones para limpiar el junction table
    const promotion = await this.promotionRepository.findOne({
      where: { id },
      relations: { products: true },
    });
    if (!promotion) {
      return false;
    }

    promotion.isActive = false;
    promotion.products = []; // Libera los productos del junction table
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

    // Quitar estos productos de otras promos antes de agregarlos aquí
    await this.liberarProductosDeOtrasPromos(productIds, id);

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
