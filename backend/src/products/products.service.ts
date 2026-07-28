import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Product } from './entities/product.entity';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';

@Injectable()
export class ProductsService {
  constructor(
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
  ) {}

  async findAll(): Promise<Product[]> {
    return this.productRepository.find({
      where: { isActive: true },
      relations: { promotions: true },
    });
  }

  async findAllAdmin(): Promise<Product[]> {
    return this.productRepository.find({
      relations: { promotions: true },
      order: { isActive: 'DESC', name: 'ASC' },
    });
  }

  async findOne(id: string): Promise<Product | null> {
    return this.productRepository.findOne({
      where: { id },
      relations: { promotions: true },
    });
  }

  async findByCategory(category: string): Promise<Product[]> {
    const normalized = category.trim().toLowerCase();
    return this.productRepository
      .createQueryBuilder('product')
      .leftJoinAndSelect('product.promotions', 'promotion', 'promotion.isActive = :promoActive', { promoActive: true })
      .where('LOWER(product.category) = :category', { category: normalized })
      .andWhere('product.isActive = :isActive', { isActive: true })
      .getMany();
  }

  async create(dto: CreateProductDto): Promise<Product> {
    const product = this.productRepository.create({
      ...dto,
      isActive: true,
    });
    return this.productRepository.save(product);
  }

  async update(id: string, dto: UpdateProductDto): Promise<Product | null> {
    const product = await this.productRepository.findOne({ where: { id } });
    if (!product) {
      return null;
    }

    Object.assign(product, dto);

    // Si el stock llega a 0, desactivar automáticamente
    if (product.stock !== null && product.stock !== undefined && Number(product.stock) <= 0) {
      product.isActive = false;
    }

    return this.productRepository.save(product);
  }

  async delete(id: string): Promise<boolean> {
    const product = await this.productRepository.findOne({ where: { id } });
    if (!product) {
      return false;
    }

    // Soft delete: marcar como inactivo en vez de borrar
    product.isActive = false;
    await this.productRepository.save(product);
    return true;
  }

  async removeMainImage(id: string): Promise<Product | null> {
    const product = await this.productRepository.findOne({ where: { id } });
    if (!product) {
      return null;
    }
    product.imageUrl = null as any;
    product.imagePublicId = null as any;
    return this.productRepository.save(product);
  }

  async reactivate(id: string): Promise<{ product?: Product; error?: string }> {
    const product = await this.productRepository.findOne({ where: { id } });
    if (!product) {
      return { error: 'not_found' };
    }
    if (product.stock !== null && product.stock !== undefined && Number(product.stock) <= 0) {
      return { error: 'no_stock' };
    }
    product.isActive = true;
    const saved = await this.productRepository.save(product);
    return { product: saved };
  }

  async removeAdditionalImage(id: string, imageIndex: number): Promise<Product | null> {
    const product = await this.productRepository.findOne({ where: { id } });
    if (!product) {
      return null;
    }
    if (!product.additionalImages || imageIndex < 0 || imageIndex >= product.additionalImages.length) {
      return null;
    }
    product.additionalImages.splice(imageIndex, 1);
    return this.productRepository.save(product);
  }
}
