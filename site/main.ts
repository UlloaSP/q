import { createQ } from '@ziran/q';
import type { QInstance, QItem, QNavigation } from '@ziran/q';
import '@ziran/q/styles.css';
import './style.css';
import { items } from './items.ts';
import type { Destination } from './items.ts';

interface Route {
  readonly view: string;
  readonly title: string;
  readonly trail: string;
}

const find = <T extends Element>(selector: string): T => {
  const node = document.querySelector<T>(selector);
  if (!node) throw new Error(`Missing ${selector}`);
  return node;
};

/** Every leaf that shows a page is a route, addressed by its item ID in the hash. */
const routes = new Map<string, Route>();
const collect = (level: readonly QItem[], labels: readonly string[]) => {
  for (const item of level) {
    const trail = [...labels, item.label];
    const destination = item.data as Destination | undefined;
    if (item.children) collect(item.children, trail);
    else if (destination && 'view' in destination)
      routes.set(item.id, { view: destination.view, title: item.label, trail: trail.join(' / ') });
  }
};
collect(items, []);

const views = [...document.querySelectorAll<HTMLElement>('.view')];
const whereabouts = find<HTMLElement>('#location');
const dials = find<HTMLFormElement>('#dials');
const keycap = find<HTMLButtonElement>('#keycap');
const home = routes.get('home')!;

function show({ view, title, trail }: Route, moveFocus: boolean): void {
  for (const section of views) section.hidden = section.id !== view;
  whereabouts.textContent = trail;
  document.title = view === 'home' ? 'q' : `${title} | q`;
  find('#place-title').textContent = title;
  find('#place-path').textContent = trail;
  window.scrollTo(0, 0);
  // Screen readers and the Tab key continue from the new page, not from where the wheel was opened.
  if (moveFocus) find<HTMLElement>(`#${view} h1`).focus({ preventScroll: true });
}

const current = () => routes.get(window.location.hash.slice(1)) ?? home;

function navigate({ item }: QNavigation): void {
  const destination = item.data as Destination;
  if ('theme' in destination) {
    document.documentElement.dataset.theme = destination.theme;
    localStorage.setItem('q-theme', destination.theme);
    return;
  }
  if (window.location.hash === `#${item.id}`) show(current(), true);
  else window.location.hash = item.id;
}

const dial = (name: string) => Number(find<HTMLInputElement>(`#${name}`).value);
let q: QInstance | undefined;

function mount(): void {
  q?.destroy();
  q = createQ({
    items,
    label: 'Site navigation',
    expandDelay: dial('expandDelay'),
    backDelay: dial('backDelay'),
    tapThreshold: dial('tapThreshold'),
    onNavigate: navigate,
  });
  // The big key goes down for as long as the wheel is open.
  q.subscribe((state) => keycap.classList.toggle('is-down', state.isOpen));
}

function readDials(): void {
  for (const output of dials.querySelectorAll('output'))
    output.value = `${dial(output.htmlFor.value)} ms`;
}

document.documentElement.dataset.theme = localStorage.getItem('q-theme') ?? 'board';
window.addEventListener('hashchange', () => show(current(), true));
dials.addEventListener('input', readDials);
dials.addEventListener('change', mount);
keycap.addEventListener('click', () => q?.open());

readDials();
mount();
show(current(), false);

if (import.meta.hot) import.meta.hot.dispose(() => q?.destroy());
