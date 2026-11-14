import type { Resource } from '../game/engine';
import type { TechnologyId } from './technologies';
export type BuildingId =
  | 'market'
  | 'farm'
  | 'lumber'
  | 'granary'
  | 'stable'
  | 'workshop'
  | 'forge'
  | 'iron_forge'
  | 'steelworks'
  | 'siege_workshop'
  | 'wall'
  | 'tower'
  | 'port'
  | 'shipyard';
export type Building = {
  name: string;
  cost: Resource;
  description: string;
  tech: TechnologyId;
  group: 'economy' | 'military' | 'defense';
  requires?: BuildingId;
};
const b = (
  name: string,
  gold: number,
  wood: number,
  stone: number,
  description: string,
  tech: TechnologyId,
  group: Building['group'] = 'economy',
  requires?: BuildingId
): Building => ({ name, cost: { gold, wood, stone, food: 0 }, description, tech, group, requires });
export const BUILDINGS: Record<BuildingId, Building> = {
  farm: b('Nông trại', 12, 8, 0, '+4 lương/lượt', 'basic_agriculture'),
  granary: b('Kho lương', 10, 8, 0, '+1 lương; bỏ 1 lương duy trì thành', 'granary'),
  lumber: b('Xưởng gỗ', 12, 6, 0, '+3 gỗ/lượt', 'basic_woodworking'),
  market: b('Chợ', 18, 10, 0, '+4 vàng; thưởng kết nối đường tối đa +4', 'commerce'),
  workshop: b(
    'Xưởng cơ khí',
    18,
    15,
    0,
    '+2 gỗ; tuyển lính nỏ và công binh',
    'advanced_woodworking',
    'military'
  ),
  stable: b('Chuồng ngựa', 18, 12, 0, 'Tuyển kỵ nhẹ, cung kỵ và kỵ sĩ', 'horses', 'military'),
  forge: b('Lò rèn', 12, 8, 8, 'Chế tạo lính giáo và thương dài', 'basic_metalworking', 'military'),
  iron_forge: b(
    'Lò rèn sắt',
    18,
    8,
    12,
    'Chế tạo kiếm binh; thay lò rèn',
    'ironworking',
    'military',
    'forge'
  ),
  steelworks: b(
    'Xưởng thép',
    24,
    12,
    18,
    'Tuyển quân giáp nặng; thay lò rèn sắt',
    'steel',
    'military',
    'iron_forge'
  ),
  siege_workshop: b(
    'Xưởng công thành',
    22,
    14,
    10,
    'Chế tạo ballista, catapult và trebuchet',
    'siege',
    'military'
  ),
  wall: b('Tường thành', 14, 5, 18, 'Tối đa công sự +20, xây xong +20 công sự', 'walls', 'defense'),
  tower: b(
    'Tháp canh',
    18,
    10,
    15,
    'Tầm nhìn 3; bắn một địch đầu lượt; −1 vàng duy trì',
    'towers',
    'defense',
    'wall'
  ),
  port: b('Cảng', 15, 15, 5, 'Tuyển tàu ở nước kề thành; cần thành ven biển', 'naval', 'military'),
  shipyard: b(
    'Xưởng đóng tàu',
    22,
    20,
    10,
    'Tuyển chiến hạm; thay cảng',
    'sailing',
    'military',
    'port'
  ),
};
export type ImprovementId =
  | 'farm'
  | 'intensive_farm'
  | 'irrigated_farm'
  | 'pasture'
  | 'lumber'
  | 'mine'
  | 'quarry'
  | 'forest'
  | 'road'
  | 'bridge';
export const IMPROVEMENTS: Record<
  ImprovementId,
  { name: string; tech: TechnologyId; cost: Resource }
> = {
  farm: {
    name: 'Làm ruộng',
    tech: 'basic_agriculture',
    cost: { gold: 6, food: 0, wood: 5, stone: 0 },
  },
  intensive_farm: {
    name: 'Ruộng thâm canh',
    tech: 'advanced_agriculture',
    cost: { gold: 10, food: 0, wood: 8, stone: 0 },
  },
  irrigated_farm: {
    name: 'Mạng tưới',
    tech: 'irrigation',
    cost: { gold: 12, food: 0, wood: 6, stone: 8 },
  },
  pasture: {
    name: 'Đồng cỏ chăn nuôi',
    tech: 'husbandry',
    cost: { gold: 6, food: 0, wood: 5, stone: 0 },
  },
  lumber: {
    name: 'Khai thác rừng',
    tech: 'basic_woodworking',
    cost: { gold: 5, food: 0, wood: 3, stone: 0 },
  },
  mine: { name: 'Mỏ đồi', tech: 'mining', cost: { gold: 6, food: 0, wood: 6, stone: 0 } },
  quarry: { name: 'Mỏ đá', tech: 'stoneworking', cost: { gold: 10, food: 0, wood: 6, stone: 5 } },
  forest: { name: 'Trồng rừng', tech: 'forestry', cost: { gold: 5, food: 0, wood: 2, stone: 0 } },
  road: { name: 'Làm đường', tech: 'roads', cost: { gold: 2, food: 0, wood: 0, stone: 2 } },
  bridge: { name: 'Cầu ngắn', tech: 'engineering', cost: { gold: 8, food: 0, wood: 12, stone: 5 } },
};
