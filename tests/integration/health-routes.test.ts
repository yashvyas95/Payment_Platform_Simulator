import { buildServer } from '../../src/server';
import { getPrisma } from '../../src/config/database';
import { getRedis } from '../../src/config/redis';

jest.mock('../../src/config/database');
jest.mock('../../src/config/redis');

const mockedGetPrisma = getPrisma as jest.Mock;
const mockedGetRedis = getRedis as jest.Mock;

describe('Health Routes (integration)', () => {
  let server: any;

  beforeAll(async () => {
    mockedGetPrisma.mockReturnValue({
      $queryRaw: jest.fn().mockResolvedValue(1),
    });

    mockedGetRedis.mockReturnValue({
      ping: jest.fn().mockResolvedValue('PONG'),
    });

    server = await buildServer();
  });

  afterAll(async () => {
    if (server) {
      await server.close();
    }
  });

  it('GET /health should return basic health info', async () => {
    const response = await server.inject({
      method: 'GET',
      url: '/health',
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body.status).toBe('ok');
    expect(typeof body.timestamp).toBe('string');
    expect(typeof body.uptime).toBe('number');
    expect(typeof body.environment).toBe('string');
  });

  it('GET /health/detailed should include dependency checks', async () => {
    const response = await server.inject({
      method: 'GET',
      url: '/health/detailed',
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);

    expect(body.status).toBe('healthy');
    expect(body.checks.database).toBe('connected');
    expect(body.checks.redis).toBe('connected');
    expect(body.checks.memory).toBeDefined();
  });
});
