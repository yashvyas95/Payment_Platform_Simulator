import { SimulatorService } from '../../src/services/simulator/simulator.service';
import { getPrisma } from '../../src/config/database';

jest.mock('../../src/config/database');

const mockedGetPrisma = getPrisma as jest.Mock;

describe('SimulatorService', () => {
  let service: SimulatorService;
  let prismaMock: any;

  beforeEach(() => {
    prismaMock = {
      simulatorConfig: {
        findFirst: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
    };

    mockedGetPrisma.mockReturnValue(prismaMock);
    service = new SimulatorService();
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  it('getConfig returns existing config when found', async () => {
    const existing = { id: 'cfg_1', merchantId: 'm_1' };
    prismaMock.simulatorConfig.findFirst.mockResolvedValue(existing);

    const result = await service.getConfig('m_1');

    expect(prismaMock.simulatorConfig.findFirst).toHaveBeenCalledWith({
      where: { merchantId: 'm_1' },
    });
    expect(result).toBe(existing);
    expect(prismaMock.simulatorConfig.create).not.toHaveBeenCalled();
  });

  it('getConfig creates default config when none exists', async () => {
    prismaMock.simulatorConfig.findFirst.mockResolvedValue(null);
    const created = { id: 'cfg_default', merchantId: null };
    prismaMock.simulatorConfig.create.mockResolvedValue(created);

    const result = await service.getConfig();

    expect(prismaMock.simulatorConfig.findFirst).toHaveBeenCalledWith({
      where: { merchantId: null },
    });
    expect(prismaMock.simulatorConfig.create).toHaveBeenCalled();
    expect(result).toBe(created);
  });

  it('updateConfig updates existing config when present', async () => {
    prismaMock.simulatorConfig.findFirst.mockResolvedValue({ id: 'cfg_1', merchantId: 'm_1' });
    prismaMock.simulatorConfig.update.mockResolvedValue({
      id: 'cfg_1',
      merchantId: 'm_1',
      defaultDelayMs: 500,
    });

    const result = await service.updateConfig('m_1', { defaultDelayMs: 500 });

    expect(prismaMock.simulatorConfig.update).toHaveBeenCalledWith({
      where: { id: 'cfg_1' },
      data: { defaultDelayMs: 500 },
    });
    expect(result.defaultDelayMs).toBe(500);
  });

  it('updateConfig creates config when none exists', async () => {
    prismaMock.simulatorConfig.findFirst.mockResolvedValue(null);
    prismaMock.simulatorConfig.create.mockResolvedValue({
      id: 'cfg_2',
      merchantId: 'm_1',
      defaultDelayMs: 500,
    });

    const result = await service.updateConfig('m_1', { defaultDelayMs: 500 });

    expect(prismaMock.simulatorConfig.create).toHaveBeenCalledWith({
      data: { merchantId: 'm_1', defaultDelayMs: 500 },
    });
    expect(result.merchantId).toBe('m_1');
  });

  it('getTestScenarios returns structured scenarios', () => {
    const scenarios = service.getTestScenarios();
    expect(scenarios.success_cards.length).toBeGreaterThan(0);
    expect(scenarios.failure_cards.length).toBeGreaterThan(0);
    expect(scenarios.amount_triggers.length).toBeGreaterThan(0);
  });
});
