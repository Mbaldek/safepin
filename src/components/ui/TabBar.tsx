'use client';

interface TabItem {
  id: string;
  icon: React.ReactNode;
  label: string;
}

interface TabBarProps {
  items: TabItem[];
  activeTab: string;
  onChange: (id: string) => void;
}

export function TabBar({ items, activeTab, onChange }: TabBarProps) {
  return (
    <nav
      className="fixed bottom-4 left-4 right-4 flex justify-around items-center py-3 px-4 bg-white/[0.08] backdrop-blur-xl rounded-[32px] border border-white/8 z-300"
      style={{ paddingBottom: 'max(12px, env(safe-area-inset-bottom))' }}
    >
      {items.map((item) => (
        <button
          key={item.id}
          onClick={() => onChange(item.id)}
          className={`flex flex-col items-center gap-1 px-4 py-2 rounded-2xl transition-all ${
            activeTab === item.id ? 'text-white bg-white/10' : 'text-slate-500'
          }`}
        >
          {item.icon}
          <span className="text-[11px] font-medium">{item.label}</span>
        </button>
      ))}
    </nav>
  );
}
