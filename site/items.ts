import type { QItem } from '@ziran/q';

/** What a leaf does when chosen: show a page, or restyle the site. */
export type Destination = { readonly view: string } | { readonly theme: string };

const page = (id: string, label: string, icon: string, description: string): QItem => ({
  id,
  label,
  icon,
  description,
  data: { view: id } satisfies Destination,
});

const theme = (id: string, label: string, description: string): QItem => ({
  id: `theme-${id}`,
  label,
  icon: '◐',
  description,
  data: { theme: id } satisfies Destination,
});

/** A page of the example app. Every one of them is drawn by the same view. */
const place = (id: string, label: string, children?: readonly string[]): QItem => ({
  id,
  label,
  icon: children ? '◔' : '●',
  description: children ? children.join(', ') : 'A page of the example app.',
  ...(children
    ? { children: children.map((child) => place(`${id}-${child.toLowerCase()}`, child)) }
    : { data: { view: 'place' } satisfies Destination }),
});

export const items: readonly QItem[] = [
  page('home', 'Home', '⌂', 'What q is and three ways to use it.'),
  page('start', 'Get started', '↓', 'Install q and mount your first wheel.'),
  page('controls', 'Controls', '⌨', 'Every key and every pointer gesture.'),
  {
    id: 'reference',
    label: 'Reference',
    icon: '≡',
    description: 'Items, options, instance, headless, browsers.',
    children: [
      page('items', 'Items', '◇', 'The tree of destinations and groups.'),
      page('options', 'Options', '⚙', 'Everything createQ accepts.'),
      page('instance', 'Instance', '▣', 'Methods and state of a wheel.'),
      page('headless', 'Headless', '○', 'The state without the DOM.'),
      page('browsers', 'Browsers', '◎', 'Support and accessibility.'),
    ],
  },
  page('theming', 'Theming', '◐', 'Restyle the wheel with CSS variables.'),
  {
    id: 'playground',
    label: 'Playground',
    icon: '✦',
    description: 'Themes, timing and a deep tree to try.',
    children: [
      {
        id: 'theme',
        label: 'Theme',
        icon: '◐',
        description: 'Restyle the wheel and this site.',
        children: [
          theme('board', 'Board', 'Grey plastic, ink legends.'),
          theme('cobalt', 'Cobalt', 'Blue all over.'),
          theme('night', 'Night', 'Lights off.'),
        ],
      },
      page('timing', 'Timing', '◷', 'Tune how long the pointer has to rest.'),
      {
        id: 'example',
        label: 'Example app',
        icon: '❖',
        description: 'A tree four levels deep.',
        children: [
          place('shop', 'Shop', ['Cart', 'Orders', 'Wishlist']),
          place('docs', 'Docs', ['Guides', 'Reference', 'Changelog']),
          place('team', 'Team', ['People', 'Roles']),
          place('inbox', 'Inbox'),
        ],
      },
    ],
  },
];
