import * as dotenv from 'dotenv';
import { resolve } from 'path';

dotenv.config({ path: resolve(__dirname, '../.env') });

import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  await app.listen(process.env.PORT ?? 3000);
  console.log('🚀 Ping Service running on port 3000');
}

// eslint-disable-next-line @typescript-eslint/no-floating-promises
bootstrap();
