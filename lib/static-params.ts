/** Cache Components needs one sample so the shell can be checked at build time. */
export function withSample<T>(params: T[], sample: T): T[] {
  return params.length ? params : [sample];
}
