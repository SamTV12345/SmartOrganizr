import { defineConfig } from '@rsbuild/core';
import { pluginTypeCheck } from "@rsbuild/plugin-type-check";
import { pluginReact } from '@rsbuild/plugin-react';

export default defineConfig({
  server: {
    base: '/ui/',
    port: 5173
  },
  html: {
    template: './index.html',

  },
  resolve: {
    alias: {
      '@': './src',
    },
  },
  plugins: [
    pluginReact(),
      pluginTypeCheck()
  ],
});