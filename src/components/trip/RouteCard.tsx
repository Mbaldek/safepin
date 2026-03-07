'use client';

interface RouteCardProps {
  color: string;
  label: string;
  duration: string;
  distance: string;
  isSelected: boolean;
  isDark: boolean;
}

export default function RouteCard({ color, label, duration, distance, isSelected, isDark }: RouteCardProps) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', padding: '0 20px', height: 40 }}>
      {/* Selection dot */}
      {isSelected ? (
        <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#3BB4C1', marginRight: 8, flexShrink: 0 }} />
      ) : (
        <div style={{ width: 6, marginRight: 8 }} />
      )}

      {/* Color indicator */}
      <div style={{ width: 10, height: 10, borderRadius: '50%', background: color, marginRight: 12, flexShrink: 0 }} />

      {/* Label */}
      <span style={{
        fontSize: 13,
        fontWeight: 500,
        color: isSelected ? '#3BB4C1' : (isDark ? '#FFFFFF' : '#111827'),
        flexGrow: 1,
      }}>
        {label}
      </span>

      {/* Duration */}
      <span style={{
        fontSize: 13,
        fontWeight: 700,
        color: isDark ? '#FFFFFF' : '#111827',
        marginRight: 8,
      }}>
        {duration}
      </span>

      {/* Distance */}
      <span style={{ fontSize: 11, color: isDark ? '#64748B' : '#6B7280' }}>
        {distance}
      </span>
    </div>
  );
}
