import { Injectable } from '@nestjs/common';
import Redis from 'ioredis';

@Injectable()
export class EventStore {
  private client: Redis;

  constructor() {
    const { REDIS_HOST = 'localhost', REDIS_PORT = 6379 } = process.env;
    this.client = new Redis({
      host: REDIS_HOST,
      port: REDIS_PORT as number,
    });
  }

  async storeEvent(sagaId: string, event: string) {
    await this.client.set(sagaId, event);
  }

  async getEvent(sagaId: string): Promise<string | null> {
    return this.client.get(sagaId);
  }

  async deleteEvent(sagaId: string) {
    await this.client.del(sagaId);
  }
}
