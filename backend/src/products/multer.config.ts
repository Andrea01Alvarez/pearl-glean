import { diskStorage } from 'multer';
import { extname } from 'path';
import { BadRequestException } from '@nestjs/common';

const ALLOWED_EXTENSIONS = [
  '.jpg',
  '.jpeg',
  '.jfif',
  '.png',
  '.gif',
  '.webp',
  '.bmp',
  '.svg',
];

export const imageFileFilter = (
  _req: any,
  file: Express.Multer.File,
  callback: (error: Error | null, acceptFile: boolean) => void,
) => {
  const ext = extname(file.originalname).toLowerCase();
  if (!ALLOWED_EXTENSIONS.includes(ext)) {
    return callback(
      new BadRequestException(
        `Formato no permitido. Solo se aceptan: ${ALLOWED_EXTENSIONS.join(', ')}`,
      ),
      false,
    );
  }
  callback(null, true);
};

export const imageStorage = diskStorage({
  destination: './uploads',
  filename: (_req, file, callback) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = extname(file.originalname).toLowerCase();
    callback(null, `product-${uniqueSuffix}${ext}`);
  },
});
