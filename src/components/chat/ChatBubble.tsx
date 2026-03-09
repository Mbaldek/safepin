'use client';

export interface ChatColors {
  myBg: string;
  myText: string;
  partnerBg: string;
  partnerText: string;
  timestamp: string;
}

interface ChatBubbleProps {
  content: string;
  time: string;
  isMine: boolean;
  colors: ChatColors;
  mediaUrl?: string | null;
  contentType?: string;
}

function formatTime(iso: string) {
  const d = new Date(iso);
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export default function ChatBubble({ content, time, isMine, colors, mediaUrl, contentType }: ChatBubbleProps) {
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: isMine ? 'flex-end' : 'flex-start',
        padding: '2px 16px',
      }}
    >
      <div
        style={{
          maxWidth: '75%',
          padding: '10px 14px',
          borderRadius: 16,
          borderBottomRightRadius: isMine ? 4 : 16,
          borderBottomLeftRadius: isMine ? 16 : 4,
          background: isMine ? colors.myBg : colors.partnerBg,
          color: isMine ? colors.myText : colors.partnerText,
          fontSize: 14,
          lineHeight: 1.5,
          wordBreak: 'break-word',
        }}
      >
        {mediaUrl && (
          contentType === 'video' ? (
            <video src={mediaUrl} controls playsInline style={{ maxWidth: 220, borderRadius: 10, display: 'block', marginBottom: content ? 4 : 0 }} />
          ) : (
            <img src={mediaUrl} alt="" style={{ maxWidth: 220, borderRadius: 10, display: 'block', marginBottom: content ? 4 : 0 }} />
          )
        )}
        {content}
        <div
          style={{
            fontSize: 10,
            color: colors.timestamp,
            marginTop: 4,
            textAlign: isMine ? 'right' : 'left',
            opacity: 0.7,
          }}
        >
          {formatTime(time)}
        </div>
      </div>
    </div>
  );
}
