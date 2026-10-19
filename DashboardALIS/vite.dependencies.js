import { createRequire } from 'node:module';
import { isAbsolute, resolve } from 'node:path';

const require = createRequire(import.meta.url);

export function localDependencyResolution() {
  return {
    name: 'local-dependency-resolution',
    setup(build) {
      build.onResolve({ filter: /.*/ }, (args) => {
        if (args.path.startsWith('vite:') || args.path.startsWith('virtual:')) return;
        try {
          const specifier = args.path.startsWith('.') ? resolve(args.resolveDir, args.path) : args.path;
          const resolved = require.resolve(specifier, { paths: [args.resolveDir || process.cwd()] });
          return isAbsolute(resolved) ? { path: resolved } : undefined;
        } catch {
          return undefined;
        }
      });
    }
  };
}

