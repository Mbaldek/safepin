'use client';

import { useState, useRef } from 'react';
import { ChevronUp, ChevronDown, CheckCircle, Flag, ExternalLink, ThumbsDown, MessageCircle } from 'lucide-react';
import { useStore } from '@/stores/useStore';
import { supabase } from '@/lib/supabase';

type PinCategory = 'assault' | 'harassment' | 'theft' | 'following' | 'suspect' | 'group' | 'unsafe' | 'lighting' | 'blocked' | 'closed' | 'safe' | 'help' | 'presence';

const categoryEmojis: Record<PinCategory, string> = {
  assault: '🚨',
  harassment: '🚫',
  theft: '👜',
  following: '👤',
  suspect: '👁️',
  group: '👥',
  unsafe: '⚠️',
  lighting: '💡',
  blocked: '🚧',
  closed: '🚷',
  safe: '💚',
  help: '🙋',
  presence: '👮',
};

const categoryLabels: Record<PinCategory, string> = {
  assault: 'Agression',
  harassment: 'Harcèlement',
  theft: 'Vol',
  following: 'Filature',
  suspect: 'Suspect',
  group: 'Groupe',
  unsafe: 'Zone dangereuse',
  lighting: 'Éclairage',
  blocked: 'Bloqué',
  closed: 'Fermé',
  safe: 'Zone sûre',
  help: 'Besoin d\'aide',
  presence: 'Présence',
};

function getTimeAgo(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return "à l'instant";
  if (diffMins < 60) return `il y a ${diffMins}min`;
  if (diffHours < 24) return `il y a ${diffHours}h`;
  return `il y a ${diffDays}j`;
}

export function DetailSheet() {
  const { activeSheet, setActiveSheet, selectedPin, setSelectedPin, updatePin } = useStore();

  const [isExpanded, setIsExpanded] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);
  const dragStartY = useRef(0);
  const sheetRef = useRef<HTMLDivElement>(null);

  if (activeSheet !== 'detail' || !selectedPin) return null;

  const pin = selectedPin;
  const category = (pin.category as PinCategory) || 'unsafe';

  const handleDragStart = (clientY: number) => {
    setIsDragging(true);
    dragStartY.current = clientY;
  };

  const handleDragEnd = (clientY: number) => {
    setIsDragging(false);
    const delta = dragStartY.current - clientY;
    if (Math.abs(delta) > 50) {
      setIsExpanded(delta > 0);
    }
  };

  const handleMouseDown = (e: React.MouseEvent) => handleDragStart(e.clientY);
  const handleMouseUp = (e: React.MouseEvent) => { if (isDragging) handleDragEnd(e.clientY); };
  const handleTouchStart = (e: React.TouchEvent) => handleDragStart(e.touches[0].clientY);
  const handleTouchEnd = (e: React.TouchEvent) => { if (isDragging) handleDragEnd(e.changedTouches[0].clientY); };

  const handleClose = () => {
    setActiveSheet('none');
    setSelectedPin(null);
    setIsExpanded(false);
  };

  const handleConfirm = async () => {
    if (isConfirming) return;
    setIsConfirming(true);
    try {
      const { data, error } = await supabase
        .from('pins')
        .update({ confirmations: (pin.confirmations || 1) + 1 })
        .eq('id', pin.id)
        .select()
        .single();

      if (error) throw error;
      if (data) updatePin(data);
    } catch (error) {
      console.error('Error confirming:', error);
    } finally {
      setIsConfirming(false);
    }
  };

  const handleResolved = async () => {
    try {
      await supabase.from('pins').update({ hidden: true }).eq('id', pin.id);
      handleClose();
    } catch (error) {
      console.error('Error resolving:', error);
    }
  };

  const handleFalse = async () => {
    try {
      await supabase.from('pins').update({ flag_count: (pin.flag_count || 0) + 1 }).eq('id', pin.id);
      handleClose();
    } catch (error) {
      console.error('Error flagging:', error);
    }
  };

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: `Signalement: ${categoryLabels[category]}`,
        text: pin.description || '',
        url: window.location.href,
      });
    }
  };

  const transportLabel = pin.is_transport && pin.transport_type
    ? `${pin.transport_type.charAt(0).toUpperCase() + pin.transport_type.slice(1)} L${pin.transport_line}`
    : null;

  return (
    <div
      ref={sheetRef}
      className={`
        fixed bottom-0 left-0 right-0 z-[201]
        bg-[#1E293B] rounded-t-3xl
        transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)]
        ${isDragging ? 'transition-none' : ''}
      `}
      style={{ height: isExpanded ? '80vh' : '180px' }}
      onMouseUp={handleMouseUp}
      onMouseLeave={() => setIsDragging(false)}
      onTouchEnd={handleTouchEnd}
    >
      {/* Handle */}
      <div
        className="flex justify-center pt-3 pb-2 cursor-grab active:cursor-grabbing"
        onMouseDown={handleMouseDown}
        onTouchStart={handleTouchStart}
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="w-10 h-1 rounded-full bg-white/20" />
      </div>

      <div className="px-5 overflow-y-auto" style={{ maxHeight: isExpanded ? 'calc(80vh - 40px)' : '140px' }}>
        {/* Header */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-start gap-3">
            <span className="text-2xl">{categoryEmojis[category] || '📍'}</span>
            <div>
              <h2 className="text-white font-semibold text-lg">{categoryLabels[category] || pin.category}</h2>
              <p className="text-[#94A3B8] text-sm">
                {transportLabel && `${transportLabel} • `}
                {getTimeAgo(pin.created_at)}
              </p>
            </div>
          </div>
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1 text-white/60 hover:text-white transition-colors"
          >
            {isExpanded ? <ChevronDown size={24} /> : <ChevronUp size={24} />}
          </button>
        </div>

        {/* Confirmation Bar */}
        <div className="flex items-center justify-between bg-[#3BB4C1]/10 rounded-xl px-4 py-3 mb-4">
          <div className="flex items-center gap-2">
            <span className="text-lg">👥</span>
            <span className="text-[#3BB4C1] font-medium">
              {pin.confirmations || 1} confirmation{(pin.confirmations || 1) > 1 ? 's' : ''}
            </span>
          </div>
          <button
            onClick={handleConfirm}
            disabled={isConfirming}
            className="bg-[#3BB4C1] text-white px-4 py-1.5 rounded-lg font-medium text-sm hover:bg-[#3BB4C1]/90 transition-colors disabled:opacity-50"
          >
            {isConfirming ? '...' : 'Confirmer'}
          </button>
        </div>

        {/* Expanded Content */}
        {isExpanded && (
          <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
            {/* Location */}
            <div className="mb-4">
              <div className="flex items-start gap-2 text-white">
                <span className="text-lg">📍</span>
                <div>
                  <p className="font-medium">{pin.address || 'Position sur la carte'}</p>
                  {pin.is_transport && pin.transport_line && (
                    <p className="text-[#94A3B8] text-sm">Ligne {pin.transport_line}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Description */}
            {pin.description && (
              <div className="mb-4">
                <p className="text-white/90 italic leading-relaxed">&quot;{pin.description}&quot;</p>
              </div>
            )}

            {/* Media */}
            {pin.media_url && (
              <div className="mb-5 rounded-xl overflow-hidden bg-white/5">
                <img src={pin.media_url} alt="" className="w-full h-48 object-cover" />
              </div>
            )}

            {/* Actions */}
            <div className="grid grid-cols-3 gap-2 mb-4">
              <button onClick={handleConfirm} disabled={isConfirming} className="flex items-center justify-center gap-2 bg-[#3BB4C1] text-white py-3 rounded-xl font-medium hover:bg-[#3BB4C1]/90 transition-colors disabled:opacity-50">
                <CheckCircle size={18} /><span>Confirmer</span>
              </button>
              <button onClick={handleResolved} className="flex items-center justify-center gap-2 bg-[#34D399]/15 text-[#34D399] py-3 rounded-xl font-medium hover:bg-[#34D399]/25 transition-colors">
                <Flag size={18} /><span>Résolu</span>
              </button>
              <button onClick={handleShare} className="flex items-center justify-center gap-2 bg-white/[0.06] text-white border border-white/10 py-3 rounded-xl font-medium hover:bg-white/10 transition-colors">
                <ExternalLink size={18} />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2 pb-6">
              <button onClick={handleFalse} className="flex items-center justify-center gap-2 bg-white/[0.06] text-white border border-white/10 py-3 rounded-xl font-medium hover:bg-white/10 transition-colors">
                <ThumbsDown size={18} /><span>Faux</span>
              </button>
              <button className="flex items-center justify-center gap-2 bg-white/[0.06] text-white border border-white/10 py-3 rounded-xl font-medium hover:bg-white/10 transition-colors">
                <MessageCircle size={18} /><span>Contact</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default DetailSheet;
