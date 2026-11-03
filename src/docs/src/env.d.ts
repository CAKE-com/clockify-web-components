/// <reference path="../.astro/types.d.ts" />
/// <reference types="astro/client" />

declare module '*.css?inline' {
    const content: string;
    export default content;
}

declare global {
  const __PACKAGE_NAME__: string;
  const __PACKAGE_VERSION__: string;
  const __COMMIT_HASH__: string;
  interface Window {
    electron?: any;
    getAppTarget?: () => 'electron' | 'web';
  }
}
