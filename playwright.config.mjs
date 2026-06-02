import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 60_000,
  expect: {
    timeout: 10_000,
  },
  reporter: [['list']],
  use: {
    baseURL: 'http://127.0.0.1:18765',
    trace: 'retain-on-failure',
  },
  webServer: {
    command: 'python3 -m http.server 18765 --directory dist',
    url: 'http://127.0.0.1:18765',
    reuseExistingServer: false,
    timeout: 10_000,
  },
});
