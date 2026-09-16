import { describe, it } from 'node:test';
import assert from 'node:assert';
import { logger, isTestEnv } from '../src/utils/logger.js';

describe('Logger Unit Tests', () => {
  it('isTestEnv should detect test flags correctly', () => {
    assert.strictEqual(typeof isTestEnv(), 'boolean');
    assert.strictEqual(isTestEnv(), true);
  });

  it('logger methods should silence output during test environment', () => {
    let called = false;
    const origLog = console.log;
    const origInfo = console.info;
    const origWarn = console.warn;
    const origError = console.error;

    console.log = () => { called = true; };
    console.info = () => { called = true; };
    console.warn = () => { called = true; };
    console.error = () => { called = true; };

    try {
      logger.log('test log');
      logger.info('test info');
      logger.warn('test warn');
      logger.error('test error');
      assert.strictEqual(called, false);
    } finally {
      console.log = origLog;
      console.info = origInfo;
      console.warn = origWarn;
      console.error = origError;
    }
  });

  it('logger methods should delegate to console methods when not in test env', () => {
    const origNodeEnv = process.env.NODE_ENV;
    const origVitest = process.env.VITEST;
    const origContext = process.env.NODE_TEST_CONTEXT;

    const logged: Record<string, unknown[]> = {};
    const origLog = console.log;
    const origInfo = console.info;
    const origWarn = console.warn;
    const origError = console.error;

    console.log = (...args) => { logged.log = args; };
    console.info = (...args) => { logged.info = args; };
    console.warn = (...args) => { logged.warn = args; };
    console.error = (...args) => { logged.error = args; };

    try {
      process.env.NODE_ENV = 'production';
      delete process.env.VITEST;
      delete process.env.NODE_TEST_CONTEXT;

      assert.strictEqual(isTestEnv(), false);

      logger.log('prod log', 123);
      assert.deepStrictEqual(logged.log, ['prod log', 123]);

      logger.info('prod info');
      assert.deepStrictEqual(logged.info, ['prod info']);

      logger.warn('prod warn');
      assert.deepStrictEqual(logged.warn, ['prod warn']);

      logger.error('prod error');
      assert.deepStrictEqual(logged.error, ['prod error']);
    } finally {
      process.env.NODE_ENV = origNodeEnv;
      if (origVitest) process.env.VITEST = origVitest;
      if (origContext) process.env.NODE_TEST_CONTEXT = origContext;

      console.log = origLog;
      console.info = origInfo;
      console.warn = origWarn;
      console.error = origError;
    }
  });

  it('isTestEnv should return false and allow logging when DEBUG or VERBOSE is set', () => {
    const origDebug = process.env.DEBUG;
    try {
      process.env.DEBUG = '1';
      assert.strictEqual(isTestEnv(), false);
    } finally {
      if (origDebug !== undefined) process.env.DEBUG = origDebug;
      else delete process.env.DEBUG;
    }
  });
});

