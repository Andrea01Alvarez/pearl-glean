import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';

import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { PromotionsService } from './promotions.service';
import { CreatePromotionDto } from './dto/create-promotion.dto';
import { UpdatePromotionDto } from './dto/update-promotion.dto';
import { Promotion } from './entities/promotion.entity';

@ApiTags('promotions')
@Controller('promotions')
export class PromotionsController {
  private readonly logger = new Logger(PromotionsController.name);

  constructor(private readonly promotionsService: PromotionsService) {}

  @Get()
  @ApiOperation({ summary: 'Obtener todas las promociones activas' })
  async findAll(): Promise<Promotion[]> {
    return this.promotionsService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener una promoción por ID con sus productos' })
  async findOne(@Param('id') id: string): Promise<Promotion> {
    const promotion = await this.promotionsService.findOne(id);
    if (!promotion) {
      throw new HttpException('Promoción no encontrada', HttpStatus.NOT_FOUND);
    }
    return promotion;
  }

  @Post()
  @ApiOperation({ summary: 'Crear una promoción (con productos opcionales)' })
  async create(@Body() dto: CreatePromotionDto): Promise<Promotion> {
    try {
      this.logger.debug(`Creando promoción: ${dto.name}`);
      return await this.promotionsService.create(dto);
    } catch (error) {
      const msg =
        error instanceof Error ? error.message : 'Error al crear la promoción';
      this.logger.error(`Error al crear promoción: ${msg}`);
      throw new HttpException(msg, HttpStatus.BAD_REQUEST);
    }
  }

  @Put(':id')
  @ApiOperation({ summary: 'Actualizar una promoción' })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdatePromotionDto,
  ): Promise<Promotion> {
    const promotion = await this.promotionsService.update(id, dto);
    if (!promotion) {
      throw new HttpException('Promoción no encontrada', HttpStatus.NOT_FOUND);
    }
    this.logger.debug(`Promoción actualizada: ${id}`);
    return promotion;
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Desactivar una promoción (soft delete)' })
  async delete(@Param('id') id: string): Promise<{ message: string }> {
    const success = await this.promotionsService.delete(id);
    if (!success) {
      throw new HttpException('Promoción no encontrada', HttpStatus.NOT_FOUND);
    }
    this.logger.debug(`Promoción desactivada: ${id}`);
    return { message: 'Promoción desactivada exitosamente' };
  }

  @Post(':id/products')
  @ApiOperation({ summary: 'Agregar productos a una promoción' })
  async addProducts(
    @Param('id') id: string,
    @Body() body: { productIds: string[] },
  ): Promise<Promotion> {
    const promotion = await this.promotionsService.addProducts(id, body.productIds);
    if (!promotion) {
      throw new HttpException('Promoción no encontrada', HttpStatus.NOT_FOUND);
    }
    this.logger.debug(`Productos agregados a promoción ${id}`);
    return promotion;
  }

  @Delete(':id/products')
  @ApiOperation({ summary: 'Remover productos de una promoción' })
  async removeProducts(
    @Param('id') id: string,
    @Body() body: { productIds: string[] },
  ): Promise<Promotion> {
    const promotion = await this.promotionsService.removeProducts(id, body.productIds);
    if (!promotion) {
      throw new HttpException('Promoción no encontrada', HttpStatus.NOT_FOUND);
    }
    this.logger.debug(`Productos removidos de promoción ${id}`);
    return promotion;
  }
}
