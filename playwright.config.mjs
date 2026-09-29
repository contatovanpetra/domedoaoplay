// Testes de ponta a ponta da landing (npm test). Rodam sobre a pasta dist/,
// a mesma que vai pro ar, num celular e num computador.
// Para usar um Chromium já instalado: PW_CHROMIUM=/caminho/do/chrome npm test
import { defineConfig } from "@playwright/test";

const executablePath = process.env.PW_CHROMIUM || undefined;
// BASE_URL testa outro endereço (a Hostinger depois de publicar, por exemplo)
// em vez de subir o servidor local.
const baseURL = process.env.BASE_URL || "http://localhost:4173";

export default defineConfig({
  testDir: "testes/e2e",
  timeout: 90_000,
  expect: { timeout: 15_000 },
  fullyParallel: true,
  workers: process.env.CI ? 2 : 3,
  retries: 0,
  reporter: [["list"]],
  use: { baseURL, launchOptions: { executablePath }, trace: "off" },
  webServer: process.env.BASE_URL ? undefined : { command: "npm run servir", url: "http://localhost:4173/index.html", reuseExistingServer: true, timeout: 60_000 },
  projects: [
    { name: "celular", use: { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 } },
    { name: "computador", use: { viewport: { width: 1440, height: 900 } } },
  ],
});
