// src/components/OfflineBanner.tsx

'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { WifiOff } from 'lucide-react';

export default function OfflineBanner() {
  const [offline, setOffline] = useState(false);

  useEffect(() => {
    setOffline(!navigator.onLine);
    const goOff = () => setOffline(true);
    const goOn  = () => setOffline(false);
    window.addEventListener('offline', goOff);
    window.addEventListener('online', goOn);
    return () => {
      window.removeEventListener('offline', goOff);
      window.removeEventListener('online', goOn);
    };
  }, []);

  return (
    <AnimatePresence>
      {offline && (
        <motion.div
          key="offline"
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -12 }}
          transition={{ type: 'spring', damping: 28, stiffness: 300 }}
          className="fixed top-0 left-0 right-0 z-[700] flex items-center justify-center gap-2 py-2 px-4"
          style={{
            backgroundColor: 'rgba(245,158,11,0.95)',
            backdropFilter: 'blur(8px)',
            paddingTop: 'calc(env(safe-area-inset-top) + 8px)',
          }}
        >
          <WifiOff size={14} strokeWidth={2.5} color="#fff" />
          <span className="text-xs font-bold text-white">You're offline — data may be outdated</span>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
