'use client';

import { useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { severityOptions, type SeverityLevel, type IncidentType } from '@/lib/incident-types';
import { Camera, Mic, Video, ChevronDown, ChevronUp, X as XIcon } from 'lucide-react';
import { ENVIRONMENTS, URBAN_CONTEXTS } from '@/types';
import { useTranslations } from 'next-intl';

type LocalMedia = {
  file: File;
  preview: string;
  type: 'image' | 'video' | 'audio';
};

interface IncidentDetailsFormProps {
  incidentType: IncidentType;
  severity: SeverityLevel | null;
  onSeverityChange: (level: SeverityLevel) => void;
  description: string;
  onDescriptionChange: (text: string) => void;
  onTypeClick: () => void;
  mediaFiles: LocalMedia[];
  onMediaAdd: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onMediaRemove: (index: number) => void;
  environment: string | null;
  onEnvironmentChange: (env: string | null) => void;
  urbanContext: string | null;
  onUrbanContextChange: (ctx: string | null) => void;
  urbanContextCustom: string;
  onUrbanContextCustomChange: (text: string) => void;
}

function detectType(file: File): 'image' | 'video' | 'audio' {
  if (file.type.startsWith('image')) return 'image';
  if (file.type.startsWith('video')) return 'video';
  return 'audio';
}

export function IncidentDetailsForm({
  incidentType,
  severity,
  onSeverityChange,
  description,
  onDescriptionChange,
  onTypeClick,
  mediaFiles,
  onMediaAdd,
  onMediaRemove,
  environment,
  onEnvironmentChange,
  urbanContext,
  onUrbanContextChange,
  urbanContextCustom,
  onUrbanContextCustomChange,
}: IncidentDetailsFormProps) {
  const t = useTranslations('report');
  const tPlace = useTranslations('placeTypes');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const audioInputRef = useRef<HTMLInputElement>(null);
  const [showDetails, setShowDetails] = useState(false);

  const ENV_I18N: Record<string, string> = { foot: 'onFoot', metro: 'transitMode', car: 'vehicle', indoor: 'indoor' };
  const PLACE_I18N: Record<string, string> = { store: 'storeMall', bus: 'busStop', restaurant: 'restaurantBar' };

  return (
    <div className="flex flex-col gap-4">
      {/* Selected type — tappable to change */}
      <button
        onClick={onTypeClick}
        className="flex items-center justify-between px-4 py-3 rounded-xl text-left transition-colors active:scale-[0.98]"
        style={{
          backgroundColor: 'var(--bg-card)',
          border: '1px solid var(--border)',
        }}
      >
        <div>
          <p className="text-xs mb-0.5" style={{ color: 'var(--text-muted)' }}>Type</p>
          <p className="font-medium" style={{ color: 'var(--text-primary)' }}>{incidentType.label}</p>
        </div>
        <ChevronDown className="w-5 h-5" style={{ color: 'var(--text-muted)' }} />
      </button>

      {/* Severity — compact horizontal pills */}
      <div className="space-y-2">
        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>{t('severity')}</p>
        <div className="flex gap-2">
          {severityOptions.map((option) => {
            const isSelected = severity === option.level;
            return (
              <button
                key={option.level}
                onClick={() => onSeverityChange(option.level)}
                className="flex-1 py-2 px-3 rounded-full text-sm font-medium border-2 transition-all duration-150"
                style={{
                  borderColor: isSelected ? option.color : 'var(--border)',
                  backgroundColor: isSelected ? option.color : 'transparent',
                  color: isSelected ? '#fff' : option.color,
                }}
              >
                {option.shortLabel}
              </button>
            );
          })}
        </div>
      </div>

      {/* Description with inline upload icons */}
      <div className="space-y-2">
        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>{t('description')}</p>
        <div className="relative">
          <textarea
            placeholder={t('descriptionPlaceholder')}
            value={description}
            onChange={(e) => onDescriptionChange(e.target.value)}
            className="w-full min-h-[120px] px-4 py-3 pr-14 rounded-2xl resize-none text-sm outline-none transition-all duration-200"
            style={{
              backgroundColor: 'var(--bg-card)',
              border: '1px solid var(--border)',
              color: 'var(--text-primary)',
            }}
            maxLength={300}
          />

          {/* Upload icons — vertical stack on right side */}
          <div className="absolute right-3 top-3 flex flex-col gap-2">
            <input type="file" accept="image/*" ref={fileInputRef} className="hidden" onChange={onMediaAdd} />
            <input type="file" accept="video/*" ref={videoInputRef} className="hidden" onChange={onMediaAdd} />
            <input type="file" accept="audio/*" ref={audioInputRef} className="hidden" onChange={onMediaAdd} />

            <button
              onClick={() => fileInputRef.current?.click()}
              className="w-9 h-9 rounded-full shadow-sm flex items-center justify-center transition-colors"
              style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border)' }}
              aria-label="Ajouter une photo"
            >
              <Camera className="w-4 h-4" style={{ color: 'var(--text-muted)' }} />
            </button>
            <button
              onClick={() => videoInputRef.current?.click()}
              className="w-9 h-9 rounded-full shadow-sm flex items-center justify-center transition-colors"
              style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border)' }}
              aria-label="Ajouter une vidéo"
            >
              <Video className="w-4 h-4" style={{ color: 'var(--text-muted)' }} />
            </button>
            <button
              onClick={() => audioInputRef.current?.click()}
              className="w-9 h-9 rounded-full shadow-sm flex items-center justify-center transition-colors"
              style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border)' }}
              aria-label="Ajouter un audio"
            >
              <Mic className="w-4 h-4" style={{ color: 'var(--text-muted)' }} />
            </button>
          </div>
        </div>
        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{description.length}/300</p>
      </div>

      {/* Media preview thumbnails */}
      {mediaFiles.length > 0 && (
        <div className="flex gap-2 flex-wrap">
          {mediaFiles.map((m, i) => (
            <div
              key={i}
              className="relative w-16 h-16 rounded-xl overflow-hidden flex-shrink-0"
              style={{ border: '1px solid var(--border)' }}
            >
              {m.type === 'image' && (
                <img src={m.preview} alt="" className="w-full h-full object-cover" />
              )}
              {m.type === 'video' && (
                <video src={m.preview} className="w-full h-full object-cover" muted />
              )}
              {m.type === 'audio' && (
                <div className="w-full h-full flex items-center justify-center" style={{ backgroundColor: 'var(--bg-card)' }}>
                  <Mic className="w-5 h-5" style={{ color: 'var(--text-muted)' }} />
                </div>
              )}
              <button
                onClick={() => onMediaRemove(i)}
                className="absolute top-0.5 right-0.5 w-4 h-4 rounded-full flex items-center justify-center text-[0.5rem]"
                style={{ backgroundColor: 'rgba(0,0,0,0.6)', color: '#fff' }}
              >
                <XIcon size={10} />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Collapsed "More details" section */}
      <button
        onClick={() => setShowDetails(!showDetails)}
        className="w-full flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-bold transition"
        style={{ color: 'var(--text-muted)' }}
      >
        {showDetails ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        {showDetails ? t('hideDetails') : t('addDetails')}
      </button>

      <AnimatePresence>
        {showDetails && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            style={{ overflow: 'hidden' }}
          >
            <div className="space-y-4">
              {/* Environment / Transport mode */}
              <div>
                <label className="block text-[0.7rem] font-bold uppercase tracking-wider mb-1.5" style={{ color: 'var(--text-muted)' }}>
                  {t('environment')}
                </label>
                <div className="flex gap-1.5 overflow-x-auto pb-1 no-scrollbar">
                  {Object.entries(ENVIRONMENTS).map(([key, { emoji }]) => (
                    <button
                      key={key}
                      onClick={() => onEnvironmentChange(environment === key ? null : key)}
                      className="flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-bold transition whitespace-nowrap"
                      style={
                        environment === key
                          ? { borderColor: 'var(--accent)', color: 'var(--accent)', backgroundColor: 'var(--accent-glow)' }
                          : { borderColor: 'var(--border)', color: 'var(--text-muted)', backgroundColor: 'transparent' }
                      }
                    >
                      {emoji} {t(ENV_I18N[key] ?? key)}
                    </button>
                  ))}
                </div>
              </div>

              {/* Urban context */}
              <div>
                <label className="block text-[0.7rem] font-bold uppercase tracking-wider mb-1.5" style={{ color: 'var(--text-muted)' }}>
                  {t('urbanContext')}
                </label>
                <div className="grid grid-cols-3 gap-1.5">
                  {Object.entries(URBAN_CONTEXTS).map(([key, { emoji }]) => (
                    <button
                      key={key}
                      onClick={() => onUrbanContextChange(urbanContext === key ? null : key)}
                      className="rounded-xl py-2 px-1 text-center border transition"
                      style={{
                        borderColor: urbanContext === key ? 'var(--accent)' : 'var(--border)',
                        backgroundColor: urbanContext === key ? 'var(--accent-glow)' : 'var(--bg-card)',
                      }}
                    >
                      <span className="text-base block mb-0.5">{emoji}</span>
                      <span
                        className="text-[0.6rem] font-bold leading-tight block"
                        style={{ color: urbanContext === key ? 'var(--accent)' : 'var(--text-muted)' }}
                      >
                        {tPlace(PLACE_I18N[key] ?? key)}
                      </span>
                    </button>
                  ))}
                </div>
                {urbanContext === 'other' && (
                  <input
                    type="text"
                    value={urbanContextCustom}
                    onChange={(e) => onUrbanContextCustomChange(e.target.value)}
                    placeholder={t('specifyLocation')}
                    className="mt-2 w-full rounded-xl text-sm p-3 outline-none transition"
                    style={{
                      backgroundColor: 'var(--bg-card)',
                      border: '1px solid var(--border)',
                      color: 'var(--text-primary)',
                    }}
                  />
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
