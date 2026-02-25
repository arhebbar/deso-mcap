/**
 * Regression: No console.error during render of key components.
 * Surfaces React warnings (e.g. missing keys, setState on unmount) and other errors.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import Index from '@/pages/Index';
import TokenHoldingsTable from '@/components/dashboard/TokenHoldingsTable';
import AssetsBreakdownBar from '@/components/dashboard/AssetsBreakdownBar';

function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false, staleTime: 60_000 },
    },
  });
}

function AppWrapper({ children }: { children: React.ReactNode }) {
  const queryClient = createQueryClient();
  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
}

describe('Console errors – no console.error during render', () => {
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  it(
    'Index page renders without logging console.error',
    async () => {
      render(<Index />, { wrapper: AppWrapper });

      await waitFor(
        () => {
          expect(document.querySelector('main')).toBeInTheDocument();
          expect(screen.getByRole('heading', { name: /DeSo Capital Intelligence/i })).toBeInTheDocument();
        },
        { timeout: 10000 }
      );

      const allowed = /width\(0\) and height\(0\) of chart|ResizeObserver loop/i;
      const calls = consoleErrorSpy.mock.calls.filter((args) => {
        const msg = typeof args[0] === 'string' ? args[0] : String(args[0]);
        return !allowed.test(msg);
      });
      expect(
        calls,
        calls.length ? `Unexpected console.error:\n${calls.map((c) => c.join(' ')).join('\n')}` : undefined
      ).toHaveLength(0);
    },
    12000
  );

  it('TokenHoldingsTable renders without logging console.error', async () => {
    render(
      <TokenHoldingsTable />,
      { wrapper: AppWrapper }
    );

    await waitFor(
      () => {
        expect(screen.getByText(/Token Holdings/i)).toBeInTheDocument();
      },
      { timeout: 5000 }
    );

    const calls = consoleErrorSpy.mock.calls;
    expect(
      calls,
      calls.length ? `Unexpected console.error:\n${calls.map((c) => c.join(' ')).join('\n')}` : undefined
    ).toHaveLength(0);
  });

  it('AssetsBreakdownBar renders without logging console.error', async () => {
    render(
      <AssetsBreakdownBar selectedSection={null} onSectionClick={() => {}} />,
      { wrapper: AppWrapper }
    );

    await waitFor(
      () => {
        expect(screen.getByText(/Assets by User-Group/i)).toBeInTheDocument();
      },
      { timeout: 3000 }
    );

    const calls = consoleErrorSpy.mock.calls;
    expect(
      calls,
      calls.length ? `Unexpected console.error:\n${calls.map((c) => c.join(' ')).join('\n')}` : undefined
    ).toHaveLength(0);
  });
});
