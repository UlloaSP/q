# Contributing

## Developer setup

Use Node.js 24 and npm.

```bash
npm ci
npm run dev     # the site at http://localhost:5173
npm run check   # format, lint, types, tests and build
```

[AGENTS.md](./AGENTS.md) explains where the code lives and what q will not compromise on. Read it, agent or not.

## Read this first

q is early and small, and the plan is to keep it small.

You can report a bug or open a PR. Please do it knowing that it may be closed, shrunk or reimplemented in a different way.

## What is most likely to be accepted

Small, focused bug fixes.

Accessibility fixes.

Fixes for a keyboard layout, a browser or an input device that behaves differently.

## What is least likely to be accepted

Large PRs.

New options. Most of them should be a CSS variable or a custom renderer.

Runtime dependencies or build steps.

Anything that needs two hands.

## If you still want to open a PR

Keep it small.

Explain what changed and why it should exist.

Do not mix unrelated fixes.

If it changes how the wheel looks, include before and after images.

If it changes motion, timing or interaction, include a short video.

Add a test for behavior a user can observe.

If it changes how q is used, update the page of the site that documents it. There is no separate documentation.

## Discuss changes first

For anything that is not a small fix, open an issue before writing code. It will save you time.

## Releasing

Maintainers publish by creating a GitHub release. The tag is the version: `v0.2.0` publishes `@ziran/q@0.2.0` through npm trusted publishing. There is nothing to run locally.
