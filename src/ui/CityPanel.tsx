import './management.css';

import { BookOpen, Castle, Hammer, Shield, X } from 'lucide-react';
import { useMemo, useState } from 'react';

import { BALANCE } from '../data/balance';
import { RECRUITABLE_UNITS, type TECHNOLOGIES, UNIT_TECH } from '../data/technologies';
import { UNITS } from '../data/units';
import {
  buildingReason,
  BUILDINGS,
  type City,
  cityProduction,
  type Command,
  hasBuilding,
  type ImprovementId,
  IMPROVEMENTS,
  isBesieged,
  maxFort,
  recruitReason,
  REPAIR_COST,
  type State,
  unitLockReason,
  type UnitType,
  upgradeCost,
} from '../game/engine';
import { commandBlock, improvementAvailability } from './actionReasons';
import { iconFor } from './UnitIcon';

export function CityPanel({
  state,
  city,
  remembered,
  onClose,
  onRecruit,
  onResearch,
  onCommand,
  onImprove,
}: {
  state: State;
  city: City;
  remembered: boolean;
  onClose: () => void;
  onRecruit: (t: UnitType) => void;
  onResearch: (id?: keyof typeof TECHNOLOGIES) => void;
  onCommand: (c: Command) => boolean;
  onImprove: (id: ImprovementId) => void;
}) {
  const [tab, setTab] = useState('recruit'),
    [group, setGroup] = useState('all'),
    [hint, setHint] = useState('');
  const own = city.owner === 'player',
    turn = state.turn === 'player' && !state.winner;
  // Reasons come from the engine (dry-run), shown next to the button instead of only on hover/click.
  const upgradeWhy = useMemo(
    () =>
      own && tab === 'build'
        ? commandBlock(state, { type: 'build', city: city.id, building: 'upgrade' })
        : null,
    [state, city.id, own, tab]
  );
  const repairWhy = useMemo(
    () => (own && tab === 'build' ? commandBlock(state, { type: 'repair', city: city.id }) : null),
    [state, city.id, own, tab]
  );
  const improvements = useMemo(
    () =>
      Object.fromEntries(
        Object.keys(IMPROVEMENTS)
          .filter((id) => id !== 'bridge')
          .map((id) => [
            id,
            tab === 'land'
              ? improvementAvailability(state, city, id as ImprovementId)
              : { ready: false, reason: null },
          ])
      ),
    [state, city, tab]
  );
  return (
    <section className="city-card" aria-label={`Quản lý ${city.name}`}>
      <header>
        <Castle size={23} />
        <div>
          <h2>{city.name}</h2>
          <span>
            {own ? 'Thành của bạn' : city.owner ? 'Thành đối thủ' : 'Làng trống'} · Cấp {city.level}
          </span>
        </div>
        <button className="close" aria-label="Đóng quản lý thành" onClick={onClose}>
          <X size={17} />
        </button>
      </header>
      <div className="city-summary">
        <Shield size={14} />
        {city.fort}/{maxFort(city)} công sự{' '}
        {own && <>· +{cityProduction(state, city).gold} vàng/lượt</>}
      </div>
      {remembered && (
        <div className="city-note">
          Thông tin cũ · Lượt {state.knowledge.player.cities[city.id]?.seenRound}. Đưa quân đến gần
          để cập nhật.
        </div>
      )}
      {!remembered && isBesieged(state, city) && (
        <div className="city-note">Bị vây · sản lượng giảm 50%. Phá vòng vây để khôi phục.</div>
      )}
      {city.stability > 0 && (
        <div className="city-note">Đang ổn định: {city.stability} lượt · sản lượng giảm 50%</div>
      )}
      {own && (
        <>
          <div className="city-tabs">
            {[
              ['recruit', 'Quân đội'],
              ['build', 'Công trình'],
              ['land', 'Lãnh thổ'],
            ].map(([id, label]) => (
              <button
                key={id}
                className={tab === id ? 'active' : ''}
                onClick={() => {
                  setTab(id);
                  setHint('');
                }}
              >
                {label}
              </button>
            ))}
          </div>
          {hint && <p className="city-note">{hint}</p>}
          {tab === 'recruit' ? (
            <>
              <select
                className="roster-filter"
                aria-label="Lọc loại quân"
                value={group}
                onChange={(e) => setGroup(e.target.value)}
              >
                {[
                  ['all', 'Tất cả · 23 đơn vị'],
                  ['infantry', 'Bộ binh & trinh sát'],
                  ['ranged', 'Cung & nỏ'],
                  ['cavalry', 'Kỵ binh'],
                  ['siege', 'Công thành'],
                  ['support', 'Công binh'],
                  ['ship', 'Hải quân'],
                ].map(([id, label]) => (
                  <option key={id} value={id}>
                    {label}
                  </option>
                ))}
              </select>
              <div className="recruit-list">
                {RECRUITABLE_UNITS.filter((t) => group === 'all' || UNITS[t].class === group).map(
                  (type) => {
                    const d = UNITS[type],
                      Icon = iconFor(type),
                      locked = unitLockReason(state, 'player', type),
                      why = recruitReason(state, city, type);
                    return (
                      <button
                        key={type}
                        className={locked ? 'locked-unit' : ''}
                        aria-label={locked ? `Mở nghiên cứu cho ${d.name}` : `Tuyển ${d.name}`}
                        title={why ?? d.role}
                        disabled={!turn}
                        onClick={() => {
                          if (locked) onResearch(UNIT_TECH[type]);
                          else if (why) {
                            setHint(why);
                            if (why.includes('Cần xây')) setTab('build');
                          } else onRecruit(type);
                        }}
                      >
                        <Icon size={22} />
                        <div>
                          <strong>{d.name}</strong>
                          <small>{d.role}</small>
                          {why && <small className="reason">{why}</small>}
                          <small>
                            {d.cost.gold} vàng · {d.cost.wood} gỗ
                            {d.cost.stone ? ` · ${d.cost.stone} đá` : ''}
                          </small>
                          <small>
                            Duy trì: {d.upkeep.gold} vàng + {d.upkeep.food} lương
                          </small>
                        </div>
                        <span className="buy">
                          {locked ? 'Mở khóa' : why ? 'Điều kiện' : 'Tuyển'}
                        </span>
                      </button>
                    );
                  }
                )}
              </div>
            </>
          ) : tab === 'build' ? (
            <div className="build-list">
              <button
                disabled={!!upgradeWhy}
                onClick={() => onCommand({ type: 'build', city: city.id, building: 'upgrade' })}
              >
                <Castle size={20} />
                <div>
                  <strong>
                    {city.level >= 3 ? 'Thành cấp 3' : `Nâng thành cấp ${city.level + 1}`}
                  </strong>
                  <small>
                    +5 vàng/lượt · thêm ô công trình · {upgradeCost(state, city).food} lương
                  </small>
                  {upgradeWhy && <small className="reason">{upgradeWhy}</small>}
                </div>
              </button>
              <button
                disabled={!!repairWhy}
                onClick={() => onCommand({ type: 'repair', city: city.id })}
              >
                <Shield size={19} />
                <div>
                  <strong>Sửa +{BALANCE.cityRepair} công sự</strong>
                  <small>
                    {REPAIR_COST.gold} vàng · {REPAIR_COST.stone} đá
                  </small>
                  {repairWhy && <small className="reason">{repairWhy}</small>}
                </div>
              </button>
              {Object.entries(BUILDINGS).map(([id, b]) => {
                const done = hasBuilding(city, id),
                  why = buildingReason(state, city, id as keyof typeof BUILDINGS);
                return (
                  <button
                    key={id}
                    disabled={!turn || done}
                    aria-label={`Xây ${b.name}`}
                    title={why ?? b.description}
                    onClick={() => {
                      if (!state.technologies.player.includes(b.tech)) {
                        onResearch(b.tech);
                        return;
                      }
                      if (why) {
                        setHint(why);
                        return;
                      }
                      onCommand({
                        type: 'build',
                        city: city.id,
                        building: id as keyof typeof BUILDINGS,
                      });
                    }}
                  >
                    <Hammer size={17} />
                    <div>
                      <strong>
                        {b.name}
                        {done ? ' ✓' : ''}
                      </strong>
                      <small>{b.description}</small>
                      <small>
                        {b.cost.gold} vàng · {b.cost.wood} gỗ · {b.cost.stone} đá
                      </small>
                      {!done && (why ?? (!turn ? 'Chờ lượt của bạn.' : null)) && (
                        <small className="reason">{why ?? 'Chờ lượt của bạn.'}</small>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="build-list">
              <p className="city-note">
                Chọn công việc rồi chọn ô trong vùng thành. Mỗi thành xây/cải tạo một lần mỗi lượt.
              </p>
              {Object.entries(IMPROVEMENTS)
                .filter(([id]) => id !== 'bridge')
                .map(([id, d]) => {
                  const locked = !state.technologies.player.includes(d.tech),
                    { ready, reason } = improvements[id];
                  return (
                    <button
                      key={id}
                      disabled={!turn || (!locked && !ready)}
                      aria-label={locked ? `Mở nghiên cứu cho ${d.name}` : `Cải tạo ${d.name}`}
                      onClick={() => {
                        if (locked) onResearch(d.tech);
                        else onImprove(id as ImprovementId);
                      }}
                    >
                      <Hammer size={17} />
                      <div>
                        <strong>{d.name}</strong>
                        <small>
                          {d.cost.gold} vàng · {d.cost.wood} gỗ · {d.cost.stone} đá
                        </small>
                        {reason && <small className="reason">{reason}</small>}
                      </div>
                      {locked && turn && <span className="buy">Mở khóa</span>}
                    </button>
                  );
                })}
            </div>
          )}
          <button className="city-research-link" onClick={() => onResearch()}>
            <BookOpen size={15} />
            Cây công nghệ · 45 nút
          </button>
        </>
      )}
      {!own && !remembered && (
        <p className="city-note">
          {city.fort
            ? 'Phá công sự, sau đó dùng bộ/kỵ binh chiếm thành.'
            : 'Đưa bộ/kỵ binh đến ô kề rồi chọn làng để chiếm.'}
        </p>
      )}
    </section>
  );
}
