// src/__tests__/components/EmergencyButton.test.tsx

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import EmergencyButton from '@/components/EmergencyButton';

// Mock navigator.geolocation
const mockGetCurrentPosition = vi.fn();
Object.defineProperty(navigator, 'geolocation', {
  value: { getCurrentPosition: mockGetCurrentPosition, watchPosition: vi.fn(), clearWatch: vi.fn() },
  writable: true,
});

// Mock navigator.vibrate
Object.defineProperty(navigator, 'vibrate', { value: vi.fn(), writable: true });

// Use vi.hoisted so the mock reference is available before vi.mock hoisting
const { toastErrorMock, toastSuccessMock } = vi.hoisted(() => ({
  toastErrorMock: vi.fn(),
  toastSuccessMock: vi.fn(),
}));

vi.mock('sonner', () => ({
  toast: Object.assign((() => {}) as unknown as Record<string, unknown>, {
    error: toastErrorMock,
    success: toastSuccessMock,
  }),
}));

describe('EmergencyButton', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the SOS button', () => {
    render(<EmergencyButton userId={null} />);
    const btn = screen.getByLabelText('Emergency alert');
    expect(btn).toBeInTheDocument();
  });

  it('shows sign-in error when tapped without userId', () => {
    render(<EmergencyButton userId={null} />);
    const btn = screen.getByLabelText('Emergency alert');
    fireEvent.click(btn);
    expect(toastErrorMock).toHaveBeenCalledWith('signInFirst');
  });

  it('requests geolocation when userId is set but no cached location', () => {
    render(<EmergencyButton userId="test-user" />);
    const btn = screen.getByLabelText('Emergency alert');
    fireEvent.click(btn);
    expect(mockGetCurrentPosition).toHaveBeenCalled();
  });

  it('is not disabled in idle state', () => {
    render(<EmergencyButton userId="test-user" />);
    const btn = screen.getByLabelText('Emergency alert');
    expect(btn).not.toBeDisabled();
  });
});
