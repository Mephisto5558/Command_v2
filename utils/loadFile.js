/** @import { loadFile } from './index.js' */

const
  { pathToFileURL } = require('node:url'),
  importWithoutCache = require('import-without-cache');

/** @type {loadFile} */
module.exports = async function loadFile(path) {
  try {
    const resolvedPath = require.resolve(path);

    /* eslint-disable-next-line @typescript-eslint/no-dynamic-delete -- require.cache */
    delete require.cache[resolvedPath];
    return require(resolvedPath);
  }
  catch (err) {
    if (err.code !== 'ERR_REQUIRE_ESM') throw err;

    if (!importWithoutCache.isSupported) return import(pathToFileURL(`${path}?t=${Date.now()}`).href);

    const deregister = importWithoutCache.init();
    /* eslint-disable-next-line @typescript-eslint/no-unsafe-return -- can't do much about that */
    try { return await import(pathToFileURL(path).href, { with: { cache: 'no' } }); }
    finally { deregister(); }
  }
};