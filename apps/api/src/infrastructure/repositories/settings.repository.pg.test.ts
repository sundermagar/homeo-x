import { beforeEach, describe, expect, it, vi } from 'vitest';
import { SettingsRepositoryPg } from './settings.repository.pg';

describe('SettingsRepositoryPg', () => {
  let repo: SettingsRepositoryPg;
  const fakeDb = { session: { client: { unsafe: vi.fn() } }, execute: vi.fn() };

  beforeEach(() => {
    vi.restoreAllMocks();
    fakeDb.session.client.unsafe.mockReset();
    fakeDb.execute.mockReset();
    repo = new SettingsRepositoryPg(fakeDb as any);
  });

  it('creates department using the correct SQL and params', async () => {
    const q1Spy = vi.spyOn(repo as any, 'q1').mockResolvedValue({ id: 1, name: 'Test', description: null, isActive: true });

    await repo.createDepartment({ name: 'Test' });

    expect(q1Spy).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO departments'),
      ['Test', null, true]
    );
  });

  it('updates department using the correct SQL and params', async () => {
    const q1Spy = vi.spyOn(repo as any, 'q1').mockResolvedValue({ id: 2, name: 'Updated', description: 'New', isActive: false });

    await repo.updateDepartment(2, { name: 'Updated', description: 'New', isActive: false });

    expect(q1Spy).toHaveBeenCalledWith(
      expect.stringContaining('UPDATE departments SET'),
      ['Updated', 'New', false, 2]
    );
  });

  it('clears default PDF settings before inserting a default config', async () => {
    const qSpy = vi.spyOn(repo as any, 'q').mockResolvedValue([]);
    const q1Spy = vi.spyOn(repo as any, 'q1').mockResolvedValue({ id: 3, templateName: 'Report', isDefault: true });

    await repo.createPdfSetting({ templateName: 'Report', isDefault: true });

    expect(qSpy).toHaveBeenCalledWith('UPDATE pdf_settings SET is_default = FALSE');
    expect(q1Spy).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO pdf_settings'),
      ['Report', null, null, null, true]
    );
  });

  it('lists stock logs without medicineId using the default query', async () => {
    const qSpy = vi.spyOn(repo as any, 'q').mockResolvedValue([]);

    await repo.listStockLogs();

    expect(qSpy).toHaveBeenCalledWith('SELECT * FROM stock_logs ORDER BY created_at DESC LIMIT 100');
  });
});
