'use client';

import { useState, useEffect, useCallback } from 'react';

const TOUR_STORAGE_KEY = 'breveil_tour_completed';

export interface TourStep {
  id: string;
  targetSelector: string;
  titleKey: string;
  descriptionKey: string;
  position: 'top' | 'bottom' | 'left' | 'right';
}

const TOUR_STEPS: TourStep[] = [
  {
    id: 'sos',
    targetSelector: '[data-tour="sos-button"]',
    titleKey: 'sosTitle',
    descriptionKey: 'sosDesc',
    position: 'top',
  },
  {
    id: 'report',
    targetSelector: '[data-tour="report-button"]',
    titleKey: 'reportTitle',
    descriptionKey: 'reportDesc',
    position: 'top',
  },
  {
    id: 'filters',
    targetSelector: '[data-tour="filter-bar"]',
    titleKey: 'filtersTitle',
    descriptionKey: 'filtersDesc',
    position: 'right',
  },
  {
    id: 'trip',
    targetSelector: '[data-tour="nav-trip"]',
    titleKey: 'tripTitle',
    descriptionKey: 'tripDesc',
    position: 'top',
  },
  {
    id: 'profile',
    targetSelector: '[data-tour="nav-me"]',
    titleKey: 'profileTitle',
    descriptionKey: 'profileDesc',
    position: 'top',
  },
];

export function useTour() {
  const [isActive, setIsActive] = useState(false);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);

  useEffect(() => {
    // Check if tour was completed
    const completed = localStorage.getItem(TOUR_STORAGE_KEY);
    if (!completed) {
      // Small delay to let the map render first
      const timer = setTimeout(() => setIsActive(true), 1500);
      return () => clearTimeout(timer);
    }
  }, []);

  const currentStep = TOUR_STEPS[currentStepIndex];

  const next = useCallback(() => {
    if (currentStepIndex < TOUR_STEPS.length - 1) {
      setCurrentStepIndex((i) => i + 1);
    } else {
      // Tour complete
      localStorage.setItem(TOUR_STORAGE_KEY, '1');
      setIsActive(false);
    }
  }, [currentStepIndex]);

  const skip = useCallback(() => {
    localStorage.setItem(TOUR_STORAGE_KEY, '1');
    setIsActive(false);
  }, []);

  const reset = useCallback(() => {
    localStorage.removeItem(TOUR_STORAGE_KEY);
    setCurrentStepIndex(0);
    setIsActive(true);
  }, []);

  return {
    isActive,
    currentStep,
    currentStepIndex,
    totalSteps: TOUR_STEPS.length,
    next,
    skip,
    reset,
  };
}
