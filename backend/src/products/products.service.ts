import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { unlink } from 'fs/promises';
import { join } from 'path';
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
    return this.productRepository.find({ where: { isActive: true } });
  }

  async findOne(id: string): Promise<Product | null> {
    return this.productRepository.findOne({ where: { id } });
  }

  async findByCategory(category: string): Promise<Product[]> {
    const normalized = category.trim().toLowerCase();
    return this.productRepository
      .createQueryBuilder('product')
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

    // Si se sube una imagen nueva y ya existía una, eliminar la anterior
    if (dto.imageUrl && product.imageUrl) {
      this.deleteImageFile(product.imageUrl);
    }

    Object.assign(product, dto);
    return this.productRepository.save(product);
  }

  async delete(id: string): Promise<boolean> {
    const product = await this.productRepository.findOne({ where: { id } });
    if (!product) {
      return false;
    }

    // Eliminar la imagen del disco si existe
    if (product.imageUrl) {
      this.deleteImageFile(product.imageUrl);
    }

    await this.productRepository.delete(id);
    return true;
  }

  private deleteImageFile(imageUrl: string): void {
    // imageUrl viene como "/uploads/product-xxx.jpg"
    const filePath = join(process.cwd(), imageUrl);
    unlink(filePath).catch(() => {
      // Si el archivo no existe, no pasa nada
    });
  }
}
