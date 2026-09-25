import { createHash } from 'node:crypto';

const legacy = 'claudian.deviceSettingsKey';
const current = 'claudian-collab.deviceSettingsKey';
beforeEach(() => { jest.resetModules(); localStorage.removeItem(legacy); localStorage.removeItem(current); });
afterEach(() => { localStorage.removeItem(legacy); localStorage.removeItem(current); });
it('adopts this device’s existing seed without changing Claudian’s value', () => {
  localStorage.setItem(legacy, 'existing-device-seed');
  const { getInstallationKey } = require('@/utils/env');
  expect(getInstallationKey()).toBe(`device-${createHash('sha256').update('existing-device-seed').digest('hex')}`);
  expect(localStorage.getItem(current)).toBe('existing-device-seed');
  expect(localStorage.getItem(legacy)).toBe('existing-device-seed');
});
it('retains the standalone seed across reloads without requiring Claudian', () => {
  const { getInstallationKey } = require('@/utils/env');
  const first = getInstallationKey();
  expect(localStorage.getItem(legacy)).toBeNull();
  jest.resetModules();
  expect(require('@/utils/env').getInstallationKey()).toBe(first);
});
it('does not replace an established standalone installation identity', () => {
  localStorage.setItem(current, 'standalone-device');
  localStorage.setItem(legacy, 'another-device');
  const { getInstallationKey } = require('@/utils/env');
  expect(getInstallationKey()).toBe(`device-${createHash('sha256').update('standalone-device').digest('hex')}`);
});
