import { defineConfig } from '@playwright/test';

// 容器内 verify 服务通过 PLAYWRIGHT_BASE_URL 指向静态 Web 容器；
// 本地运行时不设置该变量，自动起 vite preview 承载 dist。
const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? 'http://127.0.0.1:4173';
const useRemoteServer = !baseURL.includes('127.0.0.1') && !baseURL.includes('localhost');

export default defineConfig({
  testDir: './e2e',
  timeout: 30_000,
  fullyParallel: false,
  retries: 0,
  workers: 1,
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL,
    trace: 'on-first-retry',
  },
  webServer: useRemoteServer
    ? undefined
    : {
        command: 'npm run preview -- --port 4173 --host 127.0.0.1',
        url: baseURL,
        timeout: 60_000,
        reuseExistingServer: !process.env.CI,
      },
});
