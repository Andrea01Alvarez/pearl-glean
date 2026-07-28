import { Controller, Post, Body, UseGuards, Req } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { AuthGuard } from './auth.guard';
import { LoginDto } from './dto/login.dto';
import { Request } from 'express';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('login')
  @ApiOperation({ summary: 'Iniciar sesión como administrador' })
  @ApiResponse({ status: 200, description: 'Login exitoso, devuelve token' })
  @ApiResponse({ status: 401, description: 'Credenciales incorrectas' })
  login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto.username, loginDto.password);
  }

  @Post('logout')
  @UseGuards(AuthGuard)
  @ApiOperation({ summary: 'Cerrar sesión' })
  @ApiResponse({ status: 200, description: 'Sesión cerrada' })
  logout(@Req() req: Request) {
    const token = req.headers['authorization']!.substring(7);
    this.authService.logout(token);
    return { message: 'Sesión cerrada exitosamente' };
  }
}
