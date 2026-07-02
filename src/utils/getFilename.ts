import { basename, extname } from 'node:path';

export function getFilename<
  T extends string
>(path: T): IfExtendsStrict<T, Lowercase<string>, { ifTrue: Lowercase<string>; ifFalse: string }> {
  return basename(path, extname(path)) as ReturnType<typeof getFilename<T>>;
}