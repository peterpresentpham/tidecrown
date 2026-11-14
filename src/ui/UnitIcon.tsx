import {
  Anchor,
  Axe,
  Crosshair,
  Footprints,
  Hammer,
  Heart,
  Shield,
  Ship,
  Swords,
  Target,
  Telescope,
} from 'lucide-react';

import { UNITS, type UnitType } from '../data/units';

export function iconFor(type: UnitType) {
  if (type === 'transport') return Anchor;
  if (type === 'scout') return Telescope;
  if (type === 'paladin') return Heart;
  const c = UNITS[type].class;
  return c === 'ship'
    ? Ship
    : c === 'siege'
      ? Crosshair
      : c === 'cavalry'
        ? Footprints
        : c === 'ranged'
          ? Target
          : c === 'support'
            ? Hammer
            : type === 'clubman'
              ? Axe
              : type === 'shield'
                ? Shield
                : Swords;
}
