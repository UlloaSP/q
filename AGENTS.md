# q

q is a radial navigation wheel for the web, published as `@ziran/q`. A user holds Q, points at a destination and lets go. It is meant to be the only navigation an app needs.

It is a small TypeScript library with no runtime dependencies and no framework, plus a site that is navigated with the wheel itself.

## What makes q special?

Here is what we can never compromise on.

### 1. One hand is enough

Everything the wheel does is reachable with the left hand around Q: open, choose, go back, close. When you add a behavior, give it a key that hand can reach. A feature that needs the right hand or the mouse is not finished.

### 2. The mouse is enough too

Everything is also reachable with only a pointer, and with touch. Hover is a shortcut on top of click, never the only way.

### 3. The same input always does the same thing

The wheel opens at the top level every time, keys are assigned in a fixed order, and nothing moves under a resting pointer. People build muscle memory on this. Do not add state that survives between openings.

### 4. It feels instant

The wheel is opened dozens of times a day. Animations answer an action, last 200 ms or less, and only touch `opacity`, `scale` and `translate`. No blur, no animated layout. Reduced motion turns all of it off.

### 5. Small

No runtime dependencies. No build step for styles. Do not introduce machinery because it looks impressive. If an option can be a CSS variable, it is not a JavaScript option.

## A small glossary

- **wheel** is the whole component: the dialog, the ring and the center.
- **slot** is one segment of the ring. A slot is a destination or a group.
- **group** is a slot with children. Choosing it opens a level.
- **level** is the set of slots shown at once.
- **Back** is the slot at the top of every level except the first.
- **hold** is opening the wheel by keeping the trigger down. Releasing confirms the highlighted slot.
- **tap** is a press shorter than `tapThreshold`. The wheel stays open.
- **dwell** is resting the pointer on a group or on Back until it opens.
- **gate** is the rule that new slots ignore the pointer until it moves.
- **trigger** is the key that opens the wheel, and also the corner button.

## Where code lives

- `src/controller.ts` is the state: open, path, highlight. No DOM. It is the `@ziran/q/headless` entry and must import in Node.
- `src/items.ts` validates the tree and assigns keys.
- `src/wheel.ts` is `createQ`: it turns keyboard, pointer and focus events into controller calls. Interaction rules live here.
- `src/view.ts` builds and updates the DOM. It decides nothing.
- `src/geometry.ts` is the math for slots, hit areas and the dwell arc.
- `src/dwell.ts` is the dwell timer and the gate.
- `src/styles.css` is plain CSS, copied to `dist` as is. Everything is scoped to `.q-root` and `.q-trigger`.
- `site/` is the landing page, the documentation and the playground, all in one page. It imports the library from `src`.
- `tests/` has one file per concern: the controller, and the wheel in jsdom.

## Hit every input

The most common defect here is a change that works for the input you tried and is missing for the others. Before calling interaction work done, walk this list:

- **Hold and tap.** They share code but end differently.
- **Keys, pointer, touch.** Touch has no hover.
- **The first level and nested levels.** Back only exists in the second.
- **Arrow keys after hover, and hover after arrow keys.** Focus and highlight are separate things.
- **Reverse states.** If you added a way in, add the way out.
- **Docs.** The site documents every key, option and method. Change it with the behavior.

## Verifying

- `vp test run tests/<file>` for the tests you touched. `npm run check` before a PR.
- Test behavior a user can observe. Do not assert markup or mirror the implementation.
- jsdom has no layout, no real `<dialog>` and no focus events in the background. Anything about animation, focus or hit areas needs a pass in a real browser: `npm run dev`, then use the site.
- Timers are faked in tests. A test that needs a real wait is wrong.

## Style

- Match the code around you. Short functions, inferred types, no `any`.
- Comments explain why, or a trap. They do not narrate.
- Text the user reads says what will happen, in plain words.

## Pull requests

- Never open a PR unless the developer asks.
- Conventional commit titles in plain language: `fix(wheel): tap no longer closes on slow keyboards`.
- One concern per PR. If the description says "also", split it.
- Changes to motion or timing need a short video. Other visual changes need before and after images. Upload them to the PR; never commit them.

## Documentation

Most changes do not need documentation. The code and the tests are the record.

- The site is the documentation. There is no `docs` folder and there will not be one. When how to use q changes, update the page in `site/index.html` that covers it.
- The README is the short version: what q is, how to install it, the main controls, and links to the site.
- The site has no menu. Its pages are the leaves of the wheel in `site/items.ts`, and the hash of a page is the ID of its item. A new page needs both the item and the section.
- Every page works with plain links, the browser's back button and no JavaScript. Keep it that way.
- Do not add files that list features, narrate control flow or summarize a PR.
- Do not commit plans, notes or scratch files.
