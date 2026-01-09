/** @import { getDirectories as getDirectoriesT } from '.' */

const { readdir } = require('node:fs/promises');

/** @type {getDirectoriesT} */
module.exports = async function getDirectories(path) {
  return (await readdir(path, { withFileTypes: true })).reduce((acc, e) => e.isDirectory() ? [...acc, e.name] : acc, []);
};