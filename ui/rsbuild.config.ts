import { defineConfig } from '@rsbuild/core';
import { pluginTypeCheck } from "@rsbuild/plugin-type-check";
import { pluginReact } from '@rsbuild/plugin-react';
import selfsigned from 'selfsigned';

// Generate a fresh self-signed cert on dev-server start. Required so the
// Web Crypto API is available off-localhost (keycloak-js bails without it
// when generating OAuth state UUIDs).
const pems = selfsigned.generate(
  [{ name: 'commonName', value: 'localhost' }],
  { days: 365, keySize: 2048 },
);

export default defineConfig({
  server: {
    base: '/ui/',
    host: '0.0.0.0',
    port: 5173,
    https: { key: pems.private, cert: pems.cert },
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