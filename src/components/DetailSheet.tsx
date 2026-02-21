// src/components/DetailSheet.tsx

'use client';

import { useStore } from '@/stores/useStore';
import { CATEGORIES, SEVERITY, ENVIRONMENTS } from '@/types';

export default function DetailSheet() {
  const { selectedPin, setSelectedPin, setActiveSheet } = useStore();

  if (!selectedPin) return null;

  const cat = CATEGORIES[selectedPin.category as keyof typeof CATEGORIES];
  const sev = SEVERITY[selectedPin.severity as keyof typeof SEVERITY];
  const env = selectedPin.environment
    ? ENVIRONMENTS[selectedPin.environment as keyof typeof ENVIRONMENTS]
    : null;

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

  // Collect all media: prefer media_urls array, fall back to legacy photo_url
  const mediaItems = selectedPin.media_urls && selectedPin.media_urls.length > 0
    ? selectedPin.media_urls
    : selectedPin.photo_url
      ? [{ url: selectedPin.photo_url, type: 'image' as const }]
      : [];

  return (
    <>
      <div className="absolute inset-0 z-[200]" style={{ backgroundColor: 'var(--bg-overlay)' }} onClick={handleClose} />
      <div
        className="absolute bottom-0 left-0 right-0 rounded-t-3xl z-[201] max-h-[75dvh] overflow-y-auto animate-slide-up"
        style={{ backgroundColor: 'var(--bg-secondary)' }}
      >
        <div className="w-9 h-1 rounded-full mx-auto mt-3" style={{ backgroundColor: 'var(--border)' }} />
        <div className="p-5 pb-10">
          {/* Header */}
          <div className="flex items-start justify-between gap-3 mb-3">
            <div>
              <p className="text-[0.66rem] uppercase tracking-widest font-bold mb-1" style={{ color: 'var(--text-muted)' }}>
                {cat?.emoji} {selectedPin.category.replace('_', ' ')}
              </p>
              <h2 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>{cat?.label || 'Report'}</h2>
            </div>
            <span
              className="text-xs font-bold px-3 py-1.5 rounded-full whitespace-nowrap"
              style={{ backgroundColor: sev?.color + '18', color: sev?.color }}
            >
              {sev?.emoji} {sev?.label}
            </span>
          </div>

          {/* Environment badge */}
          {env && (
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold mb-3"
              style={{ backgroundColor: 'var(--bg-card)', color: 'var(--text-muted)', border: '1px solid var(--border)' }}>
              {env.emoji} {env.label}
            </div>
          )}

          {/* Description */}
          <p className="text-sm leading-relaxed mb-4" style={{ color: 'var(--text-muted)' }}>
            {selectedPin.description}
          </p>

          {/* Meta */}
          <div className="flex gap-3 text-xs font-medium mb-4" style={{ color: 'var(--text-muted)' }}>
            <span>🕐 {timeAgo(selectedPin.created_at)}</span>
            {mediaItems.length > 0 && (
              <span>📎 {mediaItems.length} {mediaItems.length === 1 ? 'file' : 'files'}</span>
            )}
          </div>

          {/* Media gallery */}
          {mediaItems.length > 0 && (
            <div className="flex flex-col gap-2 mb-4">
              {mediaItems.map((m, i) => {
                if (m.type === 'image') {
                  return (
                    <img
                      key={i}
                      src={m.url}
                      alt="Evidence"
                      className="w-full h-44 object-cover rounded-xl"
                      style={{ border: '1px solid var(--border)' }}
                    />
                  );
                }
                if (m.type === 'video') {
                  return (
                    <video
                      key={i}
                      src={m.url}
                      controls
                      className="w-full rounded-xl"
                      style={{ border: '1px solid var(--border)', maxHeight: '180px' }}
                    />
                  );
                }
                // audio
                return (
                  <div key={i} className="rounded-xl p-3 flex items-center gap-3"
                    style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)' }}>
                    <span className="text-2xl">🎵</span>
                    <audio src={m.url} controls className="flex-1" style={{ height: '32px' }} />
                  </div>
                );
              })}
            </div>
          )}

          {/* Close */}
          <button
            onClick={handleClose}
            className="w-full font-bold rounded-xl py-3.5 text-sm transition hover:opacity-80"
            style={{
              backgroundColor: 'var(--bg-card)',
              border: '1px solid var(--border)',
              color: 'var(--text-primary)',
            }}
          >
            Close
          </button>
        </div>
      </div>
    </>
  );
}
