import { describe, expect, it, vi } from 'vite-plus/test';
import { createQController } from '../src/controller.js';
import type { QItem } from '../src/types.js';

const items: readonly QItem[] = [
  {
    id: 'projects',
    label: 'Projects',
    children: [
      { id: 'atlas', label: 'Atlas', children: [{ id: 'overview', label: 'Overview' }] },
      { id: 'studio', label: 'Studio' },
    ],
  },
  { id: 'notes', label: 'Notes' },
  { id: 'disabled', label: 'Disabled', disabled: true },
];

describe('headless navigation', () => {
  it('explores nested groups, commits with the full path, and reopens at the root', () => {
    const onNavigate = vi.fn();
    const q = createQController({ items, onNavigate });
    q.open();
    q.select('projects');
    q.select('atlas');
    q.highlight('overview');
    expect(q.getState()).toMatchObject({
      isOpen: true,
      path: ['projects', 'atlas'],
      activeId: 'overview',
    });
    expect(onNavigate).not.toHaveBeenCalled();
    q.select('overview');
    expect(onNavigate).toHaveBeenCalledWith({
      item: items[0]?.children?.[0]?.children?.[0],
      path: ['projects', 'atlas', 'overview'],
    });
    expect(q.getState().isOpen).toBe(false);
    q.open();
    expect(q.getState().path).toEqual([]);
    expect(q.getState().activeId).toBeNull();
  });
  it('goes back through levels without navigating', () => {
    const onNavigate = vi.fn();
    const q = createQController({ items, onNavigate });
    q.open();
    q.select('projects');
    q.select('atlas');
    q.back();
    expect(q.getState().path).toEqual(['projects']);
    q.back();
    q.back();
    expect(q.getState().canGoBack).toBe(false);
    expect(onNavigate).not.toHaveBeenCalled();
  });
  it('ignores disabled, unknown, and closed selections', () => {
    const onNavigate = vi.fn();
    const q = createQController({ items, onNavigate });
    q.select('notes');
    q.open();
    q.select('disabled');
    q.select('unknown');
    q.highlight('disabled');
    expect(onNavigate).not.toHaveBeenCalled();
    expect(q.getState().activeId).toBeNull();
  });
  it('resets exploration when the tree changes', () => {
    const q = createQController({ items });
    q.open();
    q.select('projects');
    q.highlight('studio');
    q.setItems([{ id: 'new', label: 'New' }]);
    expect(q.getState()).toMatchObject({
      isOpen: true,
      path: [],
      activeId: null,
      canGoBack: false,
    });
    expect(q.getState().items[0]?.id).toBe('new');
  });
  it('provides immutable snapshots and unsubscribes', () => {
    const q = createQController({ items });
    const listener = vi.fn();
    const unsubscribe = q.subscribe(listener);
    const before = q.getState();
    q.open();
    unsubscribe();
    q.close();
    expect(listener).toHaveBeenCalledTimes(2);
    expect(before.isOpen).toBe(false);
    expect(Object.isFrozen(before.path)).toBe(true);
    expect(Object.isFrozen(before.items)).toBe(true);
  });
  it('validates the tree and rejects invalid updates atomically', () => {
    expect(() =>
      createQController({
        items: [{ id: 'a', label: 'A', children: [{ id: 'a', label: 'Duplicate' }] }],
      }),
    ).toThrow('duplicate');
    expect(() => createQController({ items: [{ id: 'a', label: '' }] })).toThrow('label');
    expect(() =>
      createQController({
        items: [
          { id: 'a', label: 'A', hotkey: 'x' },
          { id: 'b', label: 'B', hotkey: 'X' },
        ],
      }),
    ).toThrow('hotkey');
    expect(() =>
      createQController({
        items: [{ id: 'a', label: 'A', href: '/', children: [{ id: 'b', label: 'B' }] }],
      }),
    ).toThrow('children and href');
    const q = createQController({ items });
    expect(() => q.setItems([{ id: '', label: 'Bad' }])).toThrow();
    expect(q.getState().items).toEqual(items);
  });
});
