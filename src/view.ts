import {
  backSector,
  hitPolygon,
  layout,
  polar,
  progressPath,
  RING,
  sectorPath,
} from './geometry.js';
import type { Sector } from './geometry.js';
import { isGroup } from './items.js';
import type { QOptions, QRenderContext, QState } from './types.js';

const SVG = 'http://www.w3.org/2000/svg';

/** How the slots arrive: with the wheel, from a parent, or from a child. */
export type Motion = 'open' | 'in' | 'out';

export interface CenterContext {
  readonly backActive: boolean;
  readonly held: boolean;
}

export interface View {
  readonly dialog: HTMLDialogElement;
  readonly wheel: HTMLElement;
  readonly back: HTMLButtonElement;
  readonly trigger: HTMLButtonElement | null;
  /** Rebuilds the item slots and returns the focusable ones in arrow-key order. */
  renderSlots(
    state: QState,
    keys: ReadonlyMap<string, string>,
    motion: Motion,
    context: QRenderContext,
  ): HTMLButtonElement[];
  renderCenter(state: QState, center: CenterContext, context: QRenderContext): void;
  remove(): void;
}

export const keyLabel = (key: string): string =>
  key === ' ' ? 'Space' : key.length === 1 ? key.toUpperCase() : key;

export function createView(
  doc: Document,
  target: HTMLElement,
  options: QOptions,
  keys: { readonly trigger: string; readonly back: string },
): View {
  const make = <K extends keyof HTMLElementTagNameMap>(
    tag: K,
    className: string,
    text?: string,
  ) => {
    const node = doc.createElement(tag);
    node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  };

  const shape = (sector: Sector) => {
    const svg = doc.createElementNS(SVG, 'svg');
    svg.setAttribute('class', 'q-slot-shape');
    svg.setAttribute('viewBox', '0 0 100 100');
    svg.setAttribute('aria-hidden', 'true');
    const fill = doc.createElementNS(SVG, 'path');
    fill.setAttribute('class', 'q-slot-fill');
    fill.setAttribute('d', sectorPath(sector));
    const progress = doc.createElementNS(SVG, 'path');
    progress.setAttribute('class', 'q-slot-progress');
    progress.setAttribute('d', progressPath(sector));
    progress.setAttribute('pathLength', '1');
    svg.append(fill, progress);
    return svg;
  };

  const slot = (sector: Sector, className: string, index: number) => {
    const button = make('button', className);
    button.type = 'button';
    button.style.clipPath = hitPolygon(sector);
    button.style.setProperty('--q-index', String(index));
    const content = make('span', 'q-slot-content');
    const { x, y } = polar(sector.middle, RING.label);
    content.style.left = `${x}%`;
    content.style.top = `${y}%`;
    button.append(shape(sector), content);
    return { button, content };
  };

  const defaultContent = (icon: string, label: string, key: string | undefined) => {
    const nodes: Node[] = [make('span', 'q-slot-icon', icon), make('span', 'q-slot-label', label)];
    (nodes[0] as HTMLElement).setAttribute('aria-hidden', 'true');
    if (key) nodes.push(make('kbd', 'q-slot-key', keyLabel(key)));
    return nodes;
  };

  const dialog = make('dialog', `q-root ${options.className ?? ''}`.trim());
  dialog.setAttribute('aria-label', options.label ?? 'Quick navigation');
  dialog.tabIndex = -1;
  const wheel = make('div', 'q-wheel');
  const slots = make('div', 'q-slots');
  const center = make('div', 'q-center');
  center.setAttribute('aria-live', 'polite');
  center.setAttribute('aria-atomic', 'true');

  const { button: back, content: backContent } = slot(backSector, 'q-slot q-back', 0);
  back.setAttribute('aria-label', 'Back to the previous level');
  back.setAttribute('aria-keyshortcuts', `${keyLabel(keys.back)} Backspace`);
  back.hidden = true;
  backContent.append(...defaultContent('↩', 'Back', keys.back));

  wheel.append(slots, back, center);
  dialog.append(wheel);
  target.append(dialog);

  let trigger: HTMLButtonElement | null = null;
  if (options.trigger !== false) {
    trigger = make('button', `q-trigger ${options.className ?? ''}`.trim());
    trigger.type = 'button';
    trigger.setAttribute('aria-label', options.label ?? 'Quick navigation');
    trigger.setAttribute('aria-keyshortcuts', keyLabel(keys.trigger));
    trigger.setAttribute('aria-haspopup', 'dialog');
    trigger.append(make('kbd', 'q-trigger-key', keyLabel(keys.trigger)));
    target.append(trigger);
  }

  let centerKey = '';

  return {
    dialog,
    wheel,
    back,
    trigger,
    renderSlots(state, itemKeys, motion, context) {
      wheel.dataset.motion = motion;
      back.hidden = !state.canGoBack;
      const sectors = layout(state.items.length, state.canGoBack);
      const focusable: HTMLButtonElement[] = [];
      const buttons = state.items.map((item, index) => {
        const key = itemKeys.get(item.id);
        const { button, content } = slot(sectors[index]!, 'q-slot', index + 1);
        button.disabled = item.disabled ?? false;
        button.dataset.qId = item.id;
        if (isGroup(item)) button.dataset.group = 'true';
        button.setAttribute('aria-label', isGroup(item) ? `${item.label}, group` : item.label);
        if (key) button.setAttribute('aria-keyshortcuts', keyLabel(key));
        if (options.renderItem) content.append(options.renderItem(item, context));
        else
          content.append(
            ...defaultContent(item.icon ?? (isGroup(item) ? '◔' : '●'), item.label, key),
          );
        if (!item.disabled) focusable.push(button);
        return button;
      });
      slots.replaceChildren(...buttons);
      if (state.canGoBack) focusable.push(back);
      return focusable;
    },
    renderCenter(state, { backActive, held }, context) {
      const item = backActive
        ? null
        : (state.items.find((candidate) => candidate.id === state.activeId) ?? null);
      const key = [backActive, held, item?.id, ...state.path].join('\0');
      if (options.renderCenter) {
        center.replaceChildren(options.renderCenter(item, context));
        return;
      }
      if (key === centerKey && center.hasChildNodes()) return;
      centerKey = key;
      const triggerLabel = keyLabel(keys.trigger);
      let title = state.parent?.label ?? 'Where to?';
      let description = state.parent?.description ?? 'Point at a slot or press its key.';
      let hint = '';
      if (backActive) {
        title = 'Back';
        description = 'Return to the previous level.';
        hint = held ? `Release ${triggerLabel} to go back` : 'Click or wait to go back';
      } else if (item) {
        title = item.label;
        description = item.description ?? '';
        if (isGroup(item))
          hint = held ? `Release ${triggerLabel} to open` : 'Click or wait to open';
        else hint = held ? `Release ${triggerLabel} to go` : 'Click or press Enter to go';
      }
      const nodes = [make('strong', 'q-center-title', title)];
      if (description) nodes.push(make('p', 'q-center-description', description));
      if (hint) nodes.push(make('span', 'q-center-hint', hint));
      center.replaceChildren(...nodes);
    },
    remove() {
      dialog.remove();
      trigger?.remove();
    },
  };
}
