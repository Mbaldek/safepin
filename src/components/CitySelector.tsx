// src/components/CitySelector.tsx

'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import AutocompleteInput from './AutocompleteInput';
import { useTranslations } from 'next-intl';

interface CitySelectorProps {
  value: string;
  onChange: (city: string, coords?: { lat: number; lng: number }) => void;
  onClose: () => void;
}

export function CitySelector({ value, onChange, onClose }: CitySelectorProps) {
  const t = useTranslations('onboarding');
  const tCommon = useTranslations('common');
  const [inputValue, setInputValue] = useState(value);

  function handleChange(text: string, coords?: [number, number]) {
    setInputValue(text);
    if (coords) {
      // coords from AutocompleteInput is [lng, lat]
      onChange(text, { lat: coords[1], lng: coords[0] });
      onClose();
    }
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[700] flex items-end sm:items-center justify-center"
        style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}
        onClick={onClose}
      >
        <motion.div
          initial={{ y: '100%' }}
          animate={{ y: 0 }}
          exit={{ y: '100%' }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl p-6"
          style={{ backgroundColor: 'var(--bg-primary)' }}
          onClick={(e) => e.stopPropagation()}
        >
          <div
            className="w-12 h-1 rounded-full mx-auto mb-6"
            style={{ background: 'rgba(255,255,255,0.2)' }}
          />

          <h3
            className="text-lg font-semibold mb-4"
            style={{ color: 'var(--text-primary)' }}
          >
            {t('changeCity')}
          </h3>

          <AutocompleteInput
            value={inputValue}
            onChange={handleChange}
            placeholder={t('cityPlaceholder')}
            autoFocus
          />

          <button
            onClick={onClose}
            className="w-full mt-4 py-3 text-sm"
            style={{ color: 'var(--text-muted)' }}
          >
            {tCommon('cancel')}
          </button>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
