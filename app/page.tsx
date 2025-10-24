"use client";

import { useEffect, useState } from "react";

import { GoBoard, GoMove, formatCoordinate } from "./components/GoBoard";
import { InsightItem, InsightPanel } from "./components/InsightPanel";
import { requestChatCompletion, OpenRouterChatRequest } from "./lib/openrouter";

type LoggedMove = GoMove & { moveNumber: number };

type PanelStatus = "idle" | "loading" | "ready" | "error";

interface PanelRenderState {
  items: InsightItem[];
  status: PanelStatus;
  error?: string;
}

interface PanelContext {
  boardSize: number;
  moves: LoggedMove[];
  totalMoves: number;
  lastMove?: LoggedMove;
  nextPlayer: "Black" | "White";
  activeQuestId: string | null;
  boardSnapshot: string;
  recentHistory: string;
}

interface PanelGeneratorOptions {
  apiKey: string | null;
  signal: AbortSignal;
}

export default function Home() {
  const [boardSize, setBoardSize] = useState(9);
  const [moves, setMoves] = useState<LoggedMove[]>([]);
  const [activeQuestId, setActiveQuestId] = useState<string | null>(null);
  const [apiKey, setApiKey] = useState<string | null>(null);

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

  const [rememberPanel, setRememberPanel] = useState<PanelRenderState>(() => ({
    items: buildRememberHeuristics(boardSize, lastMove, totalMoves),
    status: "idle",
  }));
  const [recentPanel, setRecentPanel] = useState<PanelRenderState>(() => ({
    items: buildRecentHeuristics(moves),
    status: "idle",
  }));
  const [quickPanel, setQuickPanel] = useState<PanelRenderState>(() => ({
    items: buildQuickHeuristics(),
    status: "idle",
  }));
  const [questPanel, setQuestPanel] = useState<PanelRenderState>(() => ({
    items: buildQuestHeuristics(boardSize, lastMove, nextPlayer),
    status: "idle",
  }));

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const storedKey = window.localStorage.getItem("openrouter_api_key");
    if (storedKey) {
      setApiKey(storedKey);
    }

    const handleStorage = (event: StorageEvent) => {
      if (event.key === "openrouter_api_key") {
        setApiKey(event.newValue);
      }
    };

    window.addEventListener("storage", handleStorage);
    return () => {
      window.removeEventListener("storage", handleStorage);
    };
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    let cancelled = false;

    const context = createPanelContext({
      boardSize,
      moves,
      totalMoves,
      lastMove,
      nextPlayer,
      activeQuestId,
    });

    const runGenerator = async (
      generator: AsyncGenerator<PanelRenderState>,
      apply: (update: PanelRenderState) => void
    ) => {
      for await (const update of generator) {
        if (cancelled) {
          return;
        }
        apply(update);
      }
    };

    void runGenerator(
      generateRememberPanel(context, { apiKey, signal: controller.signal }),
      (update) => setRememberPanel(update)
    );

    void runGenerator(
      generateRecentPanel(context, { apiKey, signal: controller.signal }),
      (update) => setRecentPanel(update)
    );

    void runGenerator(
      generateQuickPanel(context, { apiKey, signal: controller.signal }),
      (update) => setQuickPanel(update)
    );

    void runGenerator(
      generateQuestPanel(context, { apiKey, signal: controller.signal }),
      (update) => {
        setQuestPanel(update);
        setActiveQuestId((current) => {
          if (update.items.length === 0) {
            return current;
          }

          if (!current) {
            return update.items[0]?.id ?? null;
          }

          return update.items.some((item) => item.id === current)
            ? current
            : update.items[0]?.id ?? current;
        });
      }
    );

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [boardSize, moves, totalMoves, lastMove, nextPlayer, activeQuestId, apiKey]);

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
              items={rememberPanel.items}
              footer={buildPanelFooter(
                rememberPanel,
                "Grounded through OpenRouter guidance."
              )}
            />
            <InsightPanel
              title="Quick thoughts"
              subtitle="Snap impressions to keep the flow moving."
              items={quickPanel.items}
              footer={buildPanelFooter(
                quickPanel,
                "Quick pulses from our supporting model."
              )}
            />
          </div>
          <div className="flex flex-col gap-6">
            <section className="flex flex-col gap-6 rounded-3xl border border-white/15 bg-white/90 p-6 text-slate-900 shadow-[0_28px_60px_rgba(15,23,42,0.25)] backdrop-blur">
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
              <GoBoard
                key={boardSize}
                boardSize={boardSize}
                onMove={handleMove}
                onReset={handleReset}
              />
            </section>
            <InsightPanel
              title="Recent thoughts"
              subtitle="Each move becomes a beat in the conversation."
              items={recentPanel.items}
              footer={buildPanelFooter(
                recentPanel,
                "Documented with OpenRouter awareness."
              )}
            />
          </div>
          <div className="flex flex-col gap-6">
            <InsightPanel
              title="Possible quests"
              subtitle="Optional prompts to stretch the position."
              items={questPanel.items}
              footer={buildPanelFooter(
                questPanel,
                "Questline refreshed through OpenRouter."
              )}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function buildPanelFooter(state: PanelRenderState, readyMessage: string) {
  switch (state.status) {
    case "loading":
      return "Inviting OpenRouter to reflect…";
    case "ready":
      return readyMessage;
    case "error":
      return state.error
        ? `Showing steady heuristics · ${state.error}`
        : "Showing steady heuristics.";
    default:
      return "Waiting for a snapshot to share.";
  }
}

function createPanelContext({
  boardSize,
  moves,
  totalMoves,
  lastMove,
  nextPlayer,
  activeQuestId,
}: {
  boardSize: number;
  moves: LoggedMove[];
  totalMoves: number;
  lastMove?: LoggedMove;
  nextPlayer: "Black" | "White";
  activeQuestId: string | null;
}): PanelContext {
  return {
    boardSize,
    moves,
    totalMoves,
    lastMove,
    nextPlayer,
    activeQuestId,
    boardSnapshot: renderBoardSnapshot(boardSize, moves),
    recentHistory: renderRecentHistory(moves),
  };
}

function buildRememberHeuristics(
  boardSize: number,
  lastMove: LoggedMove | undefined,
  totalMoves: number
): InsightItem[] {
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
}

function buildRecentHeuristics(moves: LoggedMove[]): InsightItem[] {
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
}

function buildQuickHeuristics(): InsightItem[] {
  return [
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
  ];
}

function buildQuestHeuristics(
  boardSize: number,
  lastMove: LoggedMove | undefined,
  nextPlayer: "Black" | "White"
): InsightItem[] {
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
}

async function* generateRememberPanel(
  context: PanelContext,
  options: PanelGeneratorOptions
): AsyncGenerator<PanelRenderState> {
  const heuristics = buildRememberHeuristics(
    context.boardSize,
    context.lastMove,
    context.totalMoves
  );

  if (!options.apiKey) {
    yield {
      items: heuristics,
      status: "error",
      error: "Add an OpenRouter API key to unlock live anchors.",
    };
    return;
  }

  yield { items: heuristics, status: "loading" };

  try {
    const request = buildRememberPrompt(context);
    const content = await requestChatCompletion(options.apiKey, request, options.signal);
    const items = parseInsightResponse(content, heuristics);
    yield { items, status: "ready" };
  } catch (error) {
    if ((error as Error)?.name === "AbortError") {
      return;
    }
    yield {
      items: heuristics,
      status: "error",
      error: describeError(error),
    };
  }
}

async function* generateRecentPanel(
  context: PanelContext,
  options: PanelGeneratorOptions
): AsyncGenerator<PanelRenderState> {
  const heuristics = buildRecentHeuristics(context.moves);

  if (!options.apiKey) {
    yield {
      items: heuristics,
      status: "error",
      error: "Add an OpenRouter API key to surface narrated history.",
    };
    return;
  }

  yield { items: heuristics, status: "loading" };

  try {
    const request = buildRecentPrompt(context);
    const content = await requestChatCompletion(options.apiKey, request, options.signal);
    const items = parseInsightResponse(content, heuristics);
    yield { items, status: "ready" };
  } catch (error) {
    if ((error as Error)?.name === "AbortError") {
      return;
    }
    yield {
      items: heuristics,
      status: "error",
      error: describeError(error),
    };
  }
}

async function* generateQuickPanel(
  context: PanelContext,
  options: PanelGeneratorOptions
): AsyncGenerator<PanelRenderState> {
  const heuristics = buildQuickHeuristics();

  if (!options.apiKey) {
    yield {
      items: heuristics,
      status: "error",
      error: "Add an OpenRouter API key to refresh quick pulses.",
    };
    return;
  }

  yield { items: heuristics, status: "loading" };

  try {
    const request = buildQuickPrompt(context);
    const content = await requestChatCompletion(options.apiKey, request, options.signal);
    const items = parseInsightResponse(content, heuristics);
    yield { items, status: "ready" };
  } catch (error) {
    if ((error as Error)?.name === "AbortError") {
      return;
    }
    yield {
      items: heuristics,
      status: "error",
      error: describeError(error),
    };
  }
}

async function* generateQuestPanel(
  context: PanelContext,
  options: PanelGeneratorOptions
): AsyncGenerator<PanelRenderState> {
  const heuristics = buildQuestHeuristics(
    context.boardSize,
    context.lastMove,
    context.nextPlayer
  );

  if (!options.apiKey) {
    yield {
      items: heuristics,
      status: "error",
      error: "Add an OpenRouter API key to evolve quests dynamically.",
    };
    return;
  }

  yield { items: heuristics, status: "loading" };

  try {
    const request = buildQuestPrompt(context);
    const content = await requestChatCompletion(options.apiKey, request, options.signal);
    const items = parseInsightResponse(content, heuristics);
    yield { items, status: "ready" };
  } catch (error) {
    if ((error as Error)?.name === "AbortError") {
      return;
    }
    yield {
      items: heuristics,
      status: "error",
      error: describeError(error),
    };
  }
}

const REMEMBER_MODEL = "anthropic/claude-3-haiku-20240307";
const RECENT_MODEL = "meta-llama/llama-3.1-8b-instruct";
const QUICK_MODEL = "openai/gpt-4o-mini";
const QUEST_MODEL = "anthropic/claude-3-haiku-20240307";

function buildRememberPrompt(context: PanelContext): OpenRouterChatRequest {
  return {
    model: REMEMBER_MODEL,
    messages: [
      {
        role: "system",
        content:
          "You are a calm Go study companion highlighting the anchors of the current session in three thoughtful reminders.",
      },
      {
        role: "user",
        content: formatPromptContent({
          context,
          intention:
            "Offer three memory anchors that feel rooted, supportive, and precise.",
        }),
      },
    ],
  };
}

function buildRecentPrompt(context: PanelContext): OpenRouterChatRequest {
  return {
    model: RECENT_MODEL,
    messages: [
      {
        role: "system",
        content:
          "You narrate the flow of the last few Go moves, noticing rhythm and emotional tone without judging.",
      },
      {
        role: "user",
        content: formatPromptContent({
          context,
          intention:
            "Summarize up to five most recent moves as reflective notes for the player.",
        }),
      },
    ],
  };
}

function buildQuickPrompt(context: PanelContext): OpenRouterChatRequest {
  return {
    model: QUICK_MODEL,
    messages: [
      {
        role: "system",
        content:
          "You offer brisk, encouraging Go observations that help the player keep momentum.",
      },
      {
        role: "user",
        content: formatPromptContent({
          context,
          intention:
            "Provide three short sparks that nudge the next decisions in a playful way.",
        }),
      },
    ],
    temperature: 0.7,
  };
}

function buildQuestPrompt(context: PanelContext): OpenRouterChatRequest {
  return {
    model: QUEST_MODEL,
    messages: [
      {
        role: "system",
        content:
          "You suggest gentle quests for a Go player, balancing stretching challenges with a grounding tone.",
      },
      {
        role: "user",
        content: formatPromptContent({
          context,
          intention:
            "Offer three quest prompts tuned to the current board, labeling them when a theme stands out.",
        }),
      },
    ],
  };
}

function formatPromptContent({
  context,
  intention,
}: {
  context: PanelContext;
  intention: string;
}) {
  return [
    intention,
    "Respond strictly as JSON with the shape {\"items\": [{\"id\": string, \"heading\": string, \"detail\": string, \"tag\"?: string}] }.",
    "If an item lacks a natural tag, omit it.",
    `Board size: ${context.boardSize}. Next player: ${context.nextPlayer}. Active quest: ${context.activeQuestId ?? "none"}.`,
    "Board snapshot:",
    context.boardSnapshot,
    "Recent moves:",
    context.recentHistory || "No moves yet.",
  ].join("\n\n");
}

function parseInsightResponse(
  content: string,
  fallback: InsightItem[]
): InsightItem[] {
  try {
    const trimmed = content.trim();
    if (!trimmed.includes("{")) {
      return fallback;
    }
    const jsonCandidate =
      trimmed.startsWith("{") && trimmed.endsWith("}")
        ? trimmed
        : trimmed.slice(trimmed.indexOf("{"));
    const parsed = JSON.parse(jsonCandidate);
    const items: unknown = parsed.items ?? parsed;
    if (!Array.isArray(items)) {
      return fallback;
    }

    const normalized = items
      .map((item, index) => normalizeInsightItem(item, index))
      .filter((item): item is InsightItem => Boolean(item?.heading));

    return normalized.length > 0 ? normalized : fallback;
  } catch (error) {
    console.warn("Failed to parse OpenRouter insight response", error);
    return fallback;
  }
}

function normalizeInsightItem(value: unknown, index: number): InsightItem | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const candidate = value as Partial<InsightItem> & { heading?: unknown };
  const heading =
    typeof candidate.heading === "string"
      ? candidate.heading
      : typeof (candidate as Record<string, unknown>).title === "string"
      ? ((candidate as Record<string, string>).title as string)
      : undefined;

  if (!heading) {
    return null;
  }

  const id =
    typeof candidate.id === "string"
      ? candidate.id
      : `ai-${index + 1}`;

  return {
    id,
    heading,
    detail:
      typeof candidate.detail === "string"
        ? candidate.detail
        : undefined,
    tag:
      typeof candidate.tag === "string"
        ? candidate.tag
        : undefined,
  };
}

function describeError(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }
  return "Unable to reach OpenRouter.";
}

function renderBoardSnapshot(boardSize: number, moves: LoggedMove[]) {
  const board = Array.from({ length: boardSize }, () =>
    Array.from({ length: boardSize }, () => ".")
  );

  for (const move of moves) {
    board[move.row][move.column] = move.color === "black" ? "B" : "W";
  }

  return board.map((row) => row.join(" ")).join("\n");
}

function renderRecentHistory(moves: LoggedMove[]) {
  return moves
    .slice(-10)
    .map(
      (move) =>
        `${move.moveNumber}. ${colorLabel(move.color)} → ${formatCoordinate(
          move.row,
          move.column
        )}`
    )
    .join("\n");
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
