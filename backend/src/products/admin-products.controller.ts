import {
  Controller,
  Get,
  Put,
  Delete,
  Param,
  UseGuards,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { AuthGuard } from '../auth/auth.guard';
import { ProductsService } from './products.service';
import { CloudinaryService } from './cloudinary.service';
import { Product } from './entities/product.entity';

@ApiTags('admin/products')
@Controller('admin/products')
@UseGuards(AuthGuard)
export class AdminProductsController {
  private readonly logger = new Logger(AdminProductsController.name);

  constructor(
    private readonly productsService: ProductsService,
    private readonly cloudinaryService: CloudinaryService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Obtener todos los productos (activos e inactivos)' })
  async findAll(): Promise<Product[]> {
    try {
      return await this.productsService.findAllAdmin();
    } catch (error) {
      this.logger.error('Error al obtener productos', error);
      throw new HttpException(
        'No se pudieron cargar los productos. Intenta de nuevo.',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Put(':id/reactivate')
  @ApiOperation({ summary: 'Reactivar un producto desactivado' })
  async reactivate(@Param('id') id: string): Promise<Product> {
    try {
      const result = await this.productsService.reactivate(id);
      if (result.error === 'not_found') {
        throw new HttpException(
          'El producto que intentas reactivar no existe.',
          HttpStatus.NOT_FOUND,
        );
      }
      if (result.error === 'no_stock') {
        throw new HttpException(
          'No se puede activar el producto porque el stock está en 0. Agrega stock primero.',
          HttpStatus.BAD_REQUEST,
        );
      }
      this.logger.debug(`Producto reactivado: ${result.product!.name}`);
      return result.product!;
    } catch (error) {
      if (error instanceof HttpException) throw error;
      this.logger.error('Error al reactivar producto', error);
      throw new HttpException(
        'No se pudo reactivar el producto. Intenta de nuevo.',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Delete(':id/main-image')
  @ApiOperation({ summary: 'Eliminar la imagen principal de un producto' })
  async removeMainImage(@Param('id') id: string): Promise<Product> {
    try {
      const product = await this.productsService.findOne(id);
      if (!product) {
        throw new HttpException('El producto no existe.', HttpStatus.NOT_FOUND);
      }

      if (!product.imageUrl) {
        throw new HttpException('El producto no tiene imagen principal.', HttpStatus.BAD_REQUEST);
      }

      // Eliminar de Cloudinary
      if (product.imagePublicId) {
        await this.cloudinaryService.deleteImage(product.imagePublicId);
      }

      const updated = await this.productsService.removeMainImage(id);
      this.logger.debug(`Imagen principal eliminada del producto: ${product.name}`);
      return updated!;
    } catch (error) {
      if (error instanceof HttpException) throw error;
      this.logger.error('Error al eliminar imagen principal', error);
      throw new HttpException(
        'No se pudo eliminar la imagen principal. Intenta de nuevo.',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Delete(':id/images/:index')
  @ApiOperation({ summary: 'Eliminar una imagen adicional de un producto' })
  async removeImage(
    @Param('id') id: string,
    @Param('index') index: string,
  ): Promise<Product> {
    const imageIndex = parseInt(index, 10);
    if (isNaN(imageIndex) || imageIndex < 0) {
      throw new HttpException(
        'Índice de imagen no válido.',
        HttpStatus.BAD_REQUEST,
      );
    }

    try {
      const product = await this.productsService.findOne(id);
      if (!product) {
        throw new HttpException(
          'El producto no existe.',
          HttpStatus.NOT_FOUND,
        );
      }

      if (!product.additionalImages || imageIndex >= product.additionalImages.length) {
        throw new HttpException(
          'La imagen que intentas eliminar no existe.',
          HttpStatus.NOT_FOUND,
        );
      }

      // Intentar eliminar de Cloudinary si es una URL de Cloudinary
      const imageUrl = product.additionalImages[imageIndex];
      const publicIdMatch = imageUrl.match(/upload\/(?:v\d+\/)?(.+)\.\w+$/);
      if (publicIdMatch) {
        await this.cloudinaryService.deleteImage(publicIdMatch[1]);
      }

      const updated = await this.productsService.removeAdditionalImage(id, imageIndex);
      this.logger.debug(`Imagen eliminada del producto: ${product.name}`);
      return updated!;
    } catch (error) {
      if (error instanceof HttpException) throw error;
      this.logger.error('Error al eliminar imagen', error);
      throw new HttpException(
        'No se pudo eliminar la imagen. Intenta de nuevo.',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
