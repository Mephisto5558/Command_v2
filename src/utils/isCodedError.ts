export function isCodedError<const C>(
  err: unknown, code?: C
): err is Error & { code: C extends readonly unknown[] ? C[number] : C } {
  if (!Error.isError(err) || !('code' in err))
    return false;

  if (code === undefined) return true;
  return Array.isArray(code) ? code.includes(err.code) : err.code === code;
}