export const byOrder = <T extends { order: number }>(items: Iterable<T>): T[] =>
  [...items].sort((a, b) => a.order - b.order);
