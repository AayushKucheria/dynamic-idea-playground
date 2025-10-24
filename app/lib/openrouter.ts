export interface OpenRouterMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface OpenRouterChatRequest {
  model: string;
  messages: OpenRouterMessage[];
  temperature?: number;
  max_tokens?: number;
}

export interface OpenRouterChatResponse {
  choices?: Array<{
    message?: {
      role?: string;
      content?: string;
    };
  }>;
}

export async function requestChatCompletion(
  apiKey: string,
  request: OpenRouterChatRequest,
  signal?: AbortSignal
): Promise<string> {
  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
      "X-Title": "Dynamic Idea Playground",
    },
    body: JSON.stringify(request),
    signal,
  });

  if (!response.ok) {
    const errorText = await safeReadText(response);
    throw new Error(
      `OpenRouter request failed (${response.status}): ${errorText || response.statusText}`
    );
  }

  const payload = (await response.json()) as OpenRouterChatResponse;
  const content = payload.choices?.[0]?.message?.content;
  if (typeof content !== "string" || content.length === 0) {
    throw new Error("OpenRouter response did not include any message content.");
  }

  return content;
}

async function safeReadText(response: Response) {
  try {
    return await response.text();
  } catch (error) {
    console.warn("Failed to read OpenRouter error response", error);
    return "";
  }
}
