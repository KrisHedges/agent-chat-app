/**
 * Application logger that respects test environments.
 * When NODE_ENV === 'test', logs are silenced to keep test runs clean and noise-free.
 */
export function isTestEnv(): boolean {
  // Allow developers to opt in to full logging while developing/debugging tests
  if (process.env.DEBUG || process.env.VERBOSE || process.env.LOG_LEVEL === 'debug') {
    return false;
  }
  return (
    process.env.NODE_ENV === 'test' ||
    Boolean(process.env.VITEST) ||
    Boolean(process.env.NODE_TEST_CONTEXT)
  );
}

export const logger = {
  log: (...args: unknown[]) => {
    if (!isTestEnv()) {
      console.log(...args);
    }
  },
  info: (...args: unknown[]) => {
    if (!isTestEnv()) {
      console.info(...args);
    }
  },
  warn: (...args: unknown[]) => {
    if (!isTestEnv()) {
      console.warn(...args);
    }
  },
  error: (...args: unknown[]) => {
    if (!isTestEnv()) {
      console.error(...args);
    }
  },
};
