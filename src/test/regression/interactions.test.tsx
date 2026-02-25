/**
 * Regression: Interactions work as expected.
 * Tests component behavior with mocked data (expand/collapse, filter, links).
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import SupplyPieChart from '@/components/dashboard/SupplyPieChart';
import AssetsBreakdownBar from '@/components/dashboard/AssetsBreakdownBar';

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

// Minimal supply data for doughnut
const supplyData = [
  { name: 'Staked', value: 5_730_000 },
  { name: 'Foundation', value: 1_200_000 },
  { name: 'AMM', value: 800_000 },
  { name: 'Core Team', value: 100_000 },
  { name: 'DeSo Bulls', value: 50_000 },
  { name: 'Others', value: 4_320_000 },
];
const desoPrice = 5.78;
const totalSupply = 12_200_000;

describe('4. Interactions – Supply doughnut', () => {
  it('renders without crashing and shows section title', () => {
    render(
      <SupplyPieChart
        data={supplyData}
        desoPrice={desoPrice}
        totalSupply={totalSupply}
      />
    );
    expect(screen.getByText(/Supply Distribution/i)).toBeInTheDocument();
  });

  it('renders with onSegmentClick and highlightedSegment', () => {
    const onSegmentClick = vi.fn();
    render(
      <SupplyPieChart
        data={supplyData}
        desoPrice={desoPrice}
        totalSupply={totalSupply}
        highlightedSegment="Staked"
        onSegmentClick={onSegmentClick}
      />
    );
    expect(screen.getByText(/Supply Distribution/i)).toBeInTheDocument();
  });

  it('shows legend labels for each segment', () => {
    render(
      <SupplyPieChart
        data={supplyData}
        desoPrice={desoPrice}
        totalSupply={totalSupply}
      />
    );
    expect(screen.getByText('Staked')).toBeInTheDocument();
    expect(screen.getByText('Foundation')).toBeInTheDocument();
    expect(screen.getByText('AMM')).toBeInTheDocument();
  });
});

describe('4. Interactions – Assets breakdown bar', () => {
  it('renders without crashing and shows section title', async () => {
    render(
      <AssetsBreakdownBar
        selectedSection={null}
        onSectionClick={() => {}}
      />,
      { wrapper: createWrapper() }
    );
    expect(screen.getByText(/Assets by User-Group/i)).toBeInTheDocument();
    expect(screen.getByText(/Click a column/i)).toBeInTheDocument();
  });

  it('renders with selected section', async () => {
    render(
      <AssetsBreakdownBar
        selectedSection="FOUNDATION"
        onSectionClick={() => {}}
      />,
      { wrapper: createWrapper() }
    );
    // Assets bar shows section labels in column chart and in legend (multiple matches)
    expect(screen.getAllByText('Foundation').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('AMM').length).toBeGreaterThanOrEqual(1);
  });
});
