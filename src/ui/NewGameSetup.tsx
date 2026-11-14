import { ArrowRight, Flag, RotateCcw, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

import { FACTION_IDS, FACTIONS } from '../game/engine';
import { DIFFICULTIES, type Difficulty, type GameSettings, newSeed } from '../game/map';

export function NewGameSetup({
  canCancel,
  defaults,
  onCancel,
  onStart,
}: {
  canCancel: boolean;
  defaults: Pick<GameSettings, 'difficulty' | 'aiCount'> & { map?: GameSettings['map'] };
  onCancel: () => void;
  onStart: (
    settings: Pick<GameSettings, 'seed' | 'difficulty' | 'aiCount'> & { map: 'random' | 'water' }
  ) => void;
}) {
  const [difficulty, setDifficulty] = useState<Difficulty>(defaults.difficulty);
  const [aiCount, setAICount] = useState<1 | 2 | 3>(defaults.aiCount);
  const [map, setMap] = useState<'random' | 'water'>(defaults.map === 'water' ? 'water' : 'random');
  const [seed, setSeed] = useState(newSeed);
  const form = useRef<HTMLFormElement>(null);
  useEffect(() => {
    form.current?.querySelector<HTMLButtonElement>('button')?.focus();
  }, []);
  return (
    <div className="dialog-backdrop setup-backdrop">
      <form
        ref={form}
        onKeyDown={(e) => {
          if (e.key !== 'Tab') return;
          e.stopPropagation();
          const controls = [
            ...e.currentTarget.querySelectorAll<HTMLElement>('button:not(:disabled),input'),
          ];
          const first = controls[0],
            last = controls.at(-1);
          if (e.shiftKey && document.activeElement === first) {
            e.preventDefault();
            last?.focus();
          } else if (!e.shiftKey && document.activeElement === last) {
            e.preventDefault();
            first?.focus();
          }
        }}
        className="new-game-setup"
        role="dialog"
        aria-modal="true"
        aria-labelledby="setup-title"
        onSubmit={(e) => {
          e.preventDefault();
          onStart({ difficulty, aiCount, map, seed: seed.trim() || newSeed() });
        }}
      >
        <header>
          <div>
            <span className="setup-eyebrow">VƯƠNG QUỐC EO BIỂN</span>
            <h1 id="setup-title">Một miền đất mới</h1>
          </div>
          {canCancel && (
            <button
              type="button"
              className="close"
              aria-label="Đóng thiết lập ván"
              onClick={onCancel}
            >
              <X size={19} />
            </button>
          )}
        </header>
        <p className="setup-intro">
          Khám phá vùng đất chưa biết, chiếm làng và chinh phục các vương quốc đối địch.
        </p>
        <fieldset>
          <legend>Độ khó</legend>
          <div className="setup-options">
            {(['easy', 'medium', 'hard'] as const).map((id) => (
              <button
                type="button"
                key={id}
                aria-pressed={difficulty === id}
                className={difficulty === id ? 'selected' : ''}
                onClick={() => setDifficulty(id)}
              >
                {DIFFICULTIES[id].name}
              </button>
            ))}
          </div>
          <p className="setup-description">{DIFFICULTIES[difficulty].description}</p>
        </fieldset>
        <fieldset>
          <legend>Số đối thủ AI</legend>
          <div className="setup-options">
            {([1, 2, 3] as const).map((n) => (
              <button
                type="button"
                key={n}
                aria-label={`${n} đối thủ AI`}
                aria-pressed={aiCount === n}
                className={aiCount === n ? 'selected' : ''}
                onClick={() => setAICount(n)}
              >
                {n} AI
              </button>
            ))}
          </div>
          <div className="setup-factions">
            {FACTION_IDS.slice(0, aiCount + 1).map((f) => (
              <span key={f} style={{ color: FACTIONS[f].color }}>
                <Flag size={13} fill="currentColor" />
                {f === 'player' ? 'Bạn' : FACTIONS[f].short}
              </span>
            ))}
          </div>
        </fieldset>
        <fieldset>
          <legend>Kiểu bản đồ</legend>
          <div className="setup-options">
            <button
              type="button"
              aria-pressed={map === 'random'}
              className={map === 'random' ? 'selected' : ''}
              onClick={() => setMap('random')}
            >
              Đất liền
            </button>
            <button
              type="button"
              aria-pressed={map === 'water'}
              className={map === 'water' ? 'selected' : ''}
              onClick={() => setMap('water')}
            >
              Hai bờ biển
            </button>
          </div>
          <p className="setup-description">
            {map === 'water'
              ? 'Eo biển chia cắt hai bờ. Xây cảng, đóng tàu và chở quân sang bờ đối diện.'
              : 'Các làng nối bằng đường đất, mở rộng và gặp đối thủ trên bộ.'}
          </p>
        </fieldset>
        <label className="seed-label" htmlFor="map-seed">
          Mã bản đồ <span>Cùng mã + kiểu bản đồ + số AI tạo cùng bản đồ</span>
        </label>
        <div className="seed-input">
          <input
            id="map-seed"
            value={seed}
            maxLength={32}
            onChange={(e) => setSeed(e.target.value)}
            autoComplete="off"
            spellCheck={false}
          />
          <button
            type="button"
            aria-label="Đổi mã bản đồ"
            title="Đổi mã bản đồ"
            onClick={() => setSeed(newSeed())}
          >
            <RotateCcw size={17} />
          </button>
        </div>
        <p className="setup-rules">
          Mỗi phe bắt đầu với 1 thành và 1 lính. Các phe AI đánh lẫn nhau. Mọi độ khó dùng cùng giá
          quân, chỉ số và sương mù.
        </p>
        <button type="submit" className="start-game">
          Bắt đầu ván
          <ArrowRight size={20} />
        </button>
        {canCancel && (
          <small className="setup-save-note">
            Bắt đầu sẽ thay ván hiện tại; bản lưu dự phòng được giữ lại.
          </small>
        )}
      </form>
    </div>
  );
}
