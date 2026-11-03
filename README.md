# web-components

Web components library for Clockify-related products.

## Developer onboarding

New contributors should start with [DEVELOPMENT.md](DEVELOPMENT.md) for local setup, component patterns, Lit and CSS conventions, bundling, docs, and GitLab publishing.

## Getting started

You can load the components from the CDN or install them via npm.

### CDN (quickest)

1) Include the base stylesheet:

```html
<link rel="stylesheet" href="https://resources.developer.clockify.me/validation-widget/latest/style.css" />
```

2) Load all components, or just the ones you need:

```html
<script type="module" src="https://resources.developer.clockify.me/validation-widget/latest/web-components.js"></script>
<!-- or single component -->
<script type="module" src="https://resources.developer.clockify.me/validation-widget/latest/clockify-project-picker.js"></script>
```

### npm (bundler-friendly)

Authenticate to the GitLab registry (private package), then:

```bash
npm install @marketplace/clockify-web-components
```

Import styles and either a single component or the whole bundle:

```ts
import "@marketplace/clockify-web-components/dist/style.css";
import "@marketplace/clockify-web-components/dist/components/clockify-project-picker.js";
// or
import "@marketplace/clockify-web-components/dist/web-components.js";
```

### Stable import paths

The package's public import contract is:

- `@marketplace/clockify-web-components`
- `@marketplace/clockify-web-components/dist/style.css`
- `@marketplace/clockify-web-components/dist/web-components.js`
- `@marketplace/clockify-web-components/dist/components/clockify-select.js`
- `@marketplace/clockify-web-components/dist/components/clockify-project-picker.js`
- `@marketplace/clockify-web-components/dist/components/clockify-custom-fields.js`
- `@marketplace/clockify-web-components/dist/components/clockify-tags.js`
- `@marketplace/clockify-web-components/dist/components/clockify-billable.js`
- `@marketplace/clockify-web-components/dist/components/clockify-description.js`

These paths are covered by the consumer-app smoke test before release.

## Initialization

Before using any components, you must initialize the library with your configuration. This sets up the authentication token, workspace context, and API endpoints.

```javascript
import { ClockifyWebComponentsApp } from "@marketplace/clockify-web-components";

await ClockifyWebComponentsApp.init({
  token: "YOUR_TOKEN",
  workspaceId: "YOUR_WORKSPACE_ID", // optional
  endpoint: "https://api.clockify.me", // optional
  homeUrl: "https://clockify.me", // optional
  addon: false // optional
});
```

Once initialized, all components on the page will automatically use this configuration. You don't need to pass `token` or `workspaceId` to individual components unless you want to override them.

This includes components that are dynamically added to the page after the initialization call has completed.

## Basic usage

```html
<clockify-project-picker
	style="display:inline-block"
></clockify-project-picker>
```

## Language override

All interactive components support an optional `lang` attribute to override the UI language without changing the signed-in user's language.

Supported components:

- `clockify-project-picker`
- `clockify-tags`
- `clockify-billable`
- `clockify-description`
- `clockify-custom-fields`

Usage examples:

```html
<clockify-project-picker lang="fr" ...></clockify-project-picker>
<clockify-tags lang="de" ...></clockify-tags>
<clockify-billable lang="es" ...></clockify-billable>
```

Notes:

- The `lang` value should be an ISO language code (e.g., `en`, `fr`, `de`, `es`).
- Supported languages: `fr`, `de`, `pt`, `es`; any other value (including region variants like `pt-BR`) falls back to `en`.
- When provided, the component will fetch and display translations for that language if available (or English fallback).
- Multiple components can use different `lang` values on the same page.

## Theming

- Respects system `prefers-color-scheme`.
- A parent with `data-theme="dark"` or class `dark` forces dark theme; `light` forces light theme.

## Components

- `clockify-project-picker`
- `clockify-tags`
- `clockify-billable`
- `clockify-custom-fields`
- `clockify-select`

For detailed props and examples, see the docs in `src/docs` or your published docs site.


