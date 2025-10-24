"use client";

import { useEffect, useState } from "react";

export type StoneColor = "black" | "white";

export interface GoMove {
  row: number;
  column: number;
  color: StoneColor;
}

interface GoBoardProps {
  size?: number;
  onMove?: (move: GoMove) => void;
  onReset?: () => void;
}

const COLUMN_LETTERS = "ABCDEFGHJKLMNOPQRSTUVWXYZ";

export function formatCoordinate(row: number, column: number, size: number) {
  const letter = COLUMN_LETTERS[column] ?? String.fromCharCode(65 + column);
  return `${letter}${row + 1}`;
}

export function GoBoard({ size = 9, onMove, onReset }: GoBoardProps) {
  const [stones, setStones] = useState<Array<StoneColor | null>>(
    () => new Array(size * size).fill(null)
  );
  const [currentPlayer, setCurrentPlayer] = useState<StoneColor>("black");

  useEffect(() => {
    setStones(new Array(size * size).fill(null));
    setCurrentPlayer("black");
  }, [size]);

  const placeStone = (index: number) => {
    if (stones[index]) {
      return;
    }

    const moveColor = currentPlayer;
    const nextStones = [...stones];
    nextStones[index] = moveColor;
    setStones(nextStones);
    setCurrentPlayer((prev) => (prev === "black" ? "white" : "black"));

    const row = Math.floor(index / size);
    const column = index % size;
    onMove?.({ row, column, color: moveColor });
  };

  const resetBoard = () => {
    setStones(new Array(size * size).fill(null));
    setCurrentPlayer("black");
    onReset?.();
  };

  const activeLabel = currentPlayer === "black" ? "Black" : "White";

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-amber-900/90">
        <span className="font-medium">
          Current turn:{" "}
          <span className={currentPlayer === "black" ? "text-amber-950" : "text-amber-600"}>
            {activeLabel}
          </span>
        </span>
        <button
          type="button"
          onClick={resetBoard}
          className="rounded-full border border-amber-900/30 bg-amber-200/80 px-4 py-1 text-xs font-semibold uppercase tracking-wide text-amber-900 transition hover:bg-amber-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-500"
        >
          Reset board
        </button>
      </div>
      <div className="relative w-full overflow-hidden rounded-3xl border border-amber-900/40 bg-gradient-to-br from-amber-200 via-amber-300 to-amber-200 p-4 shadow-[inset_0_8px_24px_rgba(120,72,18,0.35)]">
        <div
          className="grid h-full w-full"
          style={{
            gridTemplateColumns: `repeat(${size}, minmax(0, 1fr))`,
            gridTemplateRows: `repeat(${size}, minmax(0, 1fr))`,
          }}
        >
          {stones.map((stone, index) => {
            const row = Math.floor(index / size);
            const column = index % size;
            const coordinate = formatCoordinate(row, column, size);
            return (
              <button
                key={coordinate}
                type="button"
                onClick={() => placeStone(index)}
                className="relative flex aspect-square items-center justify-center border border-amber-900/40 bg-transparent transition hover:bg-amber-900/10 focus-visible:z-10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-0 focus-visible:outline-amber-500"
                aria-label={`Place ${activeLabel} stone at ${coordinate}`}
              >
                {stone && (
                  <span
                    className={`h-8 w-8 rounded-full shadow-lg ${
                      stone === "black"
                        ? "bg-zinc-900 shadow-black/50"
                        : "bg-zinc-100 shadow-white/70"
                    }`}
                  />
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
