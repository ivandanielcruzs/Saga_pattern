/* eslint-disable @typescript-eslint/unbound-method */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-return */
import { Test, TestingModule } from '@nestjs/testing';
import { PingService } from './ping.service';
import { EventStore } from './../event.store';
import { ClientKafka } from '@nestjs/microservices';

jest.mock('kafkajs', () => {
  const actual = jest.requireActual('kafkajs');
  return {
    ...actual,
    Kafka: jest.fn().mockImplementation(() => ({
      admin: () => ({
        connect: jest.fn(),
        disconnect: jest.fn(),
        fetchTopicMetadata: jest.fn().mockResolvedValue({}),
      }),
    })),
  };
});

describe('PingService', () => {
  let service: PingService;
  let kafkaClient: ClientKafka;
  let eventStore: EventStore;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PingService,
        {
          provide: 'KAFKA_SERVICE',
          useValue: {
            emit: jest.fn(),
            subscribeToResponseOf: jest.fn(),
            connect: jest.fn(),
          },
        },
        {
          provide: EventStore,
          useValue: {
            storeEvent: jest.fn(),
            getEvent: jest.fn().mockResolvedValue(null),
          },
        },
      ],
    }).compile();

    service = module.get<PingService>(PingService);
    kafkaClient = module.get<ClientKafka>('KAFKA_SERVICE');
    eventStore = module.get<EventStore>(EventStore);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should store ping event and emit pong-request', async () => {
    jest.useFakeTimers();
    const emitSpy = jest.spyOn(kafkaClient, 'emit');
    const storeSpy = jest.spyOn(eventStore, 'storeEvent');

    await service.sendPing();

    jest.advanceTimersByTime(5000);

    await Promise.resolve();

    expect(storeSpy).toHaveBeenCalledWith(
      expect.stringMatching(/^saga-\d+$/),
      'ping-sent',
    );
    expect(emitSpy).toHaveBeenCalledWith(
      'pong-request',
      expect.objectContaining({ sagaId: expect.stringMatching(/^saga-\d+$/) }),
    );
  });

  it('should call waitForKafkaReady() before connecting', async () => {
    jest.useFakeTimers();
    jest.spyOn(global, 'setInterval').mockImplementation(() => {
      return {
        hasRef: () => false,
        ref: () => {},
        unref: () => {},
      } as unknown as NodeJS.Timeout;
    });
    const waitSpy = jest.spyOn<any, any>(service, 'waitForKafkaReady');
    const connectSpy = jest.spyOn(kafkaClient, 'connect');

    await service.onModuleInit();

    await Promise.resolve();

    expect(waitSpy).toHaveBeenCalled();
    expect(kafkaClient.subscribeToResponseOf).toHaveBeenCalledWith(
      'pong-response',
    );
    expect(kafkaClient.subscribeToResponseOf).toHaveBeenCalledWith(
      'pang-response',
    );
    expect(connectSpy).toHaveBeenCalled();
    jest.clearAllTimers();
    jest.useRealTimers();
  });

  it('should store saga-failed if not completed in time', async () => {
    jest.useFakeTimers();
    const storeSpy = jest.spyOn(eventStore, 'storeEvent');
    jest.spyOn(eventStore, 'getEvent').mockResolvedValue(null);

    await service.sendPing();

    // Fast-forward time
    jest.advanceTimersByTime(5000);

    // Let the pending promises (from setTimeout) resolve
    await Promise.resolve();

    expect(storeSpy).toHaveBeenCalledWith(expect.any(String), 'ping-sent');
    expect(storeSpy).toHaveBeenCalledWith(expect.any(String), 'saga-failed');

    jest.useRealTimers();
  });

  afterEach(() => {
    jest.clearAllTimers();
    jest.restoreAllMocks();
    jest.useRealTimers();
  });
});
