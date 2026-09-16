# Contributing

Keep changes small, offline by default, and safe for unrelated Git projects.
Every new lifecycle invariant needs an observable behavior-level test. Do not
introduce runtime dependencies without a documented dependency and license
review. Run `npm test` and `npm run check` before proposing a change.

Do not commit from this directory until it is initialized as its own Git
repository. It is currently nested beneath a broader user-level Git root.
