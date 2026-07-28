import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { v2 as cloudinary, UploadApiResponse } from 'cloudinary';

@Injectable()
export class CloudinaryService implements OnModuleInit {
  private readonly logger = new Logger(CloudinaryService.name);

  constructor(private readonly configService: ConfigService) {}

  onModuleInit() {
    cloudinary.config({
      cloud_name: this.configService.get('CLOUDINARY_CLOUD_NAME'),
      api_key: this.configService.get('CLOUDINARY_API_KEY'),
      api_secret: this.configService.get('CLOUDINARY_API_SECRET'),
    });
    this.logger.log('Cloudinary configurado correctamente');
  }

  async uploadImage(
    file: Express.Multer.File,
    category: string,
  ): Promise<{ url: string; publicId: string }> {
    const baseFolder = this.configService.get('CLOUDINARY_FOLDER', 'gp-local');
    const folder = `${baseFolder}/${category}`;

    const result: UploadApiResponse = await new Promise((resolve, reject) => {
      cloudinary.uploader
        .upload_stream(
          {
            folder,
            resource_type: 'image',
            quality: 'auto',
            fetch_format: 'auto',
          },
          (error, result) => {
            if (error || !result) {
              return reject(error || new Error('No se recibió respuesta de Cloudinary'));
            }
            resolve(result);
          },
        )
        .end(file.buffer);
    });

    this.logger.debug(`Imagen subida: ${result.public_id}`);
    return {
      url: result.secure_url,
      publicId: result.public_id,
    };
  }

  async deleteImage(publicId: string): Promise<void> {
    try {
      await cloudinary.uploader.destroy(publicId);
      this.logger.debug(`Imagen eliminada: ${publicId}`);
    } catch (error) {
      this.logger.warn(`No se pudo eliminar imagen ${publicId}: ${error}`);
    }
  }
}
