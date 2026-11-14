import './settings.css';

import { Gauge, MonitorCog } from 'lucide-react';

import type { AISpeed, GraphicsQuality, UIPreferences } from './playbackPolicy';

type Option<T extends string> = { value: T; label: string; hint: string };
const SPEEDS: Option<AISpeed>[] = [
  { value: 'normal', label: 'Bình thường', hint: 'Hoạt ảnh AI đầy đủ' },
  {
    value: 'fast',
    label: 'Nhanh',
    hint: 'AI đi nhanh hơn, vẫn hiện đòn đánh và chiếm thành bạn thấy',
  },
];
const QUALITIES: Option<GraphicsQuality>[] = [
  { value: 'normal', label: 'Đầy đủ', hint: 'Bóng đổ, cây và đá trang trí' },
  {
    value: 'medium',
    label: 'Vừa',
    hint: 'Đầy đủ địa hình và quân, tắt bóng, giới hạn độ phân giải 1×',
  },
  {
    value: 'low',
    label: 'Thấp',
    hint: 'Tắt bóng đổ, bớt trang trí, độ phân giải 1×; quân và màu phe giữ nguyên',
  },
];

function Segmented<T extends string>({
  label,
  icon,
  options,
  value,
  onChange,
}: {
  label: string;
  icon: React.ReactNode;
  options: Option<T>[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <div className="setting-row" role="group" aria-label={label}>
      <span className="setting-label">
        {icon}
        {label}
      </span>
      <div className="setting-options">
        {options.map((o) => (
          <button
            key={o.value}
            type="button"
            aria-pressed={value === o.value}
            className={value === o.value ? 'active' : ''}
            title={o.hint}
            onClick={() => onChange(o.value)}
          >
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}

/** Presentation-only settings; stored under the UI preferences key, never in the saved game. */
export function VisualSettingsMenu({
  preferences,
  reducedMotion,
  onChange,
}: {
  preferences: UIPreferences;
  reducedMotion: boolean;
  onChange: (change: Partial<UIPreferences>) => void;
}) {
  return (
    <div className="visual-settings">
      <Segmented
        label="Lượt AI"
        icon={<Gauge size={14} />}
        options={SPEEDS}
        value={preferences.aiSpeed}
        onChange={(aiSpeed) => onChange({ aiSpeed })}
      />
      <Segmented
        label="Đồ họa"
        icon={<MonitorCog size={14} />}
        options={QUALITIES}
        value={preferences.graphics}
        onChange={(graphics) => onChange({ graphics })}
      />
      {reducedMotion && <small>Hệ thống đang bật giảm chuyển động: hoạt ảnh luôn ngắn.</small>}
    </div>
  );
}
