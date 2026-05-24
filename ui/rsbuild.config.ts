import { defineConfig } from '@rsbuild/core';
import { pluginTypeCheck } from "@rsbuild/plugin-type-check";
import { pluginReact } from '@rsbuild/plugin-react';

export default defineConfig({
  server: {
    base: '/ui/',
    host: '0.0.0.0',
    port: 5173,
    // HTTPS with a self-signed cert is required so the Web Crypto API
    // (used by keycloak-js for OAuth state UUIDs) is available off-
    // localhost. Phone must accept the cert once.
    https: true,
    proxy: {
      '/public': 'http://localhost:8080',
      '/api': 'http://localhost:8080',
    }
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