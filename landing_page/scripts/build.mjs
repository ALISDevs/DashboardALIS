import { cp, mkdir, stat } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = fileURLToPath(new URL('../', import.meta.url));
const output = path.join(root, 'dist');
await mkdir(output, { recursive: true });
for (const name of ['index.html', 'styles.css', 'app.js', 'config.js', 'assets', 'proyectos']) {
  await cp(path.join(root, name), path.join(output, name), { recursive: true });
}
await stat(path.join(output, 'assets/Geist-Variable.woff2'));
await stat(path.join(output, 'assets/GeistMono-Variable.woff2'));
console.log(`Landing preparada en ${output}`);
