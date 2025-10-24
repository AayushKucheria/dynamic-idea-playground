export type StoneColor = "black" | "white";

export interface GoMove {
  row: number;
  column: number;
  color: StoneColor;
}

export const COLUMN_LETTERS = "ABCDEFGHJKLMNOPQRSTUVWXYZ";

export function formatCoordinate(row: number, column: number) {
  const letter = COLUMN_LETTERS[column] ?? String.fromCharCode(65 + column);
  return `${letter}${row + 1}`;
}

export function colorLabel(color: StoneColor) {
  return color === "black" ? "Black" : "White";
}
