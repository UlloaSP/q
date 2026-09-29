# q

q is a navigation wheel for the web. Hold **Q**, point at a destination, and let go.

It replaces the navbar, the sidebar and the hamburger with one radial menu that opens in the middle of the screen. It works with one hand on the keyboard, with only a mouse, or with both. No framework and no runtime dependencies.

## "Why Q?"

Because almost nothing binds it. Browsers and operating systems leave a bare Q alone, and it sits under your left hand with the number row and `W` `E` `R` right next to it. You can change the key if you disagree.

## Installation

```bash
npm install @ziran/q
```

## Usage

```ts
import { createQ } from '@ziran/q';
import '@ziran/q/styles.css';

const q = createQ({
  items: [
    { id: 'home', label: 'Home', href: '/' },
    {
      id: 'projects',
      label: 'Projects',
      description: 'Everything in motion.',
      children: [
        { id: 'atlas', label: 'Atlas', href: '/projects/atlas' },
        { id: 'orbit', label: 'Orbit', href: '/projects/orbit' },
      ],
    },
  ],
  // Leave this out and q follows each href.
  onNavigate: ({ item, path }) => router.push(item.href),
});

// When the page or component goes away:
q.destroy();
```

Importing the package is safe on the server. Call `createQ` in the browser, once per document.

## Documentation

The site is the landing page, the documentation and the playground at once, and it is navigated with q itself: [ulloasp.github.io/q](https://ulloasp.github.io/q/).

- [Get started](https://ulloasp.github.io/q/#start)
- [Controls](https://ulloasp.github.io/q/#controls)
- Reference: [items](https://ulloasp.github.io/q/#items) · [options](https://ulloasp.github.io/q/#options) · [instance](https://ulloasp.github.io/q/#instance) · [headless](https://ulloasp.github.io/q/#headless) · [browsers and accessibility](https://ulloasp.github.io/q/#browsers)
- [Theming](https://ulloasp.github.io/q/#theming)
- [Timing playground](https://ulloasp.github.io/q/#timing)

To run it locally:

```bash
npm ci
npm run dev
```

## Controls

| Input                       | What happens                              |
| --------------------------- | ----------------------------------------- |
| Hold `Q`                    | Opens. Release on a slot to go there      |
| Tap `Q`                     | Opens and stays open. Tap again to close  |
| A slot's key                | Goes to that slot, or opens that group    |
| `Space` or `Backspace`      | Back one level                            |
| Arrow keys, `Enter`, `Esc`  | Move around the ring, confirm, close      |
| Corner button               | Opens and stays open, for mouse and touch |
| Click or tap a slot         | Goes to that slot, or opens that group    |
| Rest the pointer on a group | Opens it                                  |
| Right click                 | Back one level. At the top level, closes  |

## Some notes

This is very early. Expect bugs.

q needs a browser with `<dialog>` and Pointer Events. The closing animation needs `@starting-style`; browsers without it close the wheel instantly.

Motion is off for anyone who asks for reduced motion.

## If you want to contribute

Read [CONTRIBUTING.md](./CONTRIBUTING.md) before opening an issue or a PR. Agents start at [AGENTS.md](./AGENTS.md).

Licensed under [MIT](./LICENSE).
