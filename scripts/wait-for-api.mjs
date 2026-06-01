const DEFAULT_PORT = process.env.API_PORT ?? process.env.PORT ?? '3101';
const DEFAULT_TARGET = `http://127.0.0.1:${DEFAULT_PORT}`;
const API_TARGET = process.env.VITE_API_TARGET ?? process.env.API_PROXY_TARGET ?? process.env.BACKEND_URL ?? DEFAULT_TARGET;
const HEALTH_URL = new URL('/api/health', API_TARGET.endsWith('/') ? API_TARGET : `${API_TARGET}/`).toString();
const TIMEOUT_MS = Number(process.env.WAIT_FOR_API_TIMEOUT_MS ?? 15000);
const INTERVAL_MS = Number(process.env.WAIT_FOR_API_INTERVAL_MS ?? 250);

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const deadline = Date.now() + TIMEOUT_MS;
let lastError = '';

while (Date.now() <= deadline) {
  try {
    const response = await fetch(HEALTH_URL);
    if (response.ok) {
      console.log(`[wait-for-api] ready: ${HEALTH_URL}`);
      process.exit(0);
    }
    lastError = `HTTP ${response.status}`;
  } catch (error) {
    lastError = error instanceof Error ? error.message : String(error);
  }
  await sleep(INTERVAL_MS);
}

console.error(`[wait-for-api] timed out after ${TIMEOUT_MS}ms waiting for ${HEALTH_URL}`);
if (lastError) console.error(`[wait-for-api] last error: ${lastError}`);
process.exit(1);
