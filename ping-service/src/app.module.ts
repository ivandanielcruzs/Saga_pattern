import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { EventStore } from './event.store';
import { PingService } from './ping/ping.service';
import { ClientsModule, Transport } from '@nestjs/microservices';

@Module({
  imports: [
    ClientsModule.register([
      {
        name: 'KAFKA_SERVICE',
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
      },
    ]),
  ],
  controllers: [AppController],
  providers: [AppService, EventStore, PingService],
})
export class AppModule {}
