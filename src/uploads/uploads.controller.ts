import {
  BadRequestException,
  Controller,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { FileInterceptor } from '@nestjs/platform-express';
import { randomUUID } from 'crypto';
import { existsSync, mkdirSync } from 'fs';
import { diskStorage } from 'multer';
import { extname } from 'path';

const uploadDir = process.env.UPLOAD_DIR ?? 'uploads';

if (!existsSync(uploadDir)) {
  mkdirSync(uploadDir, { recursive: true });
}

@Controller('uploads')
export class UploadsController {
  constructor(private readonly configService: ConfigService) {}

  @Post('image')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: uploadDir,
        filename: (req, file, callback) => {
          const fileExt = extname(file.originalname).toLowerCase();
          const fileName = `${Date.now()}-${randomUUID()}${fileExt}`;

          callback(null, fileName);
        },
      }),
      fileFilter: (req, file, callback) => {
        const isImage = /^image\/(jpeg|jpg|png|webp|gif)$/.test(file.mimetype);

        if (!isImage) {
          return callback(
            new BadRequestException('Only image files are allowed'),
            false,
          );
        }

        callback(null, true);
      },
      limits: {
        fileSize: 5 * 1024 * 1024,
      },
    }),
  )
  uploadImage(@UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('Image file is required');
    }

    const appUrl =
      this.configService.get<string>('APP_URL') ?? 'http://localhost:3000';
    const publicPath =
      this.configService.get<string>('UPLOAD_PUBLIC_PATH') ?? '/uploads';

    return {
      url: `${appUrl}${publicPath}/${file.filename}`,
      filename: file.filename,
      mimetype: file.mimetype,
      size: file.size,
    };
  }
}
