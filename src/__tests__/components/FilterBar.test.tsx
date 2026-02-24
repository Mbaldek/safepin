// src/__tests__/components/FilterBar.test.tsx

import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import FilterBar from '@/components/FilterBar';
import { useStore } from '@/stores/useStore';

describe('FilterBar', () => {
  beforeEach(() => {
    useStore.setState({
      mapFilters: {
        severity: 'all',
        age: 'all',
        urban: 'all',
        confirmedOnly: false,
        liveOnly: false,
        timeOfDay: 'all',
      },
    });
  });

  it('renders nothing when closed', () => {
    const { container } = render(<FilterBar open={false} onClose={() => {}} />);
    expect(container.innerHTML).toBe('');
  });

  it('renders the bottom sheet when open', () => {
    render(<FilterBar open={true} onClose={() => {}} />);
    expect(screen.getByText('title')).toBeInTheDocument();
  });

  it('shows clear all button when filters are active', () => {
    useStore.setState({
      mapFilters: {
        severity: 'high',
        age: 'all',
        urban: 'all',
        confirmedOnly: false,
        liveOnly: false,
        timeOfDay: 'all',
      },
    });
    render(<FilterBar open={true} onClose={() => {}} />);
    expect(screen.getByText('clearAll')).toBeInTheDocument();
  });
});
