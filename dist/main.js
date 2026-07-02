"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const core_1 = require("@nestjs/core");
const config_1 = require("@nestjs/config");
const typeorm_1 = require("typeorm");
const app_module_1 = require("./app.module");
const common_1 = require("@nestjs/common");
async function bootstrap() {
    try {
        const app = await core_1.NestFactory.create(app_module_1.AppModule);
        app.setGlobalPrefix('api/v1');
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