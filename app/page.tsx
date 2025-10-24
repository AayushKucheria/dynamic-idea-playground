"use client";

import { startTransition, useEffect, useMemo, useState } from "react";

import { GoBoard, GoMove, formatCoordinate } from "./components/GoBoard";
import { InsightItem, InsightPanel } from "./components/InsightPanel";
import { OpenRouterKeyDialog } from "./components/OpenRouterKeyDialog";

type LoggedMove = GoMove & { moveNumber: number };

const OPENROUTER_STORAGE_KEY = "dip-openrouter-key";

export default function Home() {
  const [boardSize, setBoardSize] = useState(9);
  const [moves, setMoves] = useState<LoggedMove[]>([]);
  const [apiKey, setApiKey] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  useEffect(() => {
    const storedKey = window.localStorage.getItem(OPENROUTER_STORAGE_KEY);

    startTransition(() => {
      if (storedKey) {
        setApiKey(storedKey);
        setIsDialogOpen(false);
      } else {
        setIsDialogOpen(true);
      }
    });
  }, []);

  const handleSaveApiKey = (key: string) => {
    setApiKey(key);
    window.localStorage.setItem(OPENROUTER_STORAGE_KEY, key);
    setIsDialogOpen(false);
  };

  const handleClearApiKey = () => {
    setApiKey("");
    window.localStorage.removeItem(OPENROUTER_STORAGE_KEY);
    setIsDialogOpen(true);
  };

  const handleCancelDialog = () => {
    if (apiKey) {
      setIsDialogOpen(false);
    }
  };

  const hasStoredKey = apiKey.length > 0;

  const handleMove = (move: GoMove) => {
    setMoves((previous) => [
      ...previous,
      {
        ...move,
        moveNumber: previous.length + 1,
      },
    ]);
  };

  const handleReset = () => {
    setMoves([]);
  };

  const handleBoardSizeChange = (nextSize: number) => {
    if (nextSize === boardSize) {
      return;
    }
    setBoardSize(nextSize);
    setMoves([]);
  };

  const totalMoves = moves.length;
  const lastMove = moves.at(-1);
  const nextPlayer = totalMoves % 2 === 0 ? "Black" : "White";

  const rememberItems = useMemo<InsightItem[]>(() => {
    const entries: InsightItem[] = [];

    if (lastMove) {
      entries.push({
        id: "latest-move",
        heading: `Latest move · ${colorLabel(lastMove.color)}`,
        detail: `Move ${lastMove.moveNumber} landed at ${formatCoordinate(
          lastMove.row,
          lastMove.column
        )}.`,
        tag: "Fresh",
      });
    } else {
      entries.push({
        id: "first-stone",
        heading: "Start with presence",
        detail:
          "Choose a corner or side to drop your first stone and feel the board respond.",
      });
    }

    entries.push({
      id: "intention",
      heading: "Intent for this session",
      detail:
        totalMoves < 6
          ? "Open the board gently—play with corners and edges to sketch territory."
          : "Look for weak groups. Can you reinforce yours or unsettle your opponent's shape?",
    });

    entries.push({
      id: "spotlight",
      heading: "Spotlight area",
      detail: lastMove
        ? `Zoom in around ${formatCoordinate(
            lastMove.row,
            lastMove.column
          )}. What supporting stones would give it breathing room?`
        : "Glance at the star points. Which one feels like the best anchor today?",
    });

    entries.push({
      id: "board-scale",
      heading: `${boardLabel(boardSize)} board`,
      detail: `Resizing to ${boardSize}×${boardSize} resets the tone—make the choice with care.`,
    });

    return entries;
  }, [boardSize, lastMove, totalMoves]);

  const recentThoughts = useMemo<InsightItem[]>(() => {
    if (moves.length === 0) {
      return [
        {
          id: "recent-empty",
          heading: "Waiting for the first beat",
          detail: "Every move will be reflected here with a quick note.",
        },
      ];
    }

    return [...moves]
      .reverse()
      .slice(0, 5)
      .map((move) => ({
        id: `move-${move.moveNumber}`,
        heading: `Move ${move.moveNumber} · ${colorLabel(move.color)}`,
        detail: `Placed at ${formatCoordinate(move.row, move.column)}.`,
        tag: colorLabel(move.color),
      }));
  }, [moves]);

  const quickThoughts = useMemo<InsightItem[]>(
    () => [
      {
        id: "corners-first",
        heading: "Corners before center",
        detail:
          "Claim an efficient base before exploring the middle. It keeps your next moves grounded.",
      },
      {
        id: "look-twice",
        heading: "Let the board breathe",
        detail:
          "After each placement, scan for two follow-up moves. Notice which groups feel tense.",
      },
      {
        id: "shape-focus",
        heading: "Shape over capture",
        detail:
          "Strong shapes often matter more than urgent captures. Can you thicken a group instead?",
      },
    ],
    []
  );

  const questItems = useMemo<InsightItem[]>(() => {
    if (!lastMove) {
      return [
        {
          id: "quest-first",
          heading: "Drop a stone",
          detail:
            "Place a stone on a corner star point and watch how the rest of the board reacts.",
          tag: "Warm-up",
        },
        {
          id: "quest-preview",
          heading: "Imagine the reply",
          detail: `Before you click, picture how ${nextPlayer.toLowerCase()} might answer. That anticipation is the playground.`,
        },
        {
          id: "quest-scale",
          heading: "Feel the scale",
          detail: `Notice how the ${boardLabel(
            boardSize
          )} board shifts the rhythm. Where would a wider board invite you to play?`,
          tag: boardLabel(boardSize),
        },
      ];
    }

    return [
      {
        id: "quest-link",
        heading: "Extend from your last move",
        detail: `Sketch a connection from ${formatCoordinate(
          lastMove.row,
          lastMove.column
        )} that strengthens the group.`,
        tag: "Connect",
      },
      {
        id: "quest-counter",
        heading: `Prepare for ${nextPlayer}`,
        detail: `What sente move could ${nextPlayer.toLowerCase()} play now? Note two candidates before playing on.`,
      },
      {
        id: "quest-reflect",
        heading: "Reflect out loud",
        detail:
          "Narrate why the last stone felt right. Giving it language helps the playground adapt.",
      },
    ];
  }, [boardSize, lastMove, nextPlayer]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div className="relative mx-auto flex min-h-screen w-full max-w-6xl flex-col gap-8 px-6 py-12 lg:px-12">
        <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
          <div className="absolute -left-1/3 top-[-10%] h-96 w-96 rounded-full bg-cyan-500/20 blur-3xl" />
          <div className="absolute -right-1/4 bottom-[-10%] h-[28rem] w-[28rem] rounded-full bg-violet-500/20 blur-3xl" />
        </div>
        <header className="flex flex-col gap-3 text-center lg:text-left">
          <p className="text-xs font-semibold uppercase tracking-[0.4em] text-slate-400">
            Dynamic Idea Playground
          </p>
          <h1 className="text-3xl font-semibold tracking-tight text-white sm:text-4xl">
            Go strategy playground
          </h1>
          <p className="text-sm text-slate-300 sm:text-base">
            Drop stones, notice patterns, and let the surrounding context reshape itself around your moves.
          </p>
          <div className="mt-2 flex flex-col items-center gap-2 text-xs text-slate-400 lg:flex-row lg:items-center lg:gap-4">
            <span>{hasStoredKey ? "Your OpenRouter key is stored on this device." : "Add an OpenRouter key to enable API calls."}</span>
            <button
              type="button"
              className="rounded-full border border-white/20 px-4 py-2 text-xs font-semibold uppercase tracking-[0.25em] text-slate-200 transition hover:border-cyan-300 hover:text-white"
              onClick={() => setIsDialogOpen(true)}
            >
              Manage API key
            </button>
          </div>
        </header>
        <div className="grid flex-1 gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
          <div className="flex flex-col gap-6">
            <section className="flex flex-1 flex-col gap-6 rounded-3xl border border-white/15 bg-white/90 p-6 text-slate-900 shadow-[0_28px_60px_rgba(15,23,42,0.25)] backdrop-blur sm:p-8 lg:min-h-[70vh]">
              <div className="flex flex-col gap-2 text-slate-700">
                <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">
                  Board overview
                </p>
                <h2 className="text-2xl font-semibold tracking-tight text-slate-900">
                  {boardSize} × {boardSize} Go board
                </h2>
                <p className="text-sm text-slate-600">
                  Tap any intersection to drop a stone. {nextPlayer} takes the next move.
                </p>
                <div className="flex flex-wrap items-center gap-3 pt-2 text-xs text-slate-500">
                  <span className="rounded-full border border-slate-900/10 bg-slate-100 px-3 py-1 font-semibold text-slate-700">
                    {boardLabel(boardSize)} pace
                  </span>
                  <label className="flex items-center gap-2">
                    <span className="font-semibold uppercase tracking-[0.2em]">Resize</span>
                    <select
                      className="rounded-full border border-slate-300 bg-white px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-slate-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-500"
                      value={boardSize}
                      aria-label="Select board size"
                      onChange={(event) => handleBoardSizeChange(Number(event.target.value))}
                    >
                      {[9, 13, 19].map((size) => (
                        <option key={size} value={size}>{`${size}×${size}`}</option>
                      ))}
                    </select>
                  </label>
                </div>
              </div>
              <div className="flex-1">
                <GoBoard
                  key={boardSize}
                  boardSize={boardSize}
                  onMove={handleMove}
                  onReset={handleReset}
                />
              </div>
            </section>
            <InsightPanel
              title="Recent thoughts"
              subtitle="Each move becomes a beat in the conversation."
              items={recentThoughts}
            />
          </div>
          <aside className="flex flex-col gap-6 lg:max-h-[80vh] lg:overflow-y-auto lg:pr-1">
            <InsightPanel
              title="Things we want to remember"
              subtitle="Anchors that keep this session grounded."
              items={rememberItems}
            />
            <InsightPanel
              title="Quick thoughts"
              subtitle="Snap impressions to keep the flow moving."
              items={quickThoughts}
            />
            <InsightPanel
              title="Possible quests"
              subtitle="Optional prompts to stretch the position."
              items={questItems}
            />
          </aside>
        </div>
      </div>
      {isDialogOpen ? (
        <OpenRouterKeyDialog
          key={hasStoredKey ? `open-${apiKey}` : "open-empty"}
          isOpen={isDialogOpen}
          initialValue={apiKey}
          onSave={handleSaveApiKey}
          onCancel={handleCancelDialog}
          onClear={hasStoredKey ? handleClearApiKey : undefined}
        />
      ) : null}
    </div>
  );
}

function colorLabel(color: GoMove["color"]) {
  return color === "black" ? "Black" : "White";
}

function boardLabel(size: number) {
  switch (size) {
    case 19:
      return "expansive";
    case 13:
      return "attentive";
    default:
      return "compact";
  }
}
