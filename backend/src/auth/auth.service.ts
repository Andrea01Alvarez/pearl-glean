import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'crypto';

// Tiempo de inactividad máximo: 30 minutos
const SESSION_TIMEOUT_MS = 30 * 60 * 1000;

@Injectable()
export class AuthService {
  // Guarda token → timestamp de última actividad
  private activeTokens = new Map<string, number>();

  constructor(private config: ConfigService) {}

  login(username: string, password: string): { token: string } {
    const adminUser = this.config.get<string>('ADMIN_USER');
    const adminPassword = this.config.get<string>('ADMIN_PASSWORD');

    if (username !== adminUser || password !== adminPassword) {
      throw new UnauthorizedException('Credenciales incorrectas');
    }

    const token = randomUUID();
    this.activeTokens.set(token, Date.now());
    return { token };
  }

  validateToken(token: string): boolean {
    const lastActivity = this.activeTokens.get(token);
    if (lastActivity === undefined) {
      return false;
    }

    // Si pasó más tiempo del permitido, expirar el token
    if (Date.now() - lastActivity > SESSION_TIMEOUT_MS) {
      this.activeTokens.delete(token);
      return false;
    }

    // Renovar el timestamp con cada petición válida
    this.activeTokens.set(token, Date.now());
    return true;
  }

  logout(token: string): void {
    this.activeTokens.delete(token);
  }
}
