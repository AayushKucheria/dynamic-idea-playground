import { NextResponse } from "next/server";

import { GoMove, colorLabel, formatCoordinate } from "@/app/lib/go";

const DEFAULT_OPENROUTER_MODEL =
  process.env.OPENROUTER_QUEST_MODEL ?? "anthropic/claude-3.5-haiku";

interface QuestItemPayload {
  id?: string;
  heading: string;
  detail?: string;
}

interface QuestAgentRequestBody {
  boardSize: number;
  nextPlayer: string;
  moves: Array<GoMove & { moveNumber?: number }>;
  quest: QuestItemPayload;
}

interface OpenRouterChoice {
  message?: {
    content?: string | Array<{ type?: string; text?: string }>;
  };
}

interface OpenRouterResponse {
  choices?: OpenRouterChoice[];
}

export async function POST(request: Request) {
  let payload: QuestAgentRequestBody;

  try {
    payload = (await request.json()) as QuestAgentRequestBody;
  } catch (error) {
    console.error("Failed to parse quest agent payload", error);
    return NextResponse.json(
      { error: "Invalid request body." },
      { status: 400 }
    );
  }

  if (!payload?.quest?.heading) {
    return NextResponse.json(
      { error: "Quest heading is required." },
      { status: 400 }
    );
  }

  if (!payload.boardSize || payload.boardSize < 1) {
    return NextResponse.json(
      { error: "Board size must be provided." },
      { status: 400 }
    );
  }

  const apiKey = process.env.OPENROUTER_API_KEY;

  if (!apiKey) {
    console.error("OPENROUTER_API_KEY is not configured.");
    return NextResponse.json(
      { error: "Quest agent is not configured." },
      { status: 500 }
    );
  }

  const boardSummary = buildBoardSummary(
    payload.moves ?? [],
    payload.boardSize
  );

  const systemPrompt = `You are a calm Go strategy companion living inside the Dynamic Idea Playground. Offer at most three short, encouraging suggestions grounded in the current quest and board state. Respond using JSON with the shape {"suggestions": ["..."]}. Avoid additional narration outside of the JSON.`;

  const detail = payload.quest.detail?.trim();
  const questDetail = detail ? `Quest detail: ${detail}` : null;

  const userPromptParts = [
    `Board: ${payload.boardSize}×${payload.boardSize}`,
    boardSummary,
    `Next to play: ${payload.nextPlayer}`,
    `Quest focus: ${payload.quest.heading}`,
    questDetail,
    "Please return calm strategic nudges as JSON only.",
  ].filter(Boolean);

  try {
    const completionResponse = await fetch(
      "https://openrouter.ai/api/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
          "HTTP-Referer": process.env.OPENROUTER_SITE_URL ??
            "https://dynamic-idea-playground.local",
          "X-Title": "Dynamic Idea Playground",
        },
        body: JSON.stringify({
          model: DEFAULT_OPENROUTER_MODEL,
          messages: [
            {
              role: "system",
              content: systemPrompt,
            },
            {
              role: "user",
              content: userPromptParts.join("\n\n"),
            },
          ],
          stream: false,
        }),
      }
    );

    if (!completionResponse.ok) {
      const errorPayload = await completionResponse.text();
      console.error("Quest agent call failed", errorPayload);
      return NextResponse.json(
        { error: "Quest agent request failed." },
        { status: 502 }
      );
    }

    const completion = (await completionResponse.json()) as OpenRouterResponse;
    const messageContent = extractMessageContent(completion.choices?.[0]);

    const parsedSuggestions = parseSuggestions(messageContent);

    return NextResponse.json({
      suggestions: parsedSuggestions.suggestions,
      raw: parsedSuggestions.raw,
    });
  } catch (error) {
    console.error("Quest agent pipeline error", error);
    return NextResponse.json(
      { error: "Quest agent request could not be completed." },
      { status: 500 }
    );
  }
}

function buildBoardSummary(
  moves: Array<GoMove & { moveNumber?: number }>,
  boardSize: number
) {
  if (!moves.length) {
    return `Board state: a ${boardSize}×${boardSize} grid with no stones yet.`;
  }

  const lines = moves.map((move, index) => {
    const moveNumber = move.moveNumber ?? index + 1;
    return `${moveNumber}. ${colorLabel(move.color)} → ${formatCoordinate(
      move.row,
      move.column
    )}`;
  });

  return `Board state on a ${boardSize}×${boardSize} board after ${moves.length} move(s):\n${lines.join("\n")}`;
}

function extractMessageContent(choice?: OpenRouterChoice) {
  if (!choice?.message?.content) {
    return "";
  }

  const { content } = choice.message;

  if (typeof content === "string") {
    return content;
  }

  return content
    .map((entry) => (typeof entry === "string" ? entry : entry?.text ?? ""))
    .join("");
}

function parseSuggestions(content: string) {
  const trimmed = content?.trim() ?? "";

  if (!trimmed) {
    return { suggestions: [], raw: "" };
  }

  try {
    const parsed = JSON.parse(trimmed) as { suggestions?: unknown };
    if (Array.isArray(parsed.suggestions)) {
      const suggestions = parsed.suggestions
        .map((entry) =>
          typeof entry === "string" ? entry.trim() : String(entry)
        )
        .filter((entry) => entry.length > 0);
      if (suggestions.length > 0) {
        return { suggestions, raw: trimmed };
      }
    }
  } catch (error) {
    console.warn("Quest agent JSON parse fallback", error);
  }

  const fallbackSuggestions = trimmed
    .split(/\n+/)
    .map((line) => line.replace(/^[-•\s]+/, "").trim())
    .filter((line) => line.length > 0)
    .slice(0, 3);

  return { suggestions: fallbackSuggestions, raw: trimmed };
}
