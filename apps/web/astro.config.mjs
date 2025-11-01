import { defineConfig } from 'astro/config';

import react from '@astrojs/react';
import tailwindcss from '@tailwindcss/vite';
import Icons from 'unplugin-icons/vite';

import icon from 'astro-icon';

import cloudflare from '@astrojs/cloudflare';

// https://astro.build/config
export default defineConfig({
  site: 'https://your-ecommerce-site.com',
  base: '/',
  integrations: [react(), icon()],
  output: 'static',

  build: {
    assets: '_astro',
    inlineStylesheets: 'auto',
  },

  vite: {
    plugins: [
      tailwindcss(),
      Icons({
        compiler: 'astro',
        autoInstall: true,
      }),
    ],
    ssr: {
      external: ['@strapi/strapi', 'react-icons'],
    },
    define: {
      'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV),
    },
  },

  adapter: cloudflare(),
});