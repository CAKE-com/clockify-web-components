export function uniqueBy<T extends Record<string, any>>(array: T[], key: keyof T): T[] {
  const seen = new Set<T[keyof T]>();

  return array.filter(item => {
    const value = item[key];
    if (seen.has(value)) {
      return false;
    } else {
      seen.add(value);
      return true;
    }
  });
}