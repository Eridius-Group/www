import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

const distPath = path.join(process.cwd(), 'dist');
const indexPath = path.join(distPath, 'index.html');

if (!fs.existsSync(indexPath)) {
  console.error('index.html not found in dist/');
  process.exit(1);
}

let html = fs.readFileSync(indexPath, 'utf-8');

html = html.replace(/<(script|link)([^>]+)(src|href)="([^"]+)"([^>]*)>/g, (match, tag, before, attr, url, after) => {
  if (!url.startsWith('/assets/')) return match;
  
  const filepath = path.join(distPath, url.replace(/^\//, ''));
  if (!fs.existsSync(filepath)) return match;
  
  const content = fs.readFileSync(filepath);
  const hash = crypto.createHash('sha512').update(content).digest('base64');
  
  return `<${tag}${before}${attr}="${url}" integrity="sha512-${hash}" crossorigin="anonymous"${after}>`;
});

fs.writeFileSync(indexPath, html);
console.log('SRI checksums successfully injected into dist/index.html!');
