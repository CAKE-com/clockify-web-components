# Developer onboarding

This guide is for contributors working on `clockify-web-components`. For consumer installation and component usage, start with [README.md](README.md) and the published docs.

## Project shape

This package is a Lit and Shoelace based web component library for Clockify-related products. It builds ESM output into `dist` with Vite library mode.

Important entry points:

- `src/index.ts` exports the full bundle and exposes build debug info on `window.CLOCKIFY_WEB_COMPONENTS_DEBUG_INFO`.
- `src/clockify-app.ts` owns global initialization for token, workspace, endpoint, user, workspace, and roles data.
- `src/components/` contains custom elements.
- `src/styles/` contains global design tokens, Shoelace overrides, and per-component CSS.
- `src/query/` adapts `@tanstack/query-core` to Lit reactive controllers.
- `src/services/` contains API, endpoint, token, workspace, localization, notification, and domain services.
- `src/docs/` is the Astro Starlight docs site.
- `vite.config.mts` controls bundle entries and output names.
- `.gitlab-ci.yml` controls build, CDN publishing, and GitLab Package Registry publishing.

## Prerequisites

- Use a modern Node version. CI currently uses `node:25`, so Node 25 is the safest local match.
- Use npm. The root package intentionally does not commit `package-lock.json`; CI installs from the dependency ranges in `package.json`.
- Have GitLab access before publishing or installing the private package from another project.
- Keep registry tokens out of commits. Use environment variables or local-only npm config for personal tokens.

## First setup

From the repo root:

```bash
npm install
npm run build
```

Useful scripts:

```bash
npm run dev          # Vite dev server for local library work
npm run dev:docs     # Install docs dependencies and start the Astro docs site
npm run docs:build   # Install docs dependencies, run astro check, and build docs
npm run build        # Build docs first, then build the component library
npm run build:debug  # Build the component library with Vite debug output
npm run test:consumer # Build, pack, install, and build a temporary consumer app
npm run serve        # Preview the built Vite output
npm run start        # Watch build output and run Vite preview [I usually use this]
```

There is no dedicated test, lint, typecheck, or local demo script at the moment. Use `npm run build` as the minimum validation command after changes. For visual testing, use a consuming app, a temporary local HTML page, or the docs site with local asset wiring if you need to inspect unpublished components.

The docs app currently loads the published CDN assets in `src/docs/astro.config.mjs`, not the local source files. If the docs preview does not show your local component changes, this is expected until you point the docs app at local build output or publish a new build.

## Runtime initialization

Consumers should call `ClockifyWebComponentsApp.init()` before rendering API-backed components:

```ts
await ClockifyWebComponentsApp.init({
  token: "TOKEN",
  workspaceId: "WORKSPACE_ID",
  endpoint: "https://api.clockify.me",
  homeUrl: "https://clockify.me",
  addon: false,
});
```

`ClockifyWebComponentsApp.init()` stores token and endpoint data, fetches user, workspace, and role data, then dispatches `clockify-app-init` on the shared `EventBus`.

API-backed components should follow the existing pattern:

- Listen for `clockify-app-init` in `connectedCallback()`.
- If the app is already initialized, apply `ClockifyWebComponentsApp.initializationData` immediately.
- If a component was given a `token` before app initialization, call `ClockifyWebComponentsApp.init()` from the component.
- Remove all global listeners in `disconnectedCallback()`.
- Re-dispatch shared `error` and `success` events from the component with `bubbles: true` and `composed: true` when consumers need to observe them.

## Component types

There are two common component styles.

Generic Shoelace wrappers extend a Shoelace component and layer Clockify theme behavior and styles on top:

```ts
class ClockifySwitch extends SlSwitch {
  firstUpdated() {
    toggleTheme(this);
  }

  updated() {
    toggleTheme(this);
  }

  static styles = [SlSwitch.styles, unsafeCSS(clockifySwitchStyles)];
}
```

Clockify-specific components usually extend `LitElement`, use services and query controllers, render Clockify workflows, and emit domain events. Examples include `clockify-project-picker`, `clockify-tags`, `clockify-custom-fields`, `clockify-billable`, and `clockify-description`.

## Creating a new component

Use this checklist when adding a component.

1. Pick a custom element tag with a hyphen, usually `clockify-something`.
2. Add `src/components/clockify-something.ts`.
3. Choose the base class: extend a Shoelace class for thin styled wrappers, or `LitElement` for custom workflows.
4. Import CSS from `src/styles/generic/` or `src/styles/special/` with `?inline` and register it in `static styles` with `unsafeCSS`.
5. Declare public attributes with `@property()` and internal reactive state with `@state()`.
6. Import any child custom elements that appear in the template.
7. Define the element with `customElements.define("clockify-something", ClockifySomething)`.
8. Export it from `src/index.ts` if it belongs in the full bundle.
9. Add a Vite library entry in `vite.config.mts` if consumers should be able to import it as a single file from `dist/components/...`.
10. Add or update component docs under `src/docs/src/content/docs/`.
11. Run `npm run build`.

## Lit quirks to watch

- Custom elements can only be defined once per browser session. Avoid loading two different builds that both define the same `clockify-*` tag.
- HTML attributes are case-insensitive. Existing public HTML-facing names use lower-case forms such as `timeentryid`, `tokenkey`, `tokensearchparam`, and `homeurl`. If you add camelCase TypeScript properties, document the HTML attribute name or configure the attribute explicitly.
- Boolean attributes are true when present and false when absent. Do not write `disabled="false"` in HTML and expect false.
- Lit only reacts to property assignments. When mutating arrays or objects in place, assign a new value or call `requestUpdate()`.
- Use `await this.updateComplete` when follow-up code depends on rendered DOM.
- Events dispatched inside a shadow root need `bubbles: true` and `composed: true` if consuming apps should hear them outside the component.
- Bound event listener references must be stable so `removeEventListener()` removes the same function that was added.
- Use `nothing` from Lit when a component should render no DOM for a branch.
- Import child components in the parent module. A tag in a template is not registered unless the module defining it has been imported somewhere.

## CSS and theming

Component CSS is split by intent:

- `src/styles/vars.css` defines Clockify design tokens.
- `src/styles/sl-overrides.css` maps Clockify tokens onto Shoelace tokens and imports the Roboto font.
- `src/styles/generic/` styles Shoelace wrapper components.
- `src/styles/special/` styles Clockify-specific components.

Most component styles are imported as inline strings:

```ts
import styles from "../styles/special/clockify-billable.css?inline";

static styles = [unsafeCSS(styles)];
```

Generic Shoelace wrappers should preserve the base Shoelace styles:

```ts
static styles = [SlSwitch.styles, unsafeCSS(clockifySwitchStyles)];
```

CSS files can use nested selectors because `postcss.config.mjs` enables `postcss-nested`; `autoprefixer` is also enabled. Prefer design tokens over hard-coded values so consumers can theme components through CSS custom properties.

Consumers usually import `dist/style.css` once. Vite emits CSS assets as `style.css`, so keep global CSS imports intentional and verify that the built output still includes the expected stylesheet.

Theme behavior is handled by `toggleTheme()` and supports `prefers-color-scheme`, a parent `data-theme="dark"` or `data-theme="light"`, and parent `dark` or `light` classes.

## Data and API patterns

- Services in `src/services/` should own URL construction, storage access, and API calls.
- `ApiService` and `RequestService` are the low-level HTTP path.
- Query hooks in `src/query/hooks/` should return `QueryController` instances for Lit components.
- Query keys should include the data dependencies that change the result, such as workspace id, endpoint, token, search text, or pagination data.
- Mutating workflows should use `MutationController` when the UI needs mutation state or invalidation-like behavior.
- Domain services should dispatch user-visible notifications through `NotificationService` when matching existing behavior.

When adding API-backed UI, keep the component responsible for rendering and events, and keep API details in services and query hooks.

## Bundling

`vite.config.mts` builds ESM library output. Current entries are:

- `dist/web-components.js` from `src/index.ts`.
- Single component entries under `dist/components/` for select, project picker, custom fields, tags, billable, and description.

The public import contract for npm consumers is:

- `clockify-web-components` for exported JavaScript APIs such as `ClockifyWebComponentsApp`.
- `clockify-web-components/dist/style.css` for the shared component stylesheet.
- `clockify-web-components/dist/web-components.js` for registering the full component bundle.
- `clockify-web-components/dist/components/clockify-select.js`
- `clockify-web-components/dist/components/clockify-project-picker.js`
- `clockify-web-components/dist/components/clockify-custom-fields.js`
- `clockify-web-components/dist/components/clockify-tags.js`
- `clockify-web-components/dist/components/clockify-billable.js`
- `clockify-web-components/dist/components/clockify-description.js`

When adding a component, decide whether it needs both full-bundle export and single-component output. A component that is only exported from `src/index.ts` is available through the full bundle, but not through a `dist/components/...` import.

The build injects package name, version, and commit hash constants. The full bundle writes them to `window.CLOCKIFY_WEB_COMPONENTS_DEBUG_INFO` for runtime diagnostics.

The published npm package currently includes only `dist/*` because of the `files` setting in `package.json`. If you add package metadata files outside `dist`, update the packaging rules before relying on them being published. `package.json` declares `customElements: "./custom-elements.json"`, but this repo does not currently generate or publish that file.

## Documentation

The docs site lives in `src/docs` and uses Astro Starlight.

Common docs tasks:

- Add special component docs under `src/docs/src/content/docs/clockify-custom-elements/Components/`.
- Update `src/docs/src/content/docs/clockify-custom-elements/index.mdx` when adding user-facing components.
- Update `src/docs/astro.config.mjs` if a new docs section should appear in the sidebar.
- Run `npm run docs:build` or `npm run build` after MDX changes.

Remember that the docs app loads CDN assets by default. If you need docs examples to use local unpublished components, change the docs asset references for local development and do not accidentally publish local-only URLs.

## Publishing

Publishing is handled by GitLab CI on the `prod` branch.

The pipeline does three things:

1. Builds the library and runs the consumer-app smoke test with `npm i -f` and `npm run test:consumer`.
2. Publishes `dist/` to the Clockify developer resources S3 bucket and invalidates CloudFront, under `validation-widget/latest/`.
3. Publishes the npm package to the GitLab Package Registry with the project registry URL.

Release checklist:

1. Make the code and docs changes.
2. Run `npm run test:consumer` locally.
3. Bump `version` in `package.json`.
4. Merge or push to `prod` according to the team release flow.
5. Confirm the GitLab pipeline passes.
6. Confirm the CDN `latest` assets and GitLab Package Registry package are available.

The package registry only accepts new versions. If the publish job fails because the version already exists, bump the package version and rerun the release through the normal branch flow.

For consumers, the package is installed from the public npm registry with `npm install clockify-web-components`; no authentication is required.

## Troubleshooting

- `npm install` fails with 401 or 403: check GitLab registry access and npm auth configuration.
- Component renders unstyled: confirm `dist/style.css` is imported once and the component module is imported.
- Theme looks wrong: inspect parent `data-theme`, `dark`, or `light` values and verify `toggleTheme()` runs for the component.
- Event is not observed by the host app: confirm the event is dispatched with `bubbles: true` and `composed: true`.
- API-backed component never loads data: check `ClockifyWebComponentsApp.init()`, token, endpoint, workspace id, and query `enabled` conditions.
- Docs preview shows old behavior: the docs app is probably loading the published CDN bundle.
- Duplicate custom element definition error: make sure the page is not loading both CDN and local builds for the same tags.
- Package metadata is missing after install: verify the file is in `dist` or included by the `files` rule before publishing.