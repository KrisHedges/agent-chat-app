import { describe, it, expect } from 'vitest';
import { PRESET_DEVS } from '../src/looker/user-model.js';

describe('user-model', () => {
  it('defines preset developer users with unique IDs and roles', () => {
    expect(PRESET_DEVS.length).toBeGreaterThanOrEqual(3);
    const ids = PRESET_DEVS.map((u) => u.id);
    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toBe(ids.length);

    const dev = PRESET_DEVS.find((u) => u.id === 'dev_local');
    expect(dev).toBeDefined();
    expect(dev?.name).toBe('Local Developer');
    expect(dev?.role).toBe('Developer');
    expect(dev?.avatarInitials).toBe('LD');
  });
});
