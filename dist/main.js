"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const core_1 = require("@nestjs/core");
const config_1 = require("@nestjs/config");
const typeorm_1 = require("typeorm");
const app_module_1 = require("./app.module");
const common_1 = require("@nestjs/common");
const path_1 = require("path");
const cookie_parser_1 = __importDefault(require("cookie-parser"));
async function bootstrap() {
    try {
        const app = await core_1.NestFactory.create(app_module_1.AppModule);
        app.use((0, cookie_parser_1.default)());
        const frontendUrls = (process.env.FRONTEND_URLS ?? '')
            .split(',')
            .map((url) => url.trim())
            .filter(Boolean);
        app.enableCors({
            origin: (origin, callback) => {
                if (!origin || frontendUrls.includes(origin)) {
                    return callback(null, true);
                }
                return callback(new Error('Not allowed by CORS'), false);
            },
            credentials: true,
        });
        app.setGlobalPrefix('api/v1');
        const uploadDir = process.env.UPLOAD_DIR ?? 'uploads';
        const uploadPublicPath = process.env.UPLOAD_PUBLIC_PATH ?? '/uploads';
        app.useStaticAssets((0, path_1.join)(process.cwd(), uploadDir), {
            prefix: `${uploadPublicPath}/`,
        });
        app.useGlobalPipes(new common_1.ValidationPipe({
            whitelist: true,
            forbidNonWhitelisted: true,
            transform: true,
        }));
        const dataSource = app.get(typeorm_1.DataSource);
        const configService = app.get(config_1.ConfigService);
        const dbHost = configService.get('DB_HOST');
        const dbPort = configService.get('DB_PORT');
        const dbName = configService.get('DB_DATABASE');
        if (dataSource.isInitialized) {
            console.log('====================================');
            console.log('✅ Database connected successfully');
            console.log(`📦 Database: ${dbName}`);
            console.log(`🌐 Host: ${dbHost}:${dbPort}`);
            console.log('====================================');
        }
        const port = process.env.PORT ?? 3000;
        await app.listen(port);
        console.log(`🚀 Server is running on http://localhost:${port}`);
    }
    catch (error) {
        console.log('====================================');
        console.log('❌ Application startup failed');
        if (error instanceof Error) {
            console.log('Error message:', error.message);
        }
        else {
            console.log('Error:', error);
        }
        console.log('====================================');
        process.exit(1);
    }
}
bootstrap();
//# sourceMappingURL=main.js.map