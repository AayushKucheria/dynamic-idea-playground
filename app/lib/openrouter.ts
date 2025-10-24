export interface OpenRouterMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface OpenRouterChatCompletionRequest {
  model: string;
  messages: OpenRouterMessage[];
  temperature?: number;
  max_tokens?: number;
  top_p?: number;
}

interface OpenRouterChoice {
  message?: {
    role?: string;
    content?: string;
  };
}

export interface OpenRouterChatCompletionResponse {
  id: string;
  choices: OpenRouterChoice[];
}

export async function createOpenRouterChatCompletion(
  apiKey: string,
  request: OpenRouterChatCompletionRequest
): Promise<OpenRouterChatCompletionResponse> {
  if (!apiKey) {
    throw new Error("Missing OpenRouter API key.");
  }

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${apiKey}`,
  };

  if (typeof window !== "undefined") {
    headers["HTTP-Referer"] = window.location.origin;
    headers["X-Title"] = document.title || "Dynamic Idea Playground";
  }

  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers,
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    const message = await safeReadError(response);
    throw new Error(
      message || `OpenRouter request failed with status ${response.status}`
    );
  }

  return (await response.json()) as OpenRouterChatCompletionResponse;
}

async function safeReadError(response: Response) {
  try {
    const data = await response.json();
    if (typeof data === "object" && data && "error" in data) {
      const errorData = (data as { error?: { message?: string } }).error;
      return errorData?.message;
    }
  } catch (error) {
    console.error("Failed to parse OpenRouter error response", error);
  }

  try {
    return await response.text();
  } catch (error) {
    console.error("Failed to read OpenRouter error text", error);
    return undefined;
  }
}
