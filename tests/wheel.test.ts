import { afterEach, beforeEach, describe, expect, it, vi } from 'vite-plus/test';
import { createQ } from '../src/wheel.js';
import type { QInstance, QItem } from '../src/types.js';

const items: readonly QItem[] = [
  {
    id: 'projects',
    label: 'Projects',
    hotkey: 'p',
    children: [{ id: 'atlas', label: 'Atlas', description: 'Your project', hotkey: 'a' }],
  },
  { id: 'notes', label: 'Notes', hotkey: 'n', description: 'Your notes' },
  { id: 'disabled', label: 'Disabled', disabled: true },
];
const deep: readonly QItem[] = [
  {
    id: 'one',
    label: 'One',
    children: [{ id: 'two', label: 'Two', children: [{ id: 'leaf', label: 'Leaf' }] }],
  },
];

let q: QInstance | undefined;
const key = (value: string, init: KeyboardEventInit = {}, target: EventTarget = document) =>
  target.dispatchEvent(
    new KeyboardEvent('keydown', { key: value, bubbles: true, cancelable: true, ...init }),
  );
const release = () => document.dispatchEvent(new KeyboardEvent('keyup', { key: 'q' }));
const slot = (id: string) => {
  const node = q?.element.querySelector<HTMLButtonElement>(`[data-q-id="${id}"]`);
  if (!node) throw new Error(`Missing slot ${id}`);
  return node;
};
const back = () => q!.element.querySelector<HTMLButtonElement>('.q-back')!;
const wheel = () => q!.element.querySelector<HTMLElement>('.q-wheel')!;
const pointer = (target: Element, x: number, type = 'pointermove') =>
  target.dispatchEvent(new MouseEvent(type, { bubbles: true, clientX: x, clientY: 0 }));
/** Slots ignore a pointer until it travels, so a hover is an arrival followed by movement. */
const hover = (target: Element) => {
  pointer(target, 0, 'pointerover');
  pointer(target, 40);
};
const leave = () => wheel().dispatchEvent(new MouseEvent('pointerleave'));

beforeEach(() => {
  // jsdom lacks the native dialog methods.
  Object.defineProperty(HTMLDialogElement.prototype, 'showModal', {
    configurable: true,
    value: function (this: HTMLDialogElement) {
      this.open = true;
      this.querySelector<HTMLButtonElement>('.q-slot')?.focus();
    },
  });
  Object.defineProperty(HTMLDialogElement.prototype, 'close', {
    configurable: true,
    value: function (this: HTMLDialogElement) {
      this.open = false;
    },
  });
  vi.useFakeTimers();
});
afterEach(() => {
  q?.destroy();
  q = undefined;
  document.body.replaceChildren();
  vi.useRealTimers();
});

describe('holding the trigger', () => {
  it('opens neutral, previews the hovered leaf, and navigates on release', () => {
    const onNavigate = vi.fn();
    q = createQ({ items, onNavigate });
    key('q');
    expect(q.element.open).toBe(true);
    expect(q.getState().activeId).toBeNull();
    hover(slot('notes'));
    expect(q.getState().activeId).toBe('notes');
    expect(q.element.querySelector('.q-center-description')?.textContent).toBe('Your notes');
    vi.advanceTimersByTime(10_000);
    expect(onNavigate).not.toHaveBeenCalled();
    release();
    expect(onNavigate).toHaveBeenCalledWith({ item: items[1], path: ['notes'] });
    expect(q.element.open).toBe(false);
  });

  it('cancels when released after a real hold with nothing picked', () => {
    const onNavigate = vi.fn();
    q = createQ({ items, onNavigate });
    key('q');
    hover(slot('notes'));
    leave();
    vi.advanceTimersByTime(300);
    release();
    expect(q.element.open).toBe(false);
    expect(onNavigate).not.toHaveBeenCalled();
  });

  it('stays open after a quick tap, and the trigger closes it again', () => {
    q = createQ({ items });
    key('q');
    vi.advanceTimersByTime(100);
    release();
    expect(q.element.open).toBe(true);
    key('q');
    release();
    expect(q.element.open).toBe(false);
  });

  it('enters the group under the pointer on release and keeps the wheel open', () => {
    q = createQ({ items });
    key('q');
    hover(slot('projects'));
    release();
    expect(q.getState().path).toEqual(['projects']);
    expect(q.element.open).toBe(true);
  });

  it('cancels when the window loses focus and ignores the later release', () => {
    const onNavigate = vi.fn();
    q = createQ({ items, onNavigate });
    key('q');
    hover(slot('notes'));
    window.dispatchEvent(new Event('blur'));
    expect(q.element.open).toBe(false);
    release();
    expect(onNavigate).not.toHaveBeenCalled();
  });

  it('always opens at the root', () => {
    q = createQ({ items });
    key('q');
    key('p');
    key('Escape');
    key('q');
    expect(q.getState().path).toEqual([]);
  });
});

describe('keys', () => {
  it('acts on hotkeys at once: groups open and leaves navigate', () => {
    const onNavigate = vi.fn();
    q = createQ({ items, onNavigate });
    key('n');
    expect(onNavigate).not.toHaveBeenCalled();
    key('q');
    key('p');
    expect(q.getState().path).toEqual(['projects']);
    key('a');
    expect(onNavigate).toHaveBeenCalledWith(
      expect.objectContaining({ path: ['projects', 'atlas'] }),
    );
    expect(q.element.open).toBe(false);
    release();
    expect(onNavigate).toHaveBeenCalledOnce();
  });

  it('assigns free left-hand keys around explicit hotkeys', () => {
    q = createQ({
      items: [
        { id: 'a', label: 'A', hotkey: '1' },
        { id: 'b', label: 'B' },
        { id: 'c', label: 'C' },
      ],
    });
    expect(slot('a').getAttribute('aria-keyshortcuts')).toBe('1');
    expect(slot('b').getAttribute('aria-keyshortcuts')).toBe('2');
    expect(slot('c').getAttribute('aria-keyshortcuts')).toBe('3');
  });

  it('goes back with Space and Backspace', () => {
    q = createQ({ items: deep });
    key('q');
    key('1');
    key('1');
    expect(q.getState().path).toEqual(['one', 'two']);
    key(' ');
    expect(q.getState().path).toEqual(['one']);
    key('Backspace');
    expect(q.getState().path).toEqual([]);
  });

  it('moves through enabled slots and Back with the arrows', () => {
    q = createQ({ items });
    q.open();
    key('ArrowRight');
    expect(document.activeElement).toBe(slot('projects'));
    expect(q.getState().activeId).toBe('projects');
    key('ArrowRight');
    expect(q.getState().activeId).toBe('notes');
    key('ArrowRight');
    expect(q.getState().activeId).toBe('projects');
    key('p');
    key('ArrowLeft');
    expect(document.activeElement).toBe(back());
    expect(back().dataset.active).toBe('true');
    key('ArrowLeft');
    expect(q.getState().activeId).toBe('atlas');
  });

  it('continues with the arrows from the slot under the pointer', () => {
    q = createQ({ items });
    q.open();
    hover(slot('notes'));
    key('ArrowLeft');
    expect(q.getState().activeId).toBe('projects');
  });

  it('confirms the highlighted slot with Enter', () => {
    const onNavigate = vi.fn();
    q = createQ({ items, onNavigate });
    q.open();
    hover(slot('notes'));
    key('Enter');
    expect(onNavigate).toHaveBeenCalledOnce();
  });

  it('leaves Enter and Space to a slot that holds the focus', () => {
    q = createQ({ items });
    q.open();
    key('p');
    key('ArrowRight');
    const event = new KeyboardEvent('keydown', { key: ' ', bubbles: true, cancelable: true });
    slot('atlas').dispatchEvent(event);
    expect(event.defaultPrevented).toBe(false);
    expect(q.getState().path).toEqual(['projects']);
  });

  it('leaves typing, shortcuts, key repeat, and IME composition alone', () => {
    q = createQ({ items });
    const input = document.createElement('input');
    const editable = document.createElement('div');
    editable.setAttribute('contenteditable', 'true');
    document.body.append(input, editable);
    key('q', {}, input);
    key('q', {}, editable);
    for (const flags of [
      { ctrlKey: true },
      { metaKey: true },
      { altKey: true },
      { repeat: true },
      { isComposing: true },
    ])
      key('q', flags);
    expect(q.element.open).toBe(false);
  });

  it('rejects reserved and malformed keys', () => {
    expect(() => createQ({ items: [{ id: 'a', label: 'A', hotkey: 'q' }] })).toThrow('reserved');
    expect(() => createQ({ items: [{ id: 'a', label: 'A', hotkey: 'x' }], backKey: 'x' })).toThrow(
      'reserved',
    );
    expect(() => createQ({ items, triggerKey: 'qq' })).toThrow('single character');
    expect(() => createQ({ items, backKey: 'q' })).toThrow('backKey');
  });
});

describe('pointer', () => {
  it('opens a group after the pointer rests on it, and shows the wait', () => {
    q = createQ({ items, expandDelay: 400 });
    key('q');
    hover(slot('projects'));
    expect(slot('projects').dataset.dwelling).toBe('true');
    expect(slot('projects').style.getPropertyValue('--q-dwell')).toBe('400ms');
    vi.advanceTimersByTime(399);
    expect(q.getState().path).toEqual([]);
    vi.advanceTimersByTime(1);
    expect(q.getState().path).toEqual(['projects']);
    expect(q.element.querySelector('[data-dwelling]')).toBeNull();
  });

  it('cancels the wait when the pointer leaves or the keyboard takes over', () => {
    q = createQ({ items, expandDelay: 400 });
    key('q');
    hover(slot('projects'));
    hover(slot('notes'));
    expect(slot('projects').dataset.dwelling).toBeUndefined();
    hover(slot('projects'));
    key('ArrowRight');
    vi.advanceTimersByTime(1000);
    expect(q.getState().path).toEqual([]);
  });

  it('goes back after resting on Back', () => {
    q = createQ({ items, backDelay: 300 });
    key('q');
    key('p');
    hover(back());
    expect(q.element.querySelector('.q-center-title')?.textContent).toBe('Back');
    vi.advanceTimersByTime(300);
    expect(q.getState().path).toEqual([]);
  });

  it('ignores slots that appear under a resting pointer', () => {
    const onNavigate = vi.fn();
    q = createQ({ items: deep, expandDelay: 100, onNavigate });
    key('q');
    pointer(slot('one'), 0, 'pointerover');
    expect(q.getState().activeId).toBeNull();
    pointer(slot('one'), 40);
    vi.advanceTimersByTime(100);
    expect(q.getState().path).toEqual(['one']);
    pointer(slot('two'), 40, 'pointerover');
    pointer(slot('two'), 45);
    vi.advanceTimersByTime(1000);
    expect(q.getState().path).toEqual(['one']);
    pointer(slot('two'), 60);
    vi.advanceTimersByTime(100);
    expect(q.getState().path).toEqual(['one', 'two']);
  });

  it('ignores touch hover', () => {
    q = createQ({ items });
    q.open();
    const touch = new MouseEvent('pointermove', { bubbles: true, clientX: 40 });
    Object.assign(touch, { pointerType: 'touch' });
    pointer(slot('notes'), 0, 'pointerover');
    slot('notes').dispatchEvent(touch);
    expect(q.getState().activeId).toBeNull();
  });

  it('navigates on click, held or not', () => {
    const onNavigate = vi.fn();
    q = createQ({ items, onNavigate });
    key('q');
    slot('projects').click();
    expect(q.getState().path).toEqual(['projects']);
    slot('atlas').click();
    expect(onNavigate).toHaveBeenCalledOnce();
    expect(slot('atlas').dataset.selected).toBe('true');
    q.open();
    slot('disabled').click();
    slot('notes').click();
    expect(onNavigate).toHaveBeenCalledTimes(2);
  });

  it('goes back on right click, and closes from the root', () => {
    q = createQ({ items });
    q.open();
    key('p');
    const menu = () => new MouseEvent('contextmenu', { bubbles: true, cancelable: true });
    const first = menu();
    wheel().dispatchEvent(first);
    expect(first.defaultPrevented).toBe(true);
    expect(q.getState()).toMatchObject({ path: [], isOpen: true });
    wheel().dispatchEvent(menu());
    expect(q.element.open).toBe(false);
  });

  it('closes on a backdrop click', () => {
    q = createQ({ items });
    q.open();
    q.element.click();
    expect(q.element.open).toBe(false);
  });

  it('opens from the corner trigger, which can be left out', () => {
    q = createQ({ items });
    document.querySelector<HTMLButtonElement>('.q-trigger')?.click();
    expect(q.element.open).toBe(true);
    q.destroy();
    expect(document.querySelector('.q-trigger')).toBeNull();
    q = createQ({ items, trigger: false });
    expect(document.querySelector('.q-trigger')).toBeNull();
  });
});

describe('rendering and lifecycle', () => {
  it('lays out Back at the top of nested levels only', () => {
    q = createQ({ items });
    q.open();
    expect(back().hidden).toBe(true);
    key('p');
    expect(back().hidden).toBe(false);
    expect(wheel().dataset.motion).toBe('in');
    back().click();
    expect(q.getState().path).toEqual([]);
    expect(wheel().dataset.motion).toBe('out');
  });

  it('renders text safely and accepts custom content', () => {
    q = createQ({
      items: [{ id: 'a', label: '<img src=x>' }],
      renderItem: (item) => document.createTextNode(`Custom ${item.id}`),
      renderCenter: () => document.createTextNode('Custom center'),
    });
    q.open();
    expect(q.element.querySelector('img')).toBeNull();
    expect(slot('a').textContent).toBe('Custom a');
    expect(q.element.querySelector('.q-center')?.textContent).toBe('Custom center');
  });

  it('restores the focus it took', () => {
    const button = document.createElement('button');
    document.body.append(button);
    button.focus();
    q = createQ({ items });
    key('q');
    key('n');
    expect(document.activeElement).toBe(button);
  });

  it('guards typing inside the document it is mounted in', () => {
    const iframe = document.createElement('iframe');
    document.body.append(iframe);
    const frame = iframe.contentDocument!;
    frame.defaultView!.HTMLDialogElement.prototype.showModal = function () {
      this.open = true;
    };
    const input = frame.createElement('input');
    frame.body.append(input);
    q = createQ({ items, target: frame.body });
    key('q', {}, input);
    expect(q.element.open).toBe(false);
    expect(q.element.ownerDocument).toBe(frame);
  });

  it('drops a pending selection when the tree is replaced', () => {
    const onNavigate = vi.fn();
    q = createQ({ items, onNavigate });
    key('q');
    hover(slot('notes'));
    q.setItems([{ id: 'new', label: 'New' }]);
    vi.advanceTimersByTime(300);
    release();
    expect(onNavigate).not.toHaveBeenCalled();
    expect(() => q?.setItems([{ id: 'bad', label: 'Bad', hotkey: 'q' }])).toThrow('reserved');
  });

  it('removes its DOM and listeners on destroy', () => {
    q = createQ({ items });
    const root = q.element;
    q.destroy();
    q.destroy();
    key('q');
    expect(root.isConnected).toBe(false);
    expect(q.getState().isOpen).toBe(false);
  });
});
