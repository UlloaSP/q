import { createQController } from './controller.js';
import { createDwell } from './dwell.js';
import { assignKeys, validateItems } from './items.js';
import type { QInstance, QItem, QOptions, QState } from './types.js';
import { createView } from './view.js';
import type { Motion } from './view.js';

const EDITABLE =
  'input, textarea, select, [contenteditable]:not([contenteditable="false"]), [role="textbox"]';

function readOptions(options: QOptions) {
  const delays = {
    tapThreshold: options.tapThreshold ?? 250,
    expandDelay: options.expandDelay ?? 450,
    backDelay: options.backDelay ?? 600,
    hoverMoveThreshold: options.hoverMoveThreshold ?? 12,
  };
  for (const [name, value] of Object.entries(delays))
    if (!Number.isFinite(value) || value < 0) throw new Error(`q: ${name} must be non-negative.`);
  const triggerKey = (options.triggerKey ?? 'q').toLowerCase();
  const backKey = (options.backKey ?? ' ').toLowerCase();
  if (triggerKey.length !== 1 || !triggerKey.trim())
    throw new Error('q: triggerKey must be a single character.');
  if (backKey.length !== 1 || backKey === triggerKey)
    throw new Error('q: backKey must be a single character other than the trigger.');
  return { ...delays, triggerKey, backKey };
}

/** Mount one navigation wheel per document. Import styles.css separately, or supply your own styles. */
export function createQ(options: QOptions): QInstance {
  const doc = options.target?.ownerDocument ?? globalThis.document;
  if (!doc)
    throw new Error('q: createQ needs a browser document. Use createQController during SSR.');
  const { triggerKey, backKey, tapThreshold, expandDelay, backDelay, hoverMoveThreshold } =
    readOptions(options);
  const reservedKeys = [triggerKey, backKey];
  validateItems(options.items, reservedKeys);

  const controller = createQController({
    items: options.items,
    onNavigate: (navigation) => {
      if (options.onNavigate) options.onNavigate(navigation);
      else if (navigation.item.href) doc.defaultView?.location.assign(navigation.item.href);
    },
  });
  const view = createView(doc, options.target ?? doc.body, options, {
    trigger: triggerKey,
    back: backKey,
  });
  const { dialog, wheel, back } = view;
  const dwell = createDwell(hoverMoveThreshold);

  let destroyed = false;
  let held = false;
  let heldSince = 0;
  let backActive = false;
  let opening = false;
  let hovered: HTMLButtonElement | null = null;
  let previousFocus: HTMLElement | null = null;
  let previous: QState | undefined;
  let focusable: HTMLButtonElement[] = [];
  let hotkeys = new Map<string, QItem>();

  const context = (state: QState) => ({ state, controller });
  const slotOf = (target: EventTarget | null): HTMLButtonElement | null =>
    (target as Partial<Element> | null)?.closest?.<HTMLButtonElement>('.q-slot') ?? null;
  const focusedSlot = () => slotOf(doc.activeElement);
  const slotFor = (id: string | null) =>
    [...wheel.querySelectorAll<HTMLButtonElement>('.q-slot')].find(
      (slot) => id !== null && slot.dataset.qId === id,
    ) ?? null;
  const paint = (state = controller.getState()) => {
    for (const slot of wheel.querySelectorAll<HTMLButtonElement>('.q-slot'))
      slot.dataset.active = String(
        slot === back ? backActive : slot.dataset.qId === state.activeId,
      );
    view.renderCenter(state, { backActive, held }, context(state));
  };
  const setBackActive = (active: boolean) => {
    if (backActive === active) return;
    backActive = active;
    if (active) controller.highlight(null);
    paint();
  };
  const preview = (slot: HTMLButtonElement) => {
    if (slot === back) return setBackActive(true);
    setBackActive(false);
    controller.highlight(slot.dataset.qId!);
  };
  const commit = (id: string) => {
    const slot = slotFor(id);
    if (slot && !slot.disabled && !slot.dataset.group) slot.dataset.selected = 'true';
    controller.select(id);
  };

  const renderLevel = (state: QState) => {
    const motion: Motion = !previous?.isOpen
      ? 'open'
      : state.path.length < previous.path.length
        ? 'out'
        : 'in';
    const keys = assignKeys(state.items, reservedKeys);
    hotkeys = new Map();
    for (const item of state.items) {
      const key = keys.get(item.id);
      if (key && !item.disabled) hotkeys.set(key, item);
    }
    dwell.cancel();
    dwell.gate();
    hovered = null;
    backActive = false;
    focusable = view.renderSlots(state, keys, motion, context(state));
  };

  const unsubscribe = controller.subscribe((state) => {
    if (destroyed) return;
    const levelChanged =
      !previous ||
      state.path.join('\0') !== previous.path.join('\0') ||
      state.items.length !== previous.items.length ||
      state.items.some((item, index) => item !== previous?.items[index]);
    const opened = state.isOpen && !previous?.isOpen;
    if (levelChanged || opened) renderLevel(state);
    paint(state);
    if (opened) {
      const active = doc.activeElement;
      previousFocus =
        doc.defaultView && active instanceof doc.defaultView.HTMLElement ? active : null;
      // showModal focuses the first slot. The wheel starts neutral instead.
      opening = true;
      dialog.showModal();
      dialog.focus({ preventScroll: true });
      opening = false;
    } else if (!state.isOpen && dialog.open) {
      held = false;
      dwell.cancel();
      dialog.close();
      if (previousFocus?.isConnected) previousFocus.focus({ preventScroll: true });
    } else if (levelChanged && state.isOpen) dialog.focus({ preventScroll: true });
    previous = state;
  });

  const leave = () => {
    if (!hovered) return;
    dwell.cancel();
    if (hovered === back) setBackActive(false);
    else if (controller.getState().activeId === hovered.dataset.qId) controller.highlight(null);
    hovered = null;
  };
  const onPointer = (event: PointerEvent) => {
    if (event.pointerType === 'touch' || !dwell.track(event)) return;
    const slot = slotOf(event.target);
    if (slot !== hovered) leave();
    if (!slot || slot.disabled) return;
    hovered = slot;
    // The pointer takes over from the arrow keys.
    if (focusedSlot() && focusedSlot() !== slot) dialog.focus({ preventScroll: true });
    preview(slot);
    if (slot === back) dwell.start(back, backDelay, () => controller.back());
    else if (slot.dataset.group)
      dwell.start(slot, expandDelay, () => controller.select(slot.dataset.qId!));
  };
  const onClick = (event: MouseEvent) => {
    const slot = slotOf(event.target);
    if (!slot) return;
    dwell.cancel();
    if (slot === back) controller.back();
    else commit(slot.dataset.qId!);
  };
  const onFocusIn = (event: FocusEvent) => {
    const slot = slotOf(event.target);
    if (opening || !slot) return;
    dwell.cancel();
    preview(slot);
  };
  const onFocusOut = (event: FocusEvent) => {
    const slot = slotOf(event.target);
    if (slot === back) setBackActive(false);
    else if (slot && controller.getState().activeId === slot.dataset.qId)
      controller.highlight(null);
  };

  const moveFocus = (direction: 1 | -1) => {
    const highlighted = backActive ? back : slotFor(controller.getState().activeId);
    const from = focusedSlot() ?? highlighted;
    const current = from ? focusable.indexOf(from) : -1;
    const next =
      current < 0
        ? direction < 0
          ? focusable.length - 1
          : 0
        : (current + direction + focusable.length) % focusable.length;
    const slot = focusable[next];
    if (!slot) return;
    slot.focus({ preventScroll: true });
    // Focus events do not fire while the window is in the background.
    preview(slot);
  };
  const isEditable = (target: EventTarget | null) =>
    Boolean((target as Partial<Element> | null)?.closest?.(EDITABLE));

  const onKeyDown = (event: KeyboardEvent) => {
    if (destroyed || event.defaultPrevented || event.isComposing) return;
    if (event.ctrlKey || event.metaKey || event.altKey) return;
    const key = event.key.toLowerCase();
    const state = controller.getState();
    if (key === triggerKey) {
      if (!state.isOpen && isEditable(event.target)) return;
      event.preventDefault();
      if (event.repeat) return;
      if (state.isOpen) controller.close();
      else {
        held = true;
        heldSince = Date.now();
        controller.open();
      }
      return;
    }
    if (!state.isOpen) return;
    if (key.startsWith('arrow')) {
      event.preventDefault();
      dwell.cancel();
      moveFocus(key === 'arrowleft' || key === 'arrowup' ? -1 : 1);
      return;
    }
    if (event.repeat) return;
    // A slot focused with the arrows keeps the native Enter and Space activation.
    const native = focusedSlot() && (key === 'enter' || key === ' ');
    if (native) return;
    const item = hotkeys.get(key);
    if (key === 'escape') controller.close();
    else if (key === 'backspace' || key === backKey) controller.back();
    else if (key === 'enter' && backActive) controller.back();
    else if (key === 'enter' && state.activeId) commit(state.activeId);
    else if (item) commit(item.id);
    else return;
    event.preventDefault();
    dwell.cancel();
  };
  const onKeyUp = (event: KeyboardEvent) => {
    if (event.key.toLowerCase() !== triggerKey || !held) return;
    held = false;
    const state = controller.getState();
    if (!state.isOpen) return;
    event.preventDefault();
    dwell.cancel();
    if (backActive) controller.back();
    else if (state.activeId) commit(state.activeId);
    // A quick tap leaves the wheel open for keys, clicks, and touch.
    else if (Date.now() - heldSince >= tapThreshold) controller.close();
    paint();
  };
  const cancelHold = () => {
    if (held) controller.close();
  };
  const onVisibilityChange = () => {
    if (doc.hidden) cancelHold();
  };
  const onCancel = (event: Event) => {
    event.preventDefault();
    controller.close();
  };
  const onClose = () => controller.close();
  const onBackdropClick = (event: MouseEvent) => {
    if (event.target === dialog) controller.close();
  };
  const onContextMenu = (event: MouseEvent) => {
    event.preventDefault();
    if (controller.getState().canGoBack) controller.back();
    else controller.close();
  };
  const onTrigger = () => controller.open();

  doc.addEventListener('keydown', onKeyDown);
  doc.addEventListener('keyup', onKeyUp);
  doc.addEventListener('visibilitychange', onVisibilityChange);
  doc.defaultView?.addEventListener('blur', cancelHold);
  dialog.addEventListener('cancel', onCancel);
  dialog.addEventListener('close', onClose);
  dialog.addEventListener('click', onBackdropClick);
  dialog.addEventListener('contextmenu', onContextMenu);
  wheel.addEventListener('pointerover', onPointer);
  wheel.addEventListener('pointermove', onPointer);
  wheel.addEventListener('pointerleave', leave);
  wheel.addEventListener('click', onClick);
  wheel.addEventListener('focusin', onFocusIn);
  wheel.addEventListener('focusout', onFocusOut);
  view.trigger?.addEventListener('click', onTrigger);

  return {
    ...controller,
    element: dialog,
    setItems(items) {
      validateItems(items, reservedKeys);
      controller.setItems(items);
    },
    destroy() {
      if (destroyed) return;
      controller.close();
      destroyed = true;
      dwell.cancel();
      unsubscribe();
      doc.removeEventListener('keydown', onKeyDown);
      doc.removeEventListener('keyup', onKeyUp);
      doc.removeEventListener('visibilitychange', onVisibilityChange);
      doc.defaultView?.removeEventListener('blur', cancelHold);
      view.remove();
    },
  };
}
