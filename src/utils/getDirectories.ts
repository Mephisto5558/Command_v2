import { readdir } from 'node:fs/promises';

export async function getDirectories(path: string): Promise<string[]> {
  return (await readdir(path, { withFileTypes: true })).reduce<string[]>((acc, e) => e.isDirectory() ? [...acc, e.name] : acc, []);
}