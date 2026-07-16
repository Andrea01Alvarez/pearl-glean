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
} from '@nestjs/common';

import { ProductsService } from './products.service';

import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { Product } from './entities/product.entity';
import { imageFileFilter, imageStorage } from './multer.config';
import { FileInterceptor } from '@nestjs/platform-express';

@Controller('products')
export class ProductsController {
  private readonly logger = new Logger(ProductsController.name);

  constructor(private readonly productsService: ProductsService) {}

  @Get()
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
  async findOne(@Param('id') id: string): Promise<Product> {
    const product = await this.productsService.findOne(id);
    if (!product) {
      throw new HttpException('Producto no encontrado', HttpStatus.NOT_FOUND);
    }
    return product;
  }

  @Post()
  @UseInterceptors(
    FileInterceptor('image', {
      storage: imageStorage,
      fileFilter: imageFileFilter,
    }),
  )
  async create(
    @Body() createProductDto: CreateProductDto,
    @UploadedFile() file?: Express.Multer.File,
  ): Promise<Product> {
    try {
      if (file) {
        createProductDto.imageUrl = `/uploads/${file.filename}`;
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
  async update(
    @Param('id') id: string,
    @Body() updateProductDto: UpdateProductDto,
  ): Promise<Product> {
    try {
      const product = await this.productsService.update(id, updateProductDto);
      if (!product) {
        throw new HttpException('Producto no encontrado', HttpStatus.NOT_FOUND);
      }
      this.logger.debug(`Producto actualizado: ${id}`);
      return product;
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
  async delete(@Param('id') id: string): Promise<{ message: string }> {
    const success = await this.productsService.delete(id);
    if (!success) {
      throw new HttpException('Producto no encontrado', HttpStatus.NOT_FOUND);
    }
    this.logger.debug(`Producto eliminado: ${id}`);
    return { message: 'Producto eliminado exitosamente' };
  }

  @Post(':id/image')
  @UseInterceptors(
    FileInterceptor('image', {
      storage: imageStorage,
      fileFilter: imageFileFilter,
    }),
  )
  async uploadImage(
    @Param('id') id: string,
    @UploadedFile(
      new ParseFilePipe({
        validators: [new MaxFileSizeValidator({ maxSize: 5 * 1024 * 1024 })],
      }),
    )
    file: Express.Multer.File,
  ): Promise<Product> {
    const product = await this.productsService.findOne(id);
    if (!product) {
      throw new HttpException('Producto no encontrado', HttpStatus.NOT_FOUND);
    }

    const imageUrl = `/uploads/${file.filename}`;
    const updated = await this.productsService.update(id, { imageUrl });
    this.logger.debug(`Imagen subida para producto ${id}: ${imageUrl}`);
    return updated!;
  }
}
