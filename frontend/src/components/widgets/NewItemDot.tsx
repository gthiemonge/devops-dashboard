// Items created (or posted/completed) after this date are considered new
export function getNewItemsCutoff(newItemsHours: number): Date {
  return new Date(Date.now() - newItemsHours * 60 * 60 * 1000);
}

export function NewItemDot() {
  return (
    <span
      className="inline-block w-1.5 h-1.5 mr-1.5 rounded-full bg-cyan-500 align-middle flex-shrink-0"
      title="New"
    />
  );
}
