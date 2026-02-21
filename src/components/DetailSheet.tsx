// src/components/DetailSheet.tsx

'use client';

import { useStore } from '@/stores/useStore';
import { CATEGORIES, SEVERITY } from '@/types';

export default function DetailSheet() {
  const { selectedPin, setSelectedPin, setActiveSheet } = useStore();

  if (!selectedPin) return null;

  const cat = CATEGORIES[selectedPin.category as keyof typeof CATEGORIES];
  const sev = SEVERITY[selectedPin.severity as keyof typeof SEVERITY];

  function handleClose() {
    setSelectedPin(null);
    setActiveSheet('none');
  }

  function timeAgo(dateStr: string) {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    if (mins < 2) return 'Just now';
    if (hours < 1) return `${mins}min ago`;
    if (days < 1) return `${hours}h ago`;
    return `${days}d ago`;
  }

  return (
    <>
      <div className="absolute inset-0 bg-black/50 z-[200]" onClick={handleClose} />
      <div className="absolute bottom-0 left-0 right-0 bg-[#12151c] rounded-t-3xl z-[201] max-h-[75dvh] overflow-y-auto animate-slide-up">
        <div className="w-9 h-1 bg-[rgba(255,255,255,0.1)] rounded-full mx-auto mt-3" />
        <div className="p-5 pb-10">
          {/* Header */}
          <div className="flex items-start justify-between gap-3 mb-3">
            <div>
              <p className="text-[0.66rem] uppercase tracking-widest text-[#6b7490] font-bold mb-1">
                {cat?.emoji} {selectedPin.category.replace('_', ' ')}
              </p>
              <h2 className="text-xl font-bold">{cat?.label || 'Report'}</h2>
            </div>
            <span
              className="text-xs font-bold px-3 py-1.5 rounded-full whitespace-nowrap"
              style={{ backgroundColor: sev?.color + '18', color: sev?.color }}
            >
              {sev?.emoji} {sev?.label}
            </span>
          </div>

          {/* Description */}
          <p className="text-sm text-[#6b7490] leading-relaxed mb-4">
            {selectedPin.description}
          </p>

          {/* Meta */}
          <div className="flex gap-3 text-xs text-[#6b7490] font-medium mb-4">
            <span>🕐 {timeAgo(selectedPin.created_at)}</span>
            {selectedPin.photo_url && <span>📎 1 photo</span>}
          </div>

          {/* Photo */}
          {selectedPin.photo_url && (
            <img
              src={selectedPin.photo_url}
              alt="Evidence"
              className="w-full h-40 object-cover rounded-xl border border-[rgba(255,255,255,0.06)] mb-4"
            />
          )}

          {/* Close */}
          <button
            onClick={handleClose}
            className="w-full bg-[#191d28] border border-[rgba(255,255,255,0.08)] text-white font-bold rounded-xl py-3.5 text-sm hover:bg-[#212636] transition"
          >
            Close
          </button>
        </div>
      </div>
    </>
  );
}