export interface OpenRouterChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface OpenRouterChatRequest {
  model: string;
  messages: OpenRouterChatMessage[];
  temperature?: number;
  top_p?: number;
  max_tokens?: number;
}

const OPENROUTER_ENDPOINT = "https://openrouter.ai/api/v1/chat/completions";

export async function requestChatCompletion(
  apiKey: string,
  request: OpenRouterChatRequest,
  signal?: AbortSignal
): Promise<string> {
  const response = await fetch(OPENROUTER_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(request),
    cache: "no-store",
    signal,
  });

  if (!response.ok) {
    let detail = "";
    try {
      detail = await response.text();
    } catch (error) {
      detail = (error as Error)?.message ?? "";
    }

    const message = detail
      ? `${response.status} ${response.statusText}: ${detail}`
      : `${response.status} ${response.statusText}`;
    throw new Error(`OpenRouter request failed: ${message}`);
  }

  const payload = (await response.json()) as {
    choices?: Array<{
      message?: {
        content?: string;
      };
    }>;
  };

  const content = payload.choices?.[0]?.message?.content?.trim();

  if (!content) {
    throw new Error("OpenRouter response did not include content.");
  }

  return content;
}
