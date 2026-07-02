import { ConfigService } from '@nestjs/config';
export declare class UploadsController {
    private readonly configService;
    constructor(configService: ConfigService);
    uploadImage(file: Express.Multer.File): {
        url: string;
        filename: string;
        mimetype: string;
        size: number;
    };
}
