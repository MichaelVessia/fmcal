/** Truncate a list while preserving total count. */
export const truncateList = <T>(
  items: readonly T[],
  maxLength = 50,
): { readonly items: readonly T[]; readonly truncated: boolean; readonly total: number } => {
  if (items.length <= maxLength) {
    return { items, truncated: false, total: items.length }
  }
  return {
    items: items.slice(0, maxLength),
    truncated: true,
    total: items.length,
  }
}
