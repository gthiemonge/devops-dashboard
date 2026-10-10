/**
 * New-item window helper.
 *
 *   const cutoff = getNewItemsCutoff(newItemsHours);
 *   const isNew = new Date(change.created) >= cutoff;
 */

/** Items created (or posted/completed) after the returned date are considered new. */
export function getNewItemsCutoff(newItemsHours: number): Date {
  return new Date(Date.now() - newItemsHours * 60 * 60 * 1000);
}
