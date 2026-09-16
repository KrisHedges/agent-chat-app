import { vi, beforeEach } from 'vitest';

// Provide standard in-memory storage for JSDOM environment
const storage: Record<string, string> = {};
const mockStorage: Storage = {
  getItem: (k: string) => storage[k] ?? null,
  setItem: (k: string, v: string) => {
    storage[k] = String(v);
  },
  removeItem: (k: string) => {
    delete storage[k];
  },
  clear: () => {
    for (const key of Object.keys(storage)) {
      delete storage[key];
    }
  },
  key: (i: number) => Object.keys(storage)[i] ?? null,
  get length() {
    return Object.keys(storage).length;
  },
};

if (typeof window !== 'undefined') {
  Object.defineProperty(window, 'localStorage', { value: mockStorage, writable: true });
  if (window.HTMLElement) {
    window.HTMLElement.prototype.scrollIntoView = vi.fn();
  }
}
Object.defineProperty(globalThis, 'localStorage', { value: mockStorage, writable: true });

beforeEach(() => {
  if (typeof window !== 'undefined' && window.localStorage) {
    window.localStorage.clear();
  }
});
