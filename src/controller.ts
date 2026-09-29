import { isGroup, validateItems } from './items.js';
import type { QController, QCoreOptions, QItem, QState } from './types.js';

export type { QController, QCoreOptions, QItem, QNavigation, QState } from './types.js';

/** Framework-independent state. Safe to import and use during SSR. */
export function createQController(options: QCoreOptions): QController {
  validateItems(options.items);
  let rootItems = options.items;
  let path: string[] = [];
  let isOpen = false;
  let activeId: string | null = null;
  const listeners = new Set<(state: QState) => void>();

  const level = (): { parent: QItem | null; items: readonly QItem[] } => {
    let parent: QItem | null = null;
    let items = rootItems;
    for (const id of path) {
      parent = items.find((item) => item.id === id) ?? null;
      items = parent?.children ?? [];
    }
    return { parent, items };
  };
  const enabled = (id: string) => level().items.find((item) => item.id === id && !item.disabled);
  const getState = (): QState => {
    const { parent, items } = level();
    return Object.freeze({
      isOpen,
      path: Object.freeze([...path]),
      parent,
      items: Object.freeze([...items]),
      activeId,
      canGoBack: path.length > 0,
    });
  };
  const emit = () => {
    const state = getState();
    for (const listener of listeners) listener(state);
  };
  const open = () => {
    if (isOpen) return;
    isOpen = true;
    path = [];
    activeId = null;
    emit();
  };
  const close = () => {
    if (!isOpen) return;
    isOpen = false;
    emit();
  };

  return {
    getState,
    subscribe(listener) {
      listeners.add(listener);
      listener(getState());
      return () => {
        listeners.delete(listener);
      };
    },
    open,
    close,
    toggle() {
      if (isOpen) close();
      else open();
    },
    highlight(id) {
      if (id !== null && !enabled(id)) return;
      if (activeId === id) return;
      activeId = id;
      emit();
    },
    select(id) {
      if (!isOpen) return;
      const item = enabled(id);
      if (!item) return;
      if (isGroup(item)) {
        path = [...path, item.id];
        activeId = null;
        emit();
        return;
      }
      const destination = Object.freeze([...path, item.id]);
      activeId = item.id;
      isOpen = false;
      emit();
      options.onNavigate?.({ item, path: destination });
    },
    back() {
      if (!path.length) return;
      path = path.slice(0, -1);
      activeId = null;
      emit();
    },
    setItems(items) {
      validateItems(items);
      rootItems = items;
      path = [];
      activeId = null;
      emit();
    },
  };
}
