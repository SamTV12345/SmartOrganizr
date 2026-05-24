import { defineConfig } from '@rsbuild/core';
import { pluginTypeCheck } from "@rsbuild/plugin-type-check";
import { pluginReact } from '@rsbuild/plugin-react';
import { generate as generateCert } from 'selfsigned';

// Generate a fresh self-signed cert on dev-server start. Required so the
// Web Crypto API is available off-localhost (keycloak-js bails without it
// when generating OAuth state UUIDs). selfsigned v5+ is async, so the
// whole config function is async too.
export default defineConfig(async () => {
  const notAfter = new Date();
  notAfter.setFullYear(notAfter.getFullYear() + 1);
  const pems = await generateCert(
    [{ name: 'commonName', value: 'localhost' }],
    { notAfterDate: notAfter, keySize: 2048, algorithm: 'sha256' },
  );

  return {
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
  };
});