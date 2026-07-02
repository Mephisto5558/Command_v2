/* eslint-disable nounsanitized/method, security/detect-non-literal-require -- should be handled by the lib's user */

import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
import { init, isSupported } from 'import-without-cache';
import { isCodedError } from './isCodedError.ts';

export async function loadFile(path: string): Promise<unknown> {
  try {
    const
      require = createRequire(import.meta.url),
      resolvedPath = require.resolve(path);

    /* eslint-disable-next-line @typescript-eslint/no-dynamic-delete -- require.cache */
    delete require.cache[resolvedPath];
    return require(resolvedPath);
  }
  catch (err) {
    if (!isCodedError(err, 'ERR_REQUIRE_ESM')) throw err;

    // This does not clear the old file from RAM as that can't be done programmatically.
    if (!isSupported) return import(pathToFileURL(`${path}?t=${Date.now()}`).href);

    const deregister = init();

    try { return await import(pathToFileURL(path).href, { with: { cache: 'no' } }); }
    finally { deregister(); }
  }
}