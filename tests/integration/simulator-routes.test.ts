import { buildServer } from '../../src/server';
import { getPrisma } from '../../src/config/database';

jest.mock('../../src/middleware/auth.middleware', () => ({
  authenticateRequest: async (request: any, _reply: any) => {
    (request as any).user = { merchantId: 'm_1' };
  },
}));

const getConfigMock = jest.fn();
const updateConfigMock = jest.fn();
const getTestScenariosMock = jest.fn();

jest.mock('../../src/services/simulator/simulator.service', () => ({
  SimulatorService: jest.fn().mockImplementation(() => ({
    getConfig: getConfigMock,
    updateConfig: updateConfigMock,
    getTestScenarios: getTestScenariosMock,
  })),
}));

jest.mock('../../src/config/database', () => ({
  getPrisma: jest.fn(() => ({ merchant: {}, simulatorConfig: {} })),
  prisma: {},
}));

const mockedGetPrisma = getPrisma as jest.Mock;

describe('Simulator Routes (integration)', () => {
  let server: any;

  beforeAll(async () => {
    getConfigMock.mockResolvedValue({ id: 'cfg_1', merchantId: 'm_1' });
    updateConfigMock.mockResolvedValue({ id: 'cfg_1', merchantId: 'm_1', successRate: 0.9 });
    getTestScenariosMock.mockReturnValue({
      success_cards: [],
      failure_cards: [],
      amount_triggers: [],
    });

    mockedGetPrisma.mockClear();
    server = await buildServer();
  });

  afterAll(async () => {
    if (server) await server.close();
  });

  it('GET /v1/simulator/config returns config', async () => {
    const response = await server.inject({ method: 'GET', url: '/v1/simulator/config' });
    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body.success).toBe(true);
    expect(getConfigMock).toHaveBeenCalledWith('m_1');
  });

  it('PUT /v1/simulator/config updates config', async () => {
    const response = await server.inject({
      method: 'PUT',
      url: '/v1/simulator/config',
      payload: { successRate: 0.9 },
    });
    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body.success).toBe(true);
    expect(updateConfigMock).toHaveBeenCalledWith('m_1', expect.any(Object));
  });

  it('GET /v1/simulator/scenarios returns scenarios', async () => {
    const response = await server.inject({ method: 'GET', url: '/v1/simulator/scenarios' });
    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body.success).toBe(true);
    expect(getTestScenariosMock).toHaveBeenCalled();
  });
});
