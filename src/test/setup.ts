import '@testing-library/jest-dom';

// Suppress Recharts "width(0) and height(0)" in jsdom (no real layout)
const originalConsoleError = console.error;
console.error = (...args: unknown[]) => {
  const msg = typeof args[0] === 'string' ? args[0] : String(args[0]);
  if (msg.includes('width(0) and height(0) of chart')) return;
  originalConsoleError.apply(console, args);
};

Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => {},
  }),
});

// Recharts ResponsiveContainer uses ResizeObserver (not in jsdom)
class ResizeObserverMock {
  observe = () => {};
  unobserve = () => {};
  disconnect = () => {};
}
(globalThis as unknown as { ResizeObserver: typeof ResizeObserverMock }).ResizeObserver = ResizeObserverMock;
