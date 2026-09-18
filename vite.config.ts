import { defineConfig } from 'vite';
import path from 'path';

export default defineConfig({
  resolve: {
    alias: {
      '@lib': path.resolve(__dirname, './lib'),
    },
  },
  plugins: [
    {
      name: 'minify-html-fragments',
      enforce: 'pre',
      load(id) {
        if (!id.endsWith('.html?raw')) return;

        const fs      = require('fs');
        const cleanId = id.split('?')[0];
        let code      = fs.readFileSync(cleanId, 'utf-8');

        let minified = code
          .replace(/\r?\n/g, '')
          .replace(/\s{2,}/g, ' ')
          .replace(/>\s+</g, '><')
          .trim();

        let imports      = '';
        let importCounter = 0;
        const parts: string[] = [];
        let lastIndex = 0;

        const regex = /\/assets\/[^"'\s,>]+/g;
        let match: RegExpExecArray | null;
        while ((match = regex.exec(minified)) !== null) {
          const varName = `__asset_${importCounter++}`;
          imports += `import ${varName} from '${match[0]}';\n`;
          parts.push(JSON.stringify(minified.slice(lastIndex, match.index)));
          parts.push(varName);
          lastIndex = regex.lastIndex;
        }
        parts.push(JSON.stringify(minified.slice(lastIndex)));

        const finalExpression = parts.filter(p => p !== '""').join(' + ') || '""';
        return `${imports}export default ${finalExpression};`;
      },
    },
  ],

  build: {
    assetsInlineLimit: 0,
    modulePreload: { polyfill: false },
    rollupOptions: {
      output: {
        manualChunks(id: string) {
          if (id.includes('/lib/')) return 'lib';
          const templateMatch = id.match(/\/templates\/([^/]+)\/scripts\//);
          if (templateMatch) return `template-${templateMatch[1]}`;
          const scriptMatch = id.match(/\/modules\/(?:app\/)?([^/]+)\/scripts\//);
          if (scriptMatch) return `module-${scriptMatch[1]}`;
        },
      },
    },
  },

  server: {
    watch: {
      ignored: ['!**/lib/**', '!**/modules/**', '!**/templates/**'],
    },
  },
});
