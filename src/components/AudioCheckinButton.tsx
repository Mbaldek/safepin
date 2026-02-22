// src/components/AudioCheckinButton.tsx — S51: Audio Check-in

'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { Mic, Square, Play, Send, Loader2 } from 'lucide-react';

type Props = {
  userId: string;
  sessionType: 'emergency' | 'trip' | 'walk';
  sessionId?: string;
};

export default function AudioCheckinButton({ userId, sessionType, sessionId }: Props) {
  const [recording, setRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [duration, setDuration] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [waveData, setWaveData] = useState<number[]>([]);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animRef = useRef<number | null>(null);

  // Cleanup
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (animRef.current) cancelAnimationFrame(animRef.current);
      if (audioUrl) URL.revokeObjectURL(audioUrl);
    };
  }, [audioUrl]);

  // Start recording
  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm;codecs=opus' });
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      // Setup analyser for waveform
      const audioContext = new AudioContext();
      const source = audioContext.createMediaStreamSource(stream);
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 64;
      source.connect(analyser);
      analyserRef.current = analyser;

      // Animate waveform
      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      function updateWave() {
        analyser.getByteFrequencyData(dataArray);
        setWaveData(Array.from(dataArray.slice(0, 16)));
        animRef.current = requestAnimationFrame(updateWave);
      }
      updateWave();

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        setAudioBlob(blob);
        setAudioUrl(URL.createObjectURL(blob));
        stream.getTracks().forEach((t) => t.stop());
        audioContext.close();
        if (animRef.current) cancelAnimationFrame(animRef.current);
        setWaveData([]);
      };

      mediaRecorder.start(250);
      setRecording(true);
      setDuration(0);
      setAudioBlob(null);
      setAudioUrl(null);

      timerRef.current = setInterval(() => setDuration((d) => d + 1), 1000);
    } catch {
      toast.error('Microphone access denied');
    }
  }, []);

  // Stop recording
  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current?.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
    setRecording(false);
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
  }, []);

  // Play preview
  function playPreview() {
    if (!audioUrl) return;
    if (playing && audioRef.current) { audioRef.current.pause(); setPlaying(false); return; }
    const audio = new Audio(audioUrl);
    audioRef.current = audio;
    audio.onended = () => setPlaying(false);
    audio.play();
    setPlaying(true);
  }

  // Upload and save
  async function uploadCheckin() {
    if (!audioBlob) return;
    setUploading(true);
    try {
      const filename = `audio/${userId}/${Date.now()}.webm`;
      const { error: uploadErr } = await supabase.storage.from('pin-photos').upload(filename, audioBlob, {
        contentType: 'audio/webm',
        cacheControl: '3600',
      });
      if (uploadErr) throw uploadErr;

      const { data: urlData } = supabase.storage.from('pin-photos').getPublicUrl(filename);

      const { error } = await supabase.from('audio_checkins').insert({
        user_id: userId,
        session_type: sessionType,
        session_id: sessionId ?? null,
        audio_url: urlData.publicUrl,
        duration_s: duration,
      });
      if (error) throw error;

      toast.success('Audio check-in sent!');
      setAudioBlob(null);
      setAudioUrl(null);
      setDuration(0);
    } catch (err) {
      toast.error(`Upload failed: ${err}`);
    } finally {
      setUploading(false);
    }
  }

  function formatDuration(s: number) {
    return `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`;
  }

  return (
    <div className="flex flex-col items-center gap-2">
      {/* Waveform during recording */}
      {recording && (
        <div className="flex items-center gap-0.5 h-6">
          {waveData.map((v, i) => (
            <div
              key={i}
              className="w-1 rounded-full transition-all"
              style={{
                height: `${Math.max(4, (v / 255) * 24)}px`,
                backgroundColor: '#ef4444',
                opacity: 0.6 + (v / 255) * 0.4,
              }}
            />
          ))}
          <span className="ml-2 text-xs font-black tabular-nums" style={{ color: '#ef4444' }}>
            {formatDuration(duration)}
          </span>
        </div>
      )}

      {/* Controls */}
      <div className="flex items-center gap-2">
        {!recording && !audioBlob && (
          <button
            onClick={startRecording}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition active:scale-95"
            style={{ backgroundColor: 'rgba(239,68,68,0.1)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.3)' }}
          >
            <Mic size={14} /> Audio check-in
          </button>
        )}

        {recording && (
          <button
            onClick={stopRecording}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-white transition animate-pulse"
            style={{ backgroundColor: '#ef4444' }}
          >
            <Square size={12} /> Stop ({formatDuration(duration)})
          </button>
        )}

        {audioBlob && !recording && (
          <>
            <button
              onClick={playPreview}
              className="flex items-center gap-1 px-2.5 py-2 rounded-xl text-xs font-bold transition"
              style={{ backgroundColor: 'var(--bg-card)', color: 'var(--text-muted)', border: '1px solid var(--border)' }}
            >
              <Play size={12} /> {formatDuration(duration)}
            </button>
            <button
              onClick={uploadCheckin}
              disabled={uploading}
              className="flex items-center gap-1 px-3 py-2 rounded-xl text-xs font-bold text-white transition disabled:opacity-50"
              style={{ backgroundColor: '#10b981' }}
            >
              {uploading ? <Loader2 size={12} className="animate-spin" /> : <Send size={12} />}
              Send
            </button>
          </>
        )}
      </div>
    </div>
  );
}
