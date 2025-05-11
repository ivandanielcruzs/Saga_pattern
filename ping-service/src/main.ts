import * as dotenv from 'dotenv';
import { resolve } from 'path';

dotenv.config({ path: resolve(__dirname, '../.env') });

import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.KAFKA,
    options: {
      client: {
        brokers: [
          `${process.env.KAFKA_BROKER_HOST}:${process.env.KAFKA_BROKER_PORT}`,
        ],
      },
      consumer: {
        groupId: `${process.env.KAFKA_BROKER_GROUP}`,
      },
    },
  });

  await app.startAllMicroservices();

  await app.listen(process.env.PORT ?? 3000);
  console.log('........Ping Service running on port 3000');
}

// eslint-disable-next-line @typescript-eslint/no-floating-promises
bootstrap();
