import type { Resource } from '../game/engine';
import type { TechnologyId } from './technologies';

export type UnitType =
  | 'clubman'
  | 'scout'
  | 'shield'
  | 'spear'
  | 'swordsman'
  | 'pikeman'
  | 'heavy_infantry'
  | 'archer'
  | 'ranger'
  | 'crossbow'
  | 'light_cavalry'
  | 'horse_archer'
  | 'knight'
  | 'heavy_knight'
  | 'paladin'
  | 'ballista'
  | 'catapult'
  | 'trebuchet'
  | 'engineer'
  | 'scout_ship'
  | 'transport'
  | 'warship'
  | 'heavy_warship';
export type UnitClass = 'infantry' | 'ranged' | 'cavalry' | 'siege' | 'support' | 'ship';
export type UnitDefinition = {
  name: string;
  hp: number;
  attack: number;
  armor: number;
  moves: number;
  range: number;
  sight: number;
  cost: Resource;
  upkeep: Resource;
  role: string;
  class: UnitClass;
  pierce: number;
  fortDamage: number;
  weight: number;
  capture: boolean;
  mobileShot: boolean;
  facility?: string;
};
const make = (
  name: string,
  cls: UnitClass,
  hp: number,
  attack: number,
  armor: number,
  moves: number,
  range: number,
  gold: number,
  wood: number,
  food: number,
  role: string,
  extra: Partial<UnitDefinition> = {}
): UnitDefinition => ({
  name,
  class: cls,
  hp,
  attack,
  armor,
  moves,
  range,
  sight: Math.max(2, range),
  cost: { gold, food: 0, wood, stone: cls === 'siege' ? 10 : 0 },
  upkeep: { gold: cls === 'ship' || cls === 'siege' ? 2 : 1, food, wood: 0, stone: 0 },
  role,
  pierce: 0,
  fortDamage: 1,
  weight: cls === 'siege' ? 3 : cls === 'cavalry' ? 2 : 1,
  capture: range === 1 && !['support', 'siege', 'ship'].includes(cls),
  mobileShot: false,
  ...extra,
});
export const UNITS: Record<UnitType, UnitDefinition> = {
  clubman: make('Lính chùy', 'infantry', 10, 5, 1, 1, 1, 8, 0, 1, 'Rẻ · chiếm và đồn trú'),
  scout: make('Trinh sát', 'infantry', 8, 3, 0, 3, 1, 12, 0, 1, 'Mở bản đồ · tầm nhìn 4', {
    sight: 4,
  }),
  shield: make('Lính khiên', 'infantry', 14, 5, 2, 2, 1, 18, 3, 1, 'Giữ trận chống tên'),
  spear: make('Lính giáo', 'infantry', 12, 5, 1, 2, 1, 15, 3, 1, '+3 công khi đánh kỵ binh', {
    facility: 'forge',
  }),
  swordsman: make('Kiếm binh', 'infantry', 14, 7, 2, 2, 1, 24, 3, 2, '+2 công khi đánh bộ binh', {
    facility: 'iron_forge',
  }),
  pikeman: make(
    'Thương binh dài',
    'infantry',
    14,
    6,
    2,
    2,
    1,
    22,
    6,
    1,
    'Dựng thương chặn xung phong',
    { facility: 'forge' }
  ),
  heavy_infantry: make(
    'Bộ binh giáp nặng',
    'infantry',
    20,
    8,
    4,
    2,
    1,
    38,
    5,
    2,
    'Giữ thành và tuyến hẹp',
    { facility: 'steelworks', weight: 2 }
  ),
  archer: make('Cung thủ', 'ranged', 9, 5, 0, 2, 2, 12, 2, 1, 'Bắn xa linh hoạt'),
  ranger: make('Kiểm lâm', 'ranged', 11, 6, 1, 3, 2, 23, 5, 1, 'Đi rừng nhẹ · bắn rồi rút', {
    sight: 3,
    mobileShot: true,
  }),
  crossbow: make('Lính nỏ', 'ranged', 12, 7, 1, 2, 2, 25, 6, 2, 'Xuyên 2 giáp · ngắm bắn', {
    pierce: 2,
    facility: 'workshop',
  }),
  light_cavalry: make(
    'Kỵ binh nhẹ',
    'cavalry',
    12,
    5,
    1,
    4,
    1,
    24,
    2,
    2,
    'Vòng sườn · săn tuyến bắn',
    { facility: 'stable', sight: 3 }
  ),
  horse_archer: make(
    'Cung kỵ',
    'cavalry',
    11,
    5,
    1,
    4,
    2,
    32,
    5,
    2,
    'Bắn rồi dùng bước còn lại để rút',
    { facility: 'stable', mobileShot: true }
  ),
  knight: make('Kỵ sĩ', 'cavalry', 17, 7, 2, 3, 1, 34, 4, 2, 'Xung phong +3 công', {
    facility: 'stable',
  }),
  heavy_knight: make('Kỵ sĩ giáp nặng', 'cavalry', 21, 9, 4, 2, 1, 48, 6, 3, 'Xung phong +4 công', {
    facility: 'steelworks',
  }),
  paladin: make(
    'Paladin',
    'cavalry',
    23,
    9,
    4,
    2,
    1,
    64,
    8,
    3,
    'Cứu chữa đồng minh thay đòn đánh',
    { facility: 'steelworks' }
  ),
  ballista: make('Ballista', 'siege', 11, 9, 0, 1, 3, 32, 20, 1, 'Xuyên 3 giáp · đường bắn thẳng', {
    facility: 'siege_workshop',
    pierce: 3,
  }),
  catapult: make(
    'Máy bắn đá',
    'siege',
    10,
    7,
    0,
    2,
    3,
    35,
    20,
    1,
    'Phá 6 công sự · đứng yên để bắn',
    { facility: 'siege_workshop', fortDamage: 6 }
  ),
  trebuchet: make(
    'Trebuchet',
    'siege',
    14,
    8,
    0,
    2,
    4,
    58,
    35,
    2,
    'Phá 10 công sự · cần triển khai',
    { facility: 'siege_workshop', fortDamage: 10 }
  ),
  engineer: make('Công binh', 'support', 10, 2, 0, 2, 1, 24, 10, 1, 'Sửa máy/thành · xây cầu', {
    facility: 'workshop',
    capture: false,
  }),
  scout_ship: make(
    'Thuyền trinh sát',
    'ship',
    10,
    3,
    0,
    5,
    1,
    15,
    12,
    1,
    'Trinh sát biển · không chở quân',
    { facility: 'port', sight: 4, capture: false }
  ),
  transport: make('Tàu vận tải', 'ship', 18, 0, 1, 3, 1, 24, 20, 1, '6 chỗ · cần hộ tống', {
    facility: 'port',
    capture: false,
    weight: 0,
  }),
  warship: make('Chiến hạm', 'ship', 22, 8, 2, 3, 2, 38, 25, 2, 'Hộ tống và bắn ven bờ', {
    facility: 'shipyard',
    capture: false,
  }),
  heavy_warship: make(
    'Chiến hạm hạng nặng',
    'ship',
    30,
    10,
    3,
    2,
    3,
    58,
    35,
    3,
    'Ballista hải quân · xuyên 2 giáp',
    { facility: 'shipyard', pierce: 2, capture: false }
  ),
};
export const UNIT_TECH: Partial<Record<UnitType, TechnologyId>> = {
  scout: 'recon',
  shield: 'shields',
  spear: 'spearmen',
  swordsman: 'swords',
  pikeman: 'pikes',
  heavy_infantry: 'heavy_infantry',
  archer: 'archery',
  ranger: 'rangers',
  crossbow: 'crossbows',
  light_cavalry: 'light_cavalry',
  horse_archer: 'mounted_archery',
  knight: 'knights',
  heavy_knight: 'heavy_cavalry',
  paladin: 'paladins',
  ballista: 'ballistas',
  catapult: 'catapults',
  trebuchet: 'trebuchets',
  engineer: 'engineering',
  scout_ship: 'naval',
  transport: 'transports',
  warship: 'warships',
  heavy_warship: 'heavy_warships',
};
export const RECRUITABLE_UNITS = Object.keys(UNITS) as UnitType[];
export const UNIT_UPGRADES: Partial<Record<UnitType, UnitType[]>> = {
  clubman: ['shield', 'spear', 'swordsman'],
  scout: ['light_cavalry'],
  spear: ['pikeman', 'swordsman'],
  swordsman: ['heavy_infantry'],
  archer: ['ranger', 'crossbow'],
  light_cavalry: ['knight', 'horse_archer'],
  knight: ['heavy_knight'],
  heavy_knight: ['paladin'],
  catapult: ['trebuchet'],
  scout_ship: ['warship'],
  warship: ['heavy_warship'],
};
export const isShip = (u: { type: UnitType }) => UNITS[u.type].class === 'ship';
export const isSiege = (u: { type: UnitType }) => UNITS[u.type].class === 'siege';
