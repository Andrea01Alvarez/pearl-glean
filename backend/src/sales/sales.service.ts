import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Sale } from './entities/sale.entity';
import { Product } from '../products/entities/product.entity';
import { CreateSaleDto } from './dto/create-sale.dto';
import { UpdateSaleDto } from './dto/update-sale.dto';

@Injectable()
export class SalesService {
  constructor(
    @InjectRepository(Sale)
    private readonly saleRepository: Repository<Sale>,
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
  ) {}

  async findAll(): Promise<Sale[]> {
    return this.saleRepository.find({
      relations: { product: true },
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(id: string): Promise<Sale | null> {
    return this.saleRepository.findOne({
      where: { id },
      relations: { product: true },
    });
  }

  async create(dto: CreateSaleDto): Promise<Sale> {
    // Verificar que el producto existe
    const product = await this.productRepository.findOne({
      where: { id: dto.productId },
    });

    if (!product) {
      throw new NotFoundException('El producto no existe.');
    }

    // Validar stock disponible
    const currentStock = product.stock ?? 0;
    if (dto.quantity > currentStock) {
      throw new BadRequestException(
        `Stock insuficiente. Solo hay ${currentStock} unidades disponibles de "${product.name}".`,
      );
    }

    // Crear la venta
    const sale = this.saleRepository.create(dto);
    const savedSale = await this.saleRepository.save(sale);

    // Descontar stock
    product.stock = currentStock - dto.quantity;

    // Si el stock llega a 0, desactivar el producto
    if (product.stock <= 0) {
      product.isActive = false;
    }

    await this.productRepository.save(product);

    return savedSale;
  }

  async update(id: string, dto: UpdateSaleDto): Promise<Sale> {
    const sale = await this.saleRepository.findOne({
      where: { id },
      relations: { product: true },
    });

    if (!sale) {
      throw new NotFoundException('La venta no existe.');
    }

    // Si cambia la cantidad, ajustar stock
    if (dto.quantity !== undefined && dto.quantity !== sale.quantity) {
      const product = await this.productRepository.findOne({
        where: { id: sale.productId },
      });

      if (product) {
        // Devolver stock anterior y restar nuevo
        const currentStock = (product.stock ?? 0) + sale.quantity;
        const newStock = currentStock - dto.quantity;

        if (newStock < 0) {
          throw new BadRequestException(
            `Stock insuficiente. Solo hay ${currentStock} unidades disponibles de "${product.name}".`,
          );
        }

        product.stock = newStock;
        product.isActive = newStock > 0;
        await this.productRepository.save(product);
      }
    }

    Object.assign(sale, dto);
    return this.saleRepository.save(sale);
  }

  async delete(id: string): Promise<boolean> {
    const sale = await this.saleRepository.findOne({
      where: { id },
    });

    if (!sale) {
      return false;
    }

    // Devolver stock al producto
    const product = await this.productRepository.findOne({
      where: { id: sale.productId },
    });

    if (product) {
      product.stock = (product.stock ?? 0) + sale.quantity;
      if (product.stock > 0) {
        product.isActive = true;
      }
      await this.productRepository.save(product);
    }

    await this.saleRepository.remove(sale);
    return true;
  }

  async countAll(): Promise<number> {
    return this.saleRepository.count();
  }
}
