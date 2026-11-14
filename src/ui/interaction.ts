export class TapGesture {
  private pointers = new Set<number>();
  private origin: { id: number; x: number; y: number } | null = null;
  down(e: { pointerId: number; clientX: number; clientY: number; button: number }) {
    this.pointers.add(e.pointerId);
    if (this.pointers.size === 1 && e.button === 0)
      this.origin = { id: e.pointerId, x: e.clientX, y: e.clientY };
    else this.origin = null;
  }
  move(e: { pointerId: number; clientX: number; clientY: number }) {
    if (
      this.origin?.id === e.pointerId &&
      Math.hypot(e.clientX - this.origin.x, e.clientY - this.origin.y) >= 5
    )
      this.origin = null;
  }
  up(e: { pointerId: number; clientX: number; clientY: number }) {
    const tap =
      this.pointers.size === 1 &&
      this.origin?.id === e.pointerId &&
      Math.hypot(e.clientX - this.origin.x, e.clientY - this.origin.y) < 5;
    this.pointers.delete(e.pointerId);
    this.origin = null;
    return !!tap;
  }
  cancel() {
    this.pointers.clear();
    this.origin = null;
  }
}
export function requiresConfirmation(
  active: boolean,
  ownUnit: boolean,
  sameTile: boolean,
  friendlyTarget: boolean,
  friendlyCity: boolean,
  cityLabel: boolean
) {
  return active || (ownUnit && !sameTile && !friendlyTarget && !(cityLabel && friendlyCity));
}
