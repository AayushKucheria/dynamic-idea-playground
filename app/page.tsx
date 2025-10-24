"use client";

import { useEffect, useState } from "react";

import { GoBoard, GoMove, formatCoordinate } from "./components/GoBoard";
import { InsightItem, InsightPanel } from "./components/InsightPanel";
import {
  OpenRouterChatCompletionRequest,
  createOpenRouterChatCompletion,
} from "./lib/openrouter";

type LoggedMove = GoMove & { moveNumber: number };

type PanelStatusState = "idle" | "loading" | "ready" | "error";

interface PanelStatus {
  state: PanelStatusState;
  message: string;
}

interface PanelEmission {
  items: InsightItem[];
  status: PanelStatus;
}

interface PanelContext {
  boardSize: number;
  moves: LoggedMove[];
  lastMove: LoggedMove | undefined;
  totalMoves: number;
  nextPlayer: string;
  activeQuest: string | null;
  apiKey: string | null;
  boardSnapshot: string;
  historySummary: string;
}

export default function Home() {
  const [boardSize, setBoardSize] = useState(9);
  const [moves, setMoves] = useState<LoggedMove[]>([]);
  const [activeQuest, setActiveQuest] = useState<string | null>(null);
  const [openRouterKey, setOpenRouterKey] = useState<string | null>(null);

  const [rememberItems, setRememberItems] = useState<InsightItem[]>(() =>
    buildRememberFallback(DEFAULT_PANEL_CONTEXT)
  );
  const [quickThoughts, setQuickThoughts] = useState<InsightItem[]>(() =>
    buildQuickThoughtsFallback()
  );
  const [recentThoughts, setRecentThoughts] = useState<InsightItem[]>(() =>
    buildRecentFallback(DEFAULT_PANEL_CONTEXT)
  );
  const [questItems, setQuestItems] = useState<InsightItem[]>(() =>
    buildQuestFallback(DEFAULT_PANEL_CONTEXT)
  );

  const [rememberStatus, setRememberStatus] = useState<PanelStatus>({
    state: "idle",
    message: "Heuristics ready. Add your OpenRouter key for adaptive anchors.",
  });
  const [quickThoughtsStatus, setQuickThoughtsStatus] = useState<PanelStatus>({
    state: "idle",
    message: "Stable heuristics active while we watch for new turns.",
  });
  const [recentStatus, setRecentStatus] = useState<PanelStatus>({
    state: "idle",
    message: "Moves will be echoed here the moment they land.",
  });
  const [questStatus, setQuestStatus] = useState<PanelStatus>({
    state: "idle",
    message: "Quests refresh as soon as the board shifts.",
  });

  const totalMoves = moves.length;
  const lastMove = moves.at(-1);
  const nextPlayer = totalMoves % 2 === 0 ? "Black" : "White";
  const sanitizedKey = openRouterKey?.trim() ?? null;

  const boardSnapshot = renderBoardSnapshot(boardSize, moves);
  const historySummary = formatHistorySummary(moves);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const syncKey = () => {
      const stored = window.localStorage.getItem("openrouter-api-key");
      setOpenRouterKey(stored && stored.trim().length > 0 ? stored.trim() : null);
    };

    syncKey();
    window.addEventListener("storage", syncKey);
    window.addEventListener("openrouter:refresh-key", syncKey as EventListener);

    return () => {
      window.removeEventListener("storage", syncKey);
      window.removeEventListener(
        "openrouter:refresh-key",
        syncKey as EventListener
      );
    };
  }, []);

  useEffect(() => {
    const context: PanelContext = {
      boardSize,
      moves,
      lastMove,
      totalMoves,
      nextPlayer,
      activeQuest,
      apiKey: sanitizedKey,
      boardSnapshot,
      historySummary,
    };

    let cancelled = false;

    const runPanel = async (
      generator: AsyncGenerator<PanelEmission>,
      setItems: React.Dispatch<React.SetStateAction<InsightItem[]>>,
      setStatus: React.Dispatch<React.SetStateAction<PanelStatus>>
    ) => {
      for await (const emission of generator) {
        if (cancelled) {
          break;
        }
        setItems(emission.items);
        setStatus(emission.status);
      }
    };

    runPanel(
      rememberStream(context),
      setRememberItems,
      setRememberStatus
    ).catch((error) => console.error("Remember panel stream failed", error));

    runPanel(
      quickThoughtsStream(context),
      setQuickThoughts,
      setQuickThoughtsStatus
    ).catch((error) => console.error("Quick thoughts stream failed", error));

    runPanel(
      recentThoughtsStream(context),
      setRecentThoughts,
      setRecentStatus
    ).catch((error) => console.error("Recent thoughts stream failed", error));

    runPanel(questStream(context), setQuestItems, setQuestStatus).catch((error) =>
      console.error("Quest stream failed", error)
    );

    return () => {
      cancelled = true;
    };
  }, [
    boardSize,
    moves,
    lastMove,
    totalMoves,
    nextPlayer,
    activeQuest,
    sanitizedKey,
    boardSnapshot,
    historySummary,
  ]);

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
    setActiveQuest(null);
  };

  const handleBoardSizeChange = (nextSize: number) => {
    if (nextSize === boardSize) {
      return;
    }
    setBoardSize(nextSize);
    setMoves([]);
    setActiveQuest(null);
  };

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
              footer={<PanelStatusLine status={rememberStatus} />}
            />
            <InsightPanel
              title="Quick thoughts"
              subtitle="Snap impressions to keep the flow moving."
              items={quickThoughts}
              footer={<PanelStatusLine status={quickThoughtsStatus} />}
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
              items={recentThoughts}
              footer={<PanelStatusLine status={recentStatus} />}
            />
          </div>
          <div className="flex flex-col gap-6">
            <InsightPanel
              title="Possible quests"
              subtitle="Optional prompts to stretch the position."
              items={questItems}
              footer={<PanelStatusLine status={questStatus} />}
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

function PanelStatusLine({ status }: { status: PanelStatus }) {
  let indicatorClasses = "h-2 w-2 rounded-full";
  let messageClasses = "";

  switch (status.state) {
    case "loading":
      indicatorClasses += " bg-cyan-400 animate-pulse";
      break;
    case "error":
      indicatorClasses += " bg-rose-400";
      messageClasses = "text-rose-500 dark:text-rose-300";
      break;
    default:
      indicatorClasses += " bg-emerald-400";
      break;
  }

  return (
    <div className="flex items-center gap-2">
      <span aria-hidden className={indicatorClasses} />
      <span className={messageClasses}>{status.message}</span>
    </div>
  );
}

function buildRememberFallback(context: PanelContext): InsightItem[] {
  const entries: InsightItem[] = [];

  if (context.lastMove) {
    entries.push({
      id: "latest-move",
      heading: `Latest move · ${colorLabel(context.lastMove.color)}`,
      detail: `Move ${context.lastMove.moveNumber} landed at ${formatCoordinate(
        context.lastMove.row,
        context.lastMove.column
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
      context.totalMoves < 6
        ? "Open the board gently—play with corners and edges to sketch territory."
        : "Look for weak groups. Can you reinforce yours or unsettle your opponent's shape?",
  });

  entries.push({
    id: "spotlight",
    heading: "Spotlight area",
    detail: context.lastMove
      ? `Zoom in around ${formatCoordinate(
          context.lastMove.row,
          context.lastMove.column
        )}. What supporting stones would give it breathing room?`
      : "Glance at the star points. Which one feels like the best anchor today?",
  });

  entries.push({
    id: "board-scale",
    heading: `${boardLabel(context.boardSize)} board`,
    detail: `Resizing to ${context.boardSize}×${context.boardSize} resets the tone—make the choice with care.`,
  });

  return entries;
}

function buildQuickThoughtsFallback(): InsightItem[] {
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

function buildRecentFallback(context: PanelContext): InsightItem[] {
  if (context.moves.length === 0) {
    return [
      {
        id: "recent-empty",
        heading: "Waiting for the first beat",
        detail: "Every move will be reflected here with a quick note.",
      },
    ];
  }

  return [...context.moves]
    .reverse()
    .slice(0, 5)
    .map((move) => ({
      id: `move-${move.moveNumber}`,
      heading: `Move ${move.moveNumber} · ${colorLabel(move.color)}`,
      detail: `Placed at ${formatCoordinate(move.row, move.column)}.`,
      tag: colorLabel(move.color),
    }));
}

function buildQuestFallback(context: PanelContext): InsightItem[] {
  if (!context.lastMove) {
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
        detail: `Before you click, picture how ${context.nextPlayer.toLowerCase()} might answer. That anticipation is the playground.`,
      },
      {
        id: "quest-scale",
        heading: "Feel the scale",
        detail: `Notice how the ${boardLabel(
          context.boardSize
        )} board shifts the rhythm. Where would a wider board invite you to play?`,
        tag: boardLabel(context.boardSize),
      },
    ];
  }

  return [
    {
      id: "quest-link",
      heading: "Extend from your last move",
      detail: `Sketch a connection from ${formatCoordinate(
        context.lastMove.row,
        context.lastMove.column
      )} that strengthens the group.`,
      tag: "Connect",
    },
    {
      id: "quest-counter",
      heading: `Prepare for ${context.nextPlayer}`,
      detail: `What sente move could ${context.nextPlayer.toLowerCase()} play now? Note two candidates before playing on.`,
    },
    {
      id: "quest-reflect",
      heading: "Reflect out loud",
      detail:
        "Narrate why the last stone felt right. Giving it language helps the playground adapt.",
    },
  ];
}

async function* rememberStream(context: PanelContext): AsyncGenerator<PanelEmission> {
  const fallback = buildRememberFallback(context);

  if (!context.apiKey) {
    yield {
      items: fallback,
      status: {
        state: "idle",
        message: "Add your OpenRouter key to invite adaptive anchors.",
      },
    };
    return;
  }

  yield {
    items: fallback,
    status: {
      state: "loading",
      message: "Listening for AI reflections on the current shape…",
    },
  };

  try {
    const aiItems = await requestPanelItems(
      context,
      buildRememberRequest,
      "remember",
      fallback
    );
    yield {
      items: aiItems,
      status: {
        state: "ready",
        message: "AI refreshed these anchors moments ago.",
      },
    };
  } catch (error) {
    console.error("Unable to refresh remember panel", error);
    yield {
      items: fallback,
      status: {
        state: "error",
        message: "Falling back to heuristics while AI reconnects.",
      },
    };
  }
}

async function* quickThoughtsStream(
  context: PanelContext
): AsyncGenerator<PanelEmission> {
  const fallback = buildQuickThoughtsFallback();

  if (!context.apiKey) {
    yield {
      items: fallback,
      status: {
        state: "idle",
        message: "Enter an OpenRouter key to receive live quick thoughts.",
      },
    };
    return;
  }

  yield {
    items: fallback,
    status: {
      state: "loading",
      message: "Gathering moment-to-moment reads from the board…",
    },
  };

  try {
    const aiItems = await requestPanelItems(
      context,
      buildQuickThoughtsRequest,
      "quick",
      fallback
    );
    yield {
      items: aiItems,
      status: {
        state: "ready",
        message: "Quick thoughts tuned to the current flow.",
      },
    };
  } catch (error) {
    console.error("Unable to refresh quick thoughts", error);
    yield {
      items: fallback,
      status: {
        state: "error",
        message: "Showing baseline reminders while AI pauses.",
      },
    };
  }
}

async function* recentThoughtsStream(
  context: PanelContext
): AsyncGenerator<PanelEmission> {
  const fallback = buildRecentFallback(context);

  if (context.moves.length === 0) {
    yield {
      items: fallback,
      status: {
        state: context.apiKey ? "idle" : "idle",
        message: context.apiKey
          ? "Waiting for the first stone before syncing summaries."
          : "Play a move and add your OpenRouter key to invite summaries.",
      },
    };
    return;
  }

  if (!context.apiKey) {
    yield {
      items: fallback,
      status: {
        state: "idle",
        message: "Add your OpenRouter key to layer AI reflections over recent moves.",
      },
    };
    return;
  }

  yield {
    items: fallback,
    status: {
      state: "loading",
      message: "Summarizing the latest sequence…",
    },
  };

  try {
    const aiItems = await requestPanelItems(
      context,
      buildRecentRequest,
      "recent",
      fallback
    );
    yield {
      items: aiItems,
      status: {
        state: "ready",
        message: "Recent thoughts refreshed just now.",
      },
    };
  } catch (error) {
    console.error("Unable to refresh recent thoughts", error);
    yield {
      items: fallback,
      status: {
        state: "error",
        message: "Falling back to literal move log while AI reconnects.",
      },
    };
  }
}

async function* questStream(context: PanelContext): AsyncGenerator<PanelEmission> {
  const fallback = buildQuestFallback(context);

  if (!context.apiKey) {
    yield {
      items: fallback,
      status: {
        state: "idle",
        message: "Add your OpenRouter key to surface adaptive quests.",
      },
    };
    return;
  }

  yield {
    items: fallback,
    status: {
      state: "loading",
      message: "Checking the board for fresh quests…",
    },
  };

  try {
    const aiItems = await requestPanelItems(
      context,
      buildQuestRequest,
      "quest",
      fallback
    );
    yield {
      items: aiItems,
      status: {
        state: "ready",
        message: "Quests refreshed based on the live board.",
      },
    };
  } catch (error) {
    console.error("Unable to refresh quests", error);
    yield {
      items: fallback,
      status: {
        state: "error",
        message: "Showing evergreen quests while AI regains its footing.",
      },
    };
  }
}

async function requestPanelItems(
  context: PanelContext,
  buildRequest: (context: PanelContext) => OpenRouterChatCompletionRequest,
  prefix: string,
  fallback: InsightItem[]
): Promise<InsightItem[]> {
  if (!context.apiKey) {
    throw new Error("Missing OpenRouter API key.");
  }

  const response = await createOpenRouterChatCompletion(
    context.apiKey,
    buildRequest(context)
  );
  const content = response.choices?.[0]?.message?.content;
  const items = parseInsightItems(content, prefix);
  return items.length > 0 ? items : fallback;
}

function buildRememberRequest(
  context: PanelContext
): OpenRouterChatCompletionRequest {
  return {
    model: "openrouter/anthropic/claude-3-haiku",
    temperature: 0.6,
    messages: [
      {
        role: "system",
        content:
          "You are a calm Go coach. Offer four short anchors that keep a player grounded. Respond strictly as JSON array.",
      },
      {
        role: "user",
        content: formatPanelPrompt(context, {
          request:
            "Provide four anchors to remember right now. Each item needs heading, detail, and optional tag.",
        }),
      },
    ],
  };
}

function buildQuickThoughtsRequest(
  context: PanelContext
): OpenRouterChatCompletionRequest {
  return {
    model: "openrouter/google/gemini-flash-1.5",
    temperature: 0.8,
    messages: [
      {
        role: "system",
        content:
          "You offer nimble tactical flashes without overwhelming the player. Keep language light and encouraging. Respond as JSON array.",
      },
      {
        role: "user",
        content: formatPanelPrompt(context, {
          request:
            "Return three quick impressions that highlight immediate patterns or follow-ups. Include heading, detail, optional tag.",
        }),
      },
    ],
  };
}

function buildRecentRequest(
  context: PanelContext
): OpenRouterChatCompletionRequest {
  return {
    model: "openrouter/openai/gpt-4o-mini",
    temperature: 0.4,
    messages: [
      {
        role: "system",
        content:
          "You summarize the most recent Go moves with gentle commentary. Respond as JSON array of items with heading/detail/tag.",
      },
      {
        role: "user",
        content: formatPanelPrompt(context, {
          request:
            "Reflect on the last few moves. Provide up to four notes capturing flow, threats, or rhythm.",
        }),
      },
    ],
  };
}

function buildQuestRequest(
  context: PanelContext
): OpenRouterChatCompletionRequest {
  return {
    model: "openrouter/meta-llama/llama-3-70b-instruct",
    temperature: 0.9,
    messages: [
      {
        role: "system",
        content:
          "You design gentle Go quests that nudge exploration without forcing lines. Respond as JSON array.",
      },
      {
        role: "user",
        content: formatPanelPrompt(context, {
          request:
            "Offer three optional quests or experiments the player could explore next. Each item should have heading, detail, optional tag.",
        }),
      },
    ],
  };
}

function formatPanelPrompt(
  context: PanelContext,
  options: { request: string }
) {
  const activeQuestLine = context.activeQuest
    ? `Active quest focus: ${context.activeQuest}.`
    : "No active quest selected yet.";

  return [
    `Board size: ${context.boardSize}×${context.boardSize}.`,
    `Next player: ${context.nextPlayer}. Total moves played: ${context.totalMoves}.`,
    activeQuestLine,
    "Board snapshot (top row first):",
    context.boardSnapshot,
    "Recent move history:",
    context.historySummary || "None yet.",
    options.request,
    "Respond ONLY with JSON array of insight items. Each item requires keys: heading (string), detail (string), optional tag (string).",
  ].join("\n");
}

function parseInsightItems(content: string | undefined, prefix: string): InsightItem[] {
  if (!content) {
    throw new Error("OpenRouter response had no content.");
  }

  const payload = extractJsonPayload(content);
  const parsed = JSON.parse(payload);
  const itemsArray = Array.isArray(parsed)
    ? parsed
    : Array.isArray((parsed as { items?: unknown }).items)
    ? (parsed as { items?: InsightItem[] }).items
    : null;

  if (!itemsArray) {
    throw new Error("OpenRouter response did not include an items array.");
  }

  return itemsArray.map((entry, index) => {
    const safeEntry = entry as Record<string, unknown>;
    const heading = ensureString(safeEntry.heading, `Idea ${index + 1}`);
    const detail = ensureOptionalString(safeEntry.detail);
    const tag = ensureOptionalString(safeEntry.tag);

    return {
      id: `${prefix}-${index}`,
      heading,
      detail,
      tag: tag || undefined,
    };
  });
}

function ensureString(value: unknown, fallback: string): string {
  return typeof value === "string" && value.trim().length > 0
    ? value.trim()
    : fallback;
}

function ensureOptionalString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim().length > 0
    ? value.trim()
    : undefined;
}

function extractJsonPayload(raw: string): string {
  const fencedMatch = raw.match(/```json([\s\S]*?)```/i);
  const candidate = (fencedMatch ? fencedMatch[1] : raw).trim();

  const arrayStart = candidate.indexOf("[");
  const arrayEnd = candidate.lastIndexOf("]");
  if (arrayStart !== -1 && arrayEnd !== -1 && arrayEnd > arrayStart) {
    return candidate.slice(arrayStart, arrayEnd + 1);
  }

  const objectStart = candidate.indexOf("{");
  const objectEnd = candidate.lastIndexOf("}");
  if (objectStart !== -1 && objectEnd !== -1 && objectEnd > objectStart) {
    return candidate.slice(objectStart, objectEnd + 1);
  }

  return candidate;
}

function renderBoardSnapshot(boardSize: number, moves: LoggedMove[]): string {
  const grid = Array.from({ length: boardSize }, () =>
    Array.from({ length: boardSize }, () => "·")
  );

  moves.forEach((move) => {
    const symbol = move.color === "black" ? "●" : "○";
    const rowIndex = boardSize - move.row - 1;
    grid[rowIndex][move.column] = symbol;
  });

  const header = [
    "  ",
    Array.from({ length: boardSize }, (_, column) => columnLabel(column)).join(" "),
  ].join(" ");

  const rows = grid
    .map((row, index) => {
      const label = String(boardSize - index).padStart(2, " ");
      return `${label} ${row.join(" ")}`;
    })
    .join("\n");

  return `${header}\n${rows}`;
}

function columnLabel(column: number) {
  const letters = "ABCDEFGHJKLMNOPQRSTUVWXYZ";
  return letters[column] ?? String.fromCharCode(65 + column);
}

function formatHistorySummary(moves: LoggedMove[]): string {
  if (moves.length === 0) {
    return "";
  }

  return moves
    .slice(-8)
    .map(
      (move) =>
        `Move ${move.moveNumber} (${colorLabel(move.color)}): ${formatCoordinate(
          move.row,
          move.column
        )}`
    )
    .join("\n");
}

const DEFAULT_PANEL_CONTEXT: PanelContext = {
  boardSize: 9,
  moves: [],
  lastMove: undefined,
  totalMoves: 0,
  nextPlayer: "Black",
  activeQuest: null,
  apiKey: null,
  boardSnapshot: renderBoardSnapshot(9, []),
  historySummary: "",
};
