// src/__tests__/components/NotificationsSheet.test.tsx

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import NotificationsSheet from '@/components/NotificationsSheet';
import { useStore } from '@/stores/useStore';

describe('NotificationsSheet', () => {
  it('renders empty state when no notifications', () => {
    useStore.setState({ notifications: [] });
    render(<NotificationsSheet onClose={vi.fn()} />);
    expect(screen.getByText('empty')).toBeInTheDocument();
  });

  it('renders the title', () => {
    useStore.setState({ notifications: [] });
    render(<NotificationsSheet onClose={vi.fn()} />);
    expect(screen.getByText('title')).toBeInTheDocument();
  });

  it('has dialog role', () => {
    useStore.setState({ notifications: [] });
    render(<NotificationsSheet onClose={vi.fn()} />);
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('renders notification items', () => {
    useStore.setState({
      notifications: [
        {
          id: '1',
          type: 'vote',
          title: 'New vote',
          body: 'Someone voted on your pin',
          pin_id: 'p1',
          read: false,
          created_at: new Date().toISOString(),
        },
      ],
    });
    render(<NotificationsSheet onClose={vi.fn()} />);
    expect(screen.getByText('New vote')).toBeInTheDocument();
  });
});
