/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-misused-promises */
import { Injectable, OnModuleInit } from '@nestjs/common';
import { ClientKafka } from '@nestjs/microservices';
import { Inject } from '@nestjs/common';
import { EventStore } from '../event.store';
import { Kafka } from 'kafkajs';

@Injectable()
export class PingService implements OnModuleInit {
  constructor(
    @Inject('KAFKA_SERVICE') private readonly kafkaClient: ClientKafka,
    private readonly eventStore: EventStore,
  ) {}

  async onModuleInit() {
    // Wait for Kafka to be fully ready before connecting
    await this.waitForKafkaReady();

    this.kafkaClient.subscribeToResponseOf('pong-response');
    this.kafkaClient.subscribeToResponseOf('pang-response');

    await this.kafkaClient.connect();

    // Start sending pings periodically
    setInterval(() => this.sendPing(), 10000);
  }

  async sendPing() {
    const sagaId = `saga-${Date.now()}`;
    console.log(`Sending Ping [SagaID: ${sagaId}]......... `);
    await this.eventStore.storeEvent(sagaId, 'ping-sent');

    this.kafkaClient.emit('pong-request', { sagaId });

    // Setup timeout in case the saga is not completed
    setTimeout(async () => {
      const state = await this.eventStore.getEvent(sagaId);
      if (state !== 'saga-completed') {
        console.log(`.........Timeout reached; Rolling back saga ${sagaId}`);
        await this.eventStore.storeEvent(sagaId, 'saga-failed');
      }
    }, 5000);
  }

  async waitForKafkaReady() {
    const kafka = new Kafka({
      brokers: [
        `${process.env.KAFKA_BROKER_HOST}:${process.env.KAFKA_BROKER_PORT}`,
      ],
      clientId: 'kafka-checker',
    });

    const admin = kafka.admin();
    await admin.connect();

    const maxRetries = 10;
    let retries = 0;
    let success = false;

    while (!success && retries < maxRetries) {
      try {
        await admin.fetchTopicMetadata(); // Checks if Kafka is available
        console.log('Kafka is ready');
        success = true;
      } catch (err) {
        console.warn(`Kafka is not ready yet. Retrying... (${++retries})`);
        await new Promise((res) => setTimeout(res, 1000));
      }
    }

    if (!success) {
      throw new Error('Kafka could not be reached after several attempts');
    }

    await admin.disconnect();
  }
}
