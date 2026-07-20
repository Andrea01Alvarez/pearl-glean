import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  Query,
  HttpException,
  HttpStatus,
  Logger,
  UseInterceptors,
  UploadedFile,
  ParseFilePipe,
  MaxFileSizeValidator,
  FileTypeValidator,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';

import { ApiTags, ApiOperation, ApiConsumes } from '@nestjs/swagger';
import { ProductsService } from './products.service';
import { CloudinaryService } from './cloudinary.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { Product } from './entities/product.entity';

const imageUploadOptions = {
  storage: memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
};

@ApiTags('products')
@Controller('products')
export class ProductsController {
  private readonly logger = new Logger(ProductsController.name);

  constructor(
    private readonly productsService: ProductsService,
    private readonly cloudinaryService: CloudinaryService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Obtener todos los productos (filtrar por categoría opcional)' })
  async findAll(@Query('category') category?: string): Promise<Product[]> {
    try {
      if (category) {
        this.logger.debug(`Filtrando por categoría: ${category}`);
        return await this.productsService.findByCategory(category);
      }
      return await this.productsService.findAll();
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Error desconocido';
      this.logger.error(`Error al obtener productos: ${msg}`);
      throw new HttpException(
        'Error al obtener los productos',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener un producto por ID' })
  async findOne(@Param('id') id: string): Promise<Product> {
    const product = await this.productsService.findOne(id);
    if (!product) {
      throw new HttpException('Producto no encontrado', HttpStatus.NOT_FOUND);
    }
    return product;
  }

  @Post()
  @ApiOperation({ summary: 'Crear un producto (con imagen opcional)' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('image', imageUploadOptions))
  async create(
    @Body() createProductDto: CreateProductDto,
    @UploadedFile() file?: Express.Multer.File,
  ): Promise<Product> {
    try {
      if (file) {
        const uploaded = await this.cloudinaryService.uploadImage(file, createProductDto.category);
        createProductDto.imageUrl = uploaded.url;
        createProductDto.imagePublicId = uploaded.publicId;
      }
      this.logger.debug(`Creando nuevo producto: ${createProductDto.name}`);
      return await this.productsService.create(createProductDto);
    } catch (error) {
      const msg =
        error instanceof Error ? error.message : 'Error al crear el producto';
      this.logger.error(`Error al crear producto: ${msg}`);
      throw new HttpException(msg, HttpStatus.BAD_REQUEST);
    }
  }

  @Put(':id')
  @ApiOperation({ summary: 'Actualizar un producto (con imagen opcional)' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('image', imageUploadOptions))
  async update(
    @Param('id') id: string,
    @Body() updateProductDto: UpdateProductDto,
    @UploadedFile() file?: Express.Multer.File,
  ): Promise<Product> {
    try {
      const existing = await this.productsService.findOne(id);
      if (!existing) {
        throw new HttpException('Producto no encontrado', HttpStatus.NOT_FOUND);
      }

      if (file) {
        // Subir nueva imagen a Cloudinary (usar categoría actual o la nueva si se está cambiando)
        const category = updateProductDto.category || existing.category;
        const uploaded = await this.cloudinaryService.uploadImage(file, category);
        updateProductDto.imageUrl = uploaded.url;
        updateProductDto.imagePublicId = uploaded.publicId;

        // Eliminar imagen anterior de Cloudinary si existía
        if (existing.imagePublicId) {
          await this.cloudinaryService.deleteImage(existing.imagePublicId);
        }
      }

      const product = await this.productsService.update(id, updateProductDto);
      this.logger.debug(`Producto actualizado: ${id}`);
      return product!;
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      const msg =
        error instanceof Error
          ? error.message
          : 'Error al actualizar el producto';
      this.logger.error(`Error al actualizar producto ${id}: ${msg}`);
      throw new HttpException(msg, HttpStatus.BAD_REQUEST);
    }
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Desactivar un producto (soft delete)' })
  async delete(@Param('id') id: string): Promise<{ message: string }> {
    const success = await this.productsService.delete(id);
    if (!success) {
      throw new HttpException('Producto no encontrado', HttpStatus.NOT_FOUND);
    }
    this.logger.debug(`Producto desactivado: ${id}`);
    return { message: 'Producto desactivado exitosamente' };
  }

  @Post(':id/image')
  @ApiOperation({ summary: 'Subir o reemplazar la imagen de un producto' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('image', imageUploadOptions))
  async uploadImage(
    @Param('id') id: string,
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: 5 * 1024 * 1024 }),
          new FileTypeValidator({ fileType: /^image\/(jpeg|png|gif|webp|svg\+xml)$/ }),
        ],
      }),
    )
    file: Express.Multer.File,
  ): Promise<Product> {
    const product = await this.productsService.findOne(id);
    if (!product) {
      throw new HttpException('Producto no encontrado', HttpStatus.NOT_FOUND);
    }

    // Subir nueva imagen a la carpeta de su categoría
    const uploaded = await this.cloudinaryService.uploadImage(file, product.category);

    // Eliminar imagen anterior si existía
    if (product.imagePublicId) {
      await this.cloudinaryService.deleteImage(product.imagePublicId);
    }

    const updated = await this.productsService.update(id, {
      imageUrl: uploaded.url,
      imagePublicId: uploaded.publicId,
    });
    this.logger.debug(`Imagen subida para producto ${id}: ${uploaded.url}`);
    return updated!;
  }
}
