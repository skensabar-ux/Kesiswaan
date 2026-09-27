export const PAGE_SIZE = 20;

export function pageParams(page: string | undefined, size = PAGE_SIZE) {
  const p = Math.max(1, Number.parseInt(page ?? "1", 10) || 1);
  return { page: p, take: size, skip: (p - 1) * size };
}
