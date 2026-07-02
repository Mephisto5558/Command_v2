export function capitalize<T extends string>(str: T): Capitalize<T> {
  /* eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion -- this is correct */
  return str.charAt(0).toUpperCase() + str.slice(1) as Capitalize<T>;
}