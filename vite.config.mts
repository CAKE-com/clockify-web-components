import path from "path";
import { defineConfig } from "vite";
import { execSync } from 'child_process';

const packageName = process.env.npm_package_name;
const version = process.env.npm_package_version;

const commitHash = execSync('git rev-parse --short HEAD').toString().trim();

// @ts-ignore
export default defineConfig(() => ({
  define: {
    '__PACKAGE_NAME__': JSON.stringify(packageName),
    '__PACKAGE_VERSION__': JSON.stringify(version),
    '__COMMIT_HASH__': JSON.stringify(commitHash),
    'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV),
  },
  build: {
    lib: {
      entry: {
        'web-components': path.resolve(__dirname, 'src/index.ts'),
        'components/clockify-select': path.resolve(__dirname, 'src/components/clockify-select.ts'),
        'components/clockify-project-picker': path.resolve(__dirname, 'src/components/clockify-project-picker.ts'),
        'components/clockify-custom-fields': path.resolve(__dirname, 'src/components/clockify-custom-fields.ts'),
        'components/clockify-tags': path.resolve(__dirname, 'src/components/clockify-tags.ts'),
        'components/clockify-billable': path.resolve(__dirname, 'src/components/clockify-billable.ts'),
        'components/clockify-description': path.resolve(__dirname, 'src/components/clockify-description.ts'),
      },
      name: 'ComponentLibrary',
      formats: ['es'],
    },
    rollupOptions: {
      output: {
        globals: {
          lit: 'lit'
        },
        assetFileNames: (assetInfo) => {
          if (assetInfo.name?.endsWith('.css')) {
            return 'style.css';
          }
          return assetInfo.name;
        },
      },
    },
    cssMinify: true
  },
}));
