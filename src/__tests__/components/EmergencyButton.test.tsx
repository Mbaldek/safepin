// src/__tests__/components/EmergencyButton.test.tsx

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
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
const { toastErrorMock, toastSuccessMock, toastWarningMock } = vi.hoisted(() => ({
  toastErrorMock: vi.fn(),
  toastSuccessMock: vi.fn(),
  toastWarningMock: vi.fn(),
}));

vi.mock('sonner', () => ({
  toast: Object.assign((() => {}) as unknown as Record<string, unknown>, {
    error: toastErrorMock,
    success: toastSuccessMock,
    warning: toastWarningMock,
  }),
}));

describe('EmergencyButton', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders the SOS button', () => {
    render(<EmergencyButton userId={null} />);
    const btn = screen.getByLabelText(/Emergency alert/);
    expect(btn).toBeInTheDocument();
  });

  it('shows sign-in error after hold completes without userId', () => {
    render(<EmergencyButton userId={null} />);
    const btn = screen.getByLabelText(/Emergency alert/);

    // Simulate hold for 3 seconds
    fireEvent.pointerDown(btn);
    act(() => { vi.advanceTimersByTime(3000); });

    expect(toastErrorMock).toHaveBeenCalledWith('signInFirst');
  });

  it('requests geolocation after hold completes with userId', () => {
    render(<EmergencyButton userId="test-user" />);
    const btn = screen.getByLabelText(/Emergency alert/);

    // Simulate hold for 3 seconds
    fireEvent.pointerDown(btn);
    act(() => { vi.advanceTimersByTime(3000); });

    expect(mockGetCurrentPosition).toHaveBeenCalled();
  });

  it('is not disabled in idle state', () => {
    render(<EmergencyButton userId="test-user" />);
    const btn = screen.getByLabelText(/Emergency alert/);
    expect(btn).not.toBeDisabled();
  });
});
