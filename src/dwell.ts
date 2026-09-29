export interface Dwell {
  /** False until the pointer has travelled the threshold since the last gate. */
  track(event: MouseEvent): boolean;
  /** Runs the action once the pointer has rested on the owner for the delay. */
  start(owner: HTMLElement, delay: number, action: () => void): void;
  cancel(): void;
  /** Requires fresh movement: slots that appear under a resting pointer must not react. */
  gate(): void;
}

export function createDwell(moveThreshold: number): Dwell {
  let timer: ReturnType<typeof setTimeout> | undefined;
  let owner: HTMLElement | null = null;
  let pointer = { x: 0, y: 0 };
  let gate: { x: number; y: number } | 'pending' | null = null;

  const cancel = () => {
    clearTimeout(timer);
    timer = undefined;
    if (owner) delete owner.dataset.dwelling;
    owner = null;
  };

  return {
    cancel,
    track(event) {
      pointer = { x: event.clientX ?? 0, y: event.clientY ?? 0 };
      if (!gate) return true;
      if (gate === 'pending') {
        gate = pointer;
        return false;
      }
      if (Math.hypot(pointer.x - gate.x, pointer.y - gate.y) < moveThreshold) return false;
      gate = null;
      return true;
    },
    start(next, delay, action) {
      if (owner === next) return;
      cancel();
      owner = next;
      next.style.setProperty('--q-dwell', `${delay}ms`);
      next.dataset.dwelling = 'true';
      timer = setTimeout(() => {
        cancel();
        action();
      }, delay);
    },
    gate() {
      gate = 'pending';
    },
  };
}
