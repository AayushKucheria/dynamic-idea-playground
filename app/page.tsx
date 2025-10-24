"use client";

import { useMemo, useState } from "react";

import { GoBoard, GoMove, formatCoordinate } from "./components/GoBoard";
import { InsightItem, InsightPanel } from "./components/InsightPanel";

const BOARD_SIZE = 9;

type LoggedMove = GoMove & { moveNumber: number };

export default function Home() {
  const [moves, setMoves] = useState<LoggedMove[]>([]);

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

    return entries;
  }, [lastMove, totalMoves]);

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
  }, [lastMove, nextPlayer]);

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
        </header>
        <div className="grid flex-1 gap-6 lg:grid-cols-[290px_minmax(0,1fr)_290px]">
          <div className="flex flex-col gap-6">
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
          </div>
          <div className="flex flex-col gap-6">
            <section className="flex flex-col gap-6 rounded-3xl border border-white/15 bg-white/90 p-6 text-slate-900 shadow-[0_28px_60px_rgba(15,23,42,0.25)] backdrop-blur">
              <div className="flex flex-col gap-2 text-slate-700">
                <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">
                  Active playground
                </p>
                <h2 className="text-2xl font-semibold tracking-tight text-slate-900">
                  9 × 9 Go board
                </h2>
                <p className="text-sm text-slate-600">
                  Tap any intersection to drop a stone. {nextPlayer} takes the next move.
                </p>
              </div>
              <GoBoard
                boardSize={BOARD_SIZE}
                onMove={handleMove}
                onReset={handleReset}
              />
            </section>
            <InsightPanel
              title="Recent thoughts"
              subtitle="Each move becomes a beat in the conversation."
              items={recentThoughts}
            />
          </div>
          <div className="flex flex-col gap-6">
            <InsightPanel
              title="Possible quests"
              subtitle="Optional prompts to stretch the position."
              items={questItems}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function colorLabel(color: GoMove["color"]) {
  return color === "black" ? "Black" : "White";
}
