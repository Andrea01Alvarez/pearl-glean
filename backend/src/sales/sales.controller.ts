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
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { AuthGuard } from '../auth/auth.guard';
import { SalesService } from './sales.service';
import { CreateSaleDto } from './dto/create-sale.dto';
import { UpdateSaleDto } from './dto/update-sale.dto';

@ApiTags('sales')
@Controller('sales')
@UseGuards(AuthGuard)
export class SalesController {
  private readonly logger = new Logger(SalesController.name);

  constructor(private readonly salesService: SalesService) {}

  @Get()
  @ApiOperation({ summary: 'Obtener todas las ventas' })
  async findAll() {
    return this.salesService.findAll();
  }

  @Get('count')
  @ApiOperation({ summary: 'Obtener total de ventas' })
  async count() {
    const total = await this.salesService.countAll();
    return { total };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener una venta por ID' })
  async findOne(@Param('id') id: string) {
    const sale = await this.salesService.findOne(id);
    if (!sale) {
      throw new HttpException('Venta no encontrada.', HttpStatus.NOT_FOUND);
    }
    return sale;
  }

  @Post()
  @ApiOperation({ summary: 'Registrar una nueva venta' })
  async create(@Body() dto: CreateSaleDto) {
    try {
      this.logger.debug(`Registrando venta: ${dto.productName} x${dto.quantity}`);
      return await this.salesService.create(dto);
    } catch (error) {
      if (
        error instanceof HttpException ||
        error.status === 400 ||
        error.status === 404
      ) {
        throw error;
      }
      this.logger.error('Error al registrar venta', error);
      throw new HttpException(
        'No se pudo registrar la venta. Verifica los datos e intenta de nuevo.',
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  @Put(':id')
  @ApiOperation({ summary: 'Actualizar una venta' })
  async update(@Param('id') id: string, @Body() dto: UpdateSaleDto) {
    try {
      return await this.salesService.update(id, dto);
    } catch (error) {
      if (
        error instanceof HttpException ||
        error.status === 400 ||
        error.status === 404
      ) {
        throw error;
      }
      this.logger.error('Error al actualizar venta', error);
      throw new HttpException(
        'No se pudo actualizar la venta.',
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Eliminar una venta (devuelve stock)' })
  async delete(@Param('id') id: string) {
    const success = await this.salesService.delete(id);
    if (!success) {
      throw new HttpException(
        'La venta que intentas eliminar no existe.',
        HttpStatus.NOT_FOUND,
      );
    }
    this.logger.debug(`Venta eliminada: ${id}`);
    return { message: 'Venta eliminada exitosamente. Stock devuelto al producto.' };
  }
}
