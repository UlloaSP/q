/**
 * Wheel geometry in a 100 × 100 box. Angles are degrees, clockwise from the top.
 * The ring is smaller than the box: the space around it still belongs to the
 * nearest slot, so a pointer that overshoots keeps its target.
 */
export const RING = { inner: 23, outer: 45, label: 34, progress: 47.5 } as const;

const BACK_SPAN = 54;
const GAP = 0.9;
const CORNER = 1.6;
const HIT_RADIUS = 75;

export interface Sector {
  readonly start: number;
  readonly end: number;
  readonly middle: number;
}

const degrees = (radians: number) => (radians * 180) / Math.PI;
const round = (value: number) => Math.round(value * 100) / 100;

export function polar(angle: number, radius: number): { x: number; y: number } {
  const radians = (angle * Math.PI) / 180;
  return {
    x: round(50 + Math.sin(radians) * radius),
    y: round(50 - Math.cos(radians) * radius),
  };
}

export const backSector: Sector = { start: -BACK_SPAN / 2, end: BACK_SPAN / 2, middle: 0 };

/** Back, when present, takes the top; the items share what remains. */
export function layout(count: number, withBack: boolean): Sector[] {
  const step = (withBack ? 360 - BACK_SPAN : 360) / Math.max(count, 1);
  const origin = withBack ? BACK_SPAN / 2 : -step / 2;
  return Array.from({ length: count }, (_, index) => {
    const start = origin + index * step;
    return { start, end: start + step, middle: start + step / 2 };
  });
}

/** SVG path of the visible slot: equal-width gaps between neighbours and rounded corners. */
export function sectorPath({ start, end }: Sector): string {
  const { inner, outer } = RING;
  // A gap of constant width takes a wider angle near the center.
  const inset = (radius: number) => degrees(Math.asin(GAP / 2 / radius));
  const along = (radius: number) => degrees(CORNER / radius);
  const point = (radius: number, side: 'start' | 'end', onArc = false) => {
    const offset = inset(radius) + (onArc ? along(radius) : 0);
    const { x, y } = polar(side === 'start' ? start + offset : end - offset, radius);
    return `${x} ${y}`;
  };
  const large = end - start > 180 ? 1 : 0;
  return [
    `M${point(outer, 'start', true)}`,
    `A${outer} ${outer} 0 ${large} 1 ${point(outer, 'end', true)}`,
    `Q${point(outer, 'end')} ${point(outer - CORNER, 'end')}`,
    `L${point(inner + CORNER, 'end')}`,
    `Q${point(inner, 'end')} ${point(inner, 'end', true)}`,
    `A${inner} ${inner} 0 ${large} 0 ${point(inner, 'start', true)}`,
    `Q${point(inner, 'start')} ${point(inner + CORNER, 'start')}`,
    `L${point(outer - CORNER, 'start')}`,
    `Q${point(outer, 'start')} ${point(outer, 'start', true)}`,
    'Z',
  ].join('');
}

/** Arc just outside the slot, drawn while the pointer rests on a group. */
export function progressPath({ start, end }: Sector): string {
  const radius = RING.progress;
  const from = polar(start + 2, radius);
  const to = polar(end - 2, radius);
  const large = end - start - 4 > 180 ? 1 : 0;
  return `M${from.x} ${from.y}A${radius} ${radius} 0 ${large} 1 ${to.x} ${to.y}`;
}

/** Clip polygon of the pointer target, reaching past the ring to the edge of the box. */
export function hitPolygon({ start, end }: Sector): string {
  const steps = Math.max(2, Math.ceil((end - start) / 10));
  const arc = (radius: number) =>
    Array.from({ length: steps + 1 }, (_, step) => {
      const { x, y } = polar(start + ((end - start) * step) / steps, radius);
      return `${x}% ${y}%`;
    });
  return `polygon(${[...arc(HIT_RADIUS), ...arc(RING.inner).reverse()].join(',')})`;
}
