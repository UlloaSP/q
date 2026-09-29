import type { QItem } from './types.js';

/** Reachable with the hand that holds Q. */
const AUTO_KEYS = '1 2 3 4 5 w e r a s d f z x c v'.split(' ');

export const isGroup = (item: QItem): boolean => Boolean(item.children?.length);

export function validateItems(items: readonly QItem[], reservedKeys: readonly string[] = []): void {
  const ids = new Set<string>();
  const visit = (siblings: readonly QItem[]) => {
    const keys = new Set<string>();
    for (const item of siblings) {
      if (!item.id || ids.has(item.id))
        throw new Error(`q: duplicate or empty item ID "${item.id}".`);
      ids.add(item.id);
      if (!item.label.trim()) throw new Error(`q: item "${item.id}" needs a label.`);
      if (isGroup(item) && item.href)
        throw new Error(`q: "${item.id}" cannot have both children and href.`);
      if (item.hotkey !== undefined) {
        const key = item.hotkey.toLowerCase();
        if (key.length !== 1 || !key.trim() || keys.has(key))
          throw new Error(`q: invalid or duplicate hotkey "${item.hotkey}".`);
        if (reservedKeys.includes(key)) throw new Error(`q: hotkey "${item.hotkey}" is reserved.`);
        keys.add(key);
      }
      if (item.children) visit(item.children);
    }
  };
  visit(items);
}

/** Maps item IDs to keys. Explicit hotkeys win; the rest take the next free automatic key. */
export function assignKeys(
  items: readonly QItem[],
  reservedKeys: readonly string[],
): Map<string, string> {
  const taken = new Set(reservedKeys);
  for (const item of items) if (item.hotkey) taken.add(item.hotkey.toLowerCase());
  const free = AUTO_KEYS.filter((key) => !taken.has(key));
  const keys = new Map<string, string>();
  for (const item of items) {
    const key = item.hotkey?.toLowerCase() ?? free.shift();
    if (key) keys.set(item.id, key);
  }
  return keys;
}
