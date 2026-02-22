// src/__tests__/components/FilterBar.test.tsx

import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
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

  it('renders the filter trigger button', () => {
    render(<FilterBar />);
    const btn = screen.getByLabelText('Map filters');
    expect(btn).toBeInTheDocument();
  });

  it('opens the filter panel on click', () => {
    render(<FilterBar />);
    fireEvent.click(screen.getByLabelText('Map filters'));
    expect(screen.getByRole('dialog')).toBeInTheDocument();
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
    render(<FilterBar />);
    fireEvent.click(screen.getByLabelText('Map filters'));
    expect(screen.getByText('clearAll')).toBeInTheDocument();
  });
});
