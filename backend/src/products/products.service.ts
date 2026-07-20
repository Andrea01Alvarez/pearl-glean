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
}
