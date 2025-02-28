import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { EventStore } from './event.store';

@Module({
  imports: [],
  controllers: [AppController],
  providers: [AppService, EventStore],
})
export class AppModule {}
