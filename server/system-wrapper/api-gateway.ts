import Anthropic from "@anthropic-ai/sdk";
import { sanitizeMessages, validateApiKey } from "./security";
import type { PromptResult } from "./prompt-orchestrator";

const MODELS = {
  simple: process.env.CLAUDE_MODEL_SIMPLE || "claude-sonnet-4-5-20250929",
  complex: process.env.CLAUDE_MODEL_COMPLEX || "claude-opus-4-6",
  fallback: process.env.CLAUDE_MODEL_SIMPLE || "claude-sonnet-4-5-20250929",
};

const RETRY_CONFIG = {
  max_retries: 3,
  timeout_ms: 30000,
  base_delay_ms: 500,
} as const;

function createAnthropicClient(): Anthropic {
  const apiKey = process.env.ANTHROPIC_API_KEY;

  if (!validateApiKey(apiKey)) {
    throw new Error(
      "ANTHROPIC_API_KEY is missing or invalid. Set it as an environment variable."
    );
  }

  return new Anthropic({ apiKey });
}

let _client: Anthropic | null = null;
function getClient(): Anthropic {
  if (!_client) _client = createAnthropicClient();
  return _client;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isRetryableError(error: unknown): boolean {
  if (error instanceof Anthropic.APIError) {
    return [429, 500, 502, 503, 529].includes(error.status ?? 0);
  }
  if (error instanceof Error && error.message.includes("timeout")) return true;
  return false;
}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  let timer: ReturnType<typeof setTimeout>;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error(`Request timed out after ${ms}ms`)), ms);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

interface ApiCallOptions {
  systemPrompt: string;
  userPrompt: string;
  model: string;
  temperature: number;
  maxTokens: number;
  jsonMode?: boolean;
}

async function callClaude(options: ApiCallOptions): Promise<string> {
  const client = getClient();

  const rawMessages: Array<{ role: string; content: string }> = [
    { role: "system", content: options.systemPrompt },
    { role: "user", content: options.userPrompt },
  ];

  const { messages: sanitized, totalRedactions } = sanitizeMessages(rawMessages, true);
  if (totalRedactions > 0) {
    console.log(`[Security] Redacted ${totalRedactions} PII item(s) before API call`);
  }

  const systemContent = sanitized.find((m) => m.role === "system")?.content || "";
  const userContent = sanitized.find((m) => m.role === "user")?.content || "";

  const messages: Anthropic.MessageParam[] = [
    { role: "user", content: userContent },
  ];

  // For JSON mode: add assistant prefill to guide JSON output
  if (options.jsonMode) {
    messages.push({ role: "assistant", content: "{" });
  }

  let lastError: unknown = null;

  for (let attempt = 1; attempt <= RETRY_CONFIG.max_retries; attempt++) {
    try {
      const response = await withTimeout(
        client.messages.create({
          model: options.model,
          system: systemContent,
          messages,
          temperature: options.temperature,
          max_tokens: options.maxTokens,
        }),
        RETRY_CONFIG.timeout_ms
      );

      const block = response.content[0];
      if (!block || block.type !== "text" || !block.text.trim()) {
        throw new Error("Empty response from LLM");
      }

      let content = block.text.trim();

      // For JSON mode: prepend the "{" we used as prefill
      if (options.jsonMode) {
        content = "{" + content;
      }

      return content;
    } catch (error) {
      lastError = error;
      console.warn(
        `[API Gateway] Attempt ${attempt}/${RETRY_CONFIG.max_retries} failed:`,
        error instanceof Error ? error.message : error
      );

      if (attempt < RETRY_CONFIG.max_retries && isRetryableError(error)) {
        const delay = RETRY_CONFIG.base_delay_ms * Math.pow(2, attempt - 1);
        console.log(`[API Gateway] Retrying in ${delay}ms...`);
        await sleep(delay);
      } else {
        break;
      }
    }
  }

  throw lastError instanceof Error
    ? lastError
    : new Error("API call failed after all retries");
}

export interface GatewayResponse {
  content: string;
  model: string;
  usedFallback: boolean;
  taskType: string;
}

export async function executePrompt(
  promptResult: PromptResult,
  options?: { jsonMode?: boolean }
): Promise<GatewayResponse> {
  const primaryModel =
    promptResult.complexity === "complex" ? MODELS.complex : MODELS.simple;
  const startTime = Date.now();

  try {
    const content = await callClaude({
      systemPrompt: promptResult.systemPrompt,
      userPrompt: promptResult.userPrompt,
      model: primaryModel,
      temperature: promptResult.temperature,
      maxTokens: promptResult.maxTokens,
      jsonMode: options?.jsonMode,
    });

    const latencyMs = Date.now() - startTime;
    const estTokens = Math.ceil(content.length / 4);
    console.log(`[API Gateway] task=${promptResult.taskType} model=${primaryModel} latency=${latencyMs}ms est_tokens=${estTokens} fallback=false`);

    return {
      content,
      model: primaryModel,
      usedFallback: false,
      taskType: promptResult.taskType,
    };
  } catch (primaryError) {
    console.error(
      `[API Gateway] Primary model (${primaryModel}) failed after ${Date.now() - startTime}ms:`,
      primaryError instanceof Error ? primaryError.message : primaryError
    );
  }

  if (primaryModel !== MODELS.fallback) {
    console.log(`[API Gateway] Falling back to ${MODELS.fallback} for task=${promptResult.taskType}...`);
    const fallbackStart = Date.now();
    try {
      const content = await callClaude({
        systemPrompt: promptResult.systemPrompt,
        userPrompt: promptResult.userPrompt,
        model: MODELS.fallback,
        temperature: promptResult.temperature,
        maxTokens: promptResult.maxTokens,
        jsonMode: options?.jsonMode,
      });

      const latencyMs = Date.now() - fallbackStart;
      const estTokens = Math.ceil(content.length / 4);
      console.log(`[API Gateway] task=${promptResult.taskType} model=${MODELS.fallback} latency=${latencyMs}ms est_tokens=${estTokens} fallback=true`);

      return {
        content,
        model: MODELS.fallback,
        usedFallback: true,
        taskType: promptResult.taskType,
      };
    } catch (fallbackError) {
      console.error(
        `[API Gateway] Fallback model also failed after ${Date.now() - fallbackStart}ms:`,
        fallbackError instanceof Error ? fallbackError.message : fallbackError
      );
    }
  }

  throw new Error(
    `[API Gateway] All models failed for task: ${promptResult.taskType} (total ${Date.now() - startTime}ms)`
  );
}

export async function executeJsonPrompt<T>(
  promptResult: PromptResult
): Promise<T> {
  const response = await executePrompt(promptResult, { jsonMode: true });
  try {
    return JSON.parse(response.content) as T;
  } catch {
    throw new Error(
      `[API Gateway] Failed to parse JSON response for task ${promptResult.taskType}: ${response.content}`
    );
  }
}

export async function executeMultiTurnChat(
  messages: Array<{ role: "system" | "user" | "assistant"; content: string }>,
  maxTokens: number = 2048
): Promise<string> {
  const client = getClient();
  const startTime = Date.now();

  // Extract system message and separate user/assistant messages
  let systemContent = "";
  const chatMessages: Array<{ role: "user" | "assistant"; content: string }> = [];

  let totalRedactions = 0;
  for (const msg of messages) {
    if (msg.role === "system") {
      const { messages: sanitized, totalRedactions: count } = sanitizeMessages([msg], true);
      systemContent = sanitized[0].content;
      totalRedactions += count;
    } else {
      if (msg.role === "user") {
        const { messages: sanitized, totalRedactions: count } = sanitizeMessages([msg], false);
        chatMessages.push({ role: "user", content: sanitized[0].content });
        totalRedactions += count;
      } else {
        chatMessages.push({ role: msg.role, content: msg.content });
      }
    }
  }
  if (totalRedactions > 0) {
    console.log(`[Security] Redacted ${totalRedactions} PII item(s) in chat`);
  }

  // Ensure messages start with user role (Anthropic requirement)
  const anthropicMessages: Anthropic.MessageParam[] = [];
  for (const msg of chatMessages) {
    // Merge consecutive same-role messages
    const last = anthropicMessages[anthropicMessages.length - 1];
    if (last && last.role === msg.role) {
      last.content = last.content + "\n\n" + msg.content;
    } else {
      anthropicMessages.push({ role: msg.role, content: msg.content });
    }
  }

  // If first message isn't from user, prepend a user message
  if (anthropicMessages.length === 0 || anthropicMessages[0].role !== "user") {
    anthropicMessages.unshift({ role: "user", content: "Hello" });
  }

  let lastError: unknown = null;

  for (let attempt = 1; attempt <= RETRY_CONFIG.max_retries; attempt++) {
    try {
      const response = await withTimeout(
        client.messages.create({
          model: MODELS.complex,
          system: systemContent,
          messages: anthropicMessages,
          max_tokens: maxTokens,
        }),
        RETRY_CONFIG.timeout_ms
      );

      const block = response.content[0];
      if (!block || block.type !== "text" || !block.text.trim()) {
        throw new Error("Empty response from LLM");
      }

      const content = block.text.trim();
      const latencyMs = Date.now() - startTime;
      const estTokens = Math.ceil(content.length / 4);
      console.log(`[API Gateway] task=ai_chat model=${MODELS.complex} latency=${latencyMs}ms est_tokens=${estTokens} turns=${anthropicMessages.length} fallback=false`);
      return content;
    } catch (error) {
      lastError = error;
      console.warn(
        `[API Gateway] Chat attempt ${attempt}/${RETRY_CONFIG.max_retries} failed:`,
        error instanceof Error ? error.message : error
      );

      if (attempt < RETRY_CONFIG.max_retries && isRetryableError(error)) {
        const delay = RETRY_CONFIG.base_delay_ms * Math.pow(2, attempt - 1);
        await sleep(delay);
      } else {
        break;
      }
    }
  }

  if (MODELS.complex !== MODELS.fallback) {
    console.log(`[API Gateway] Chat falling back to ${MODELS.fallback}...`);
    const fallbackStart = Date.now();
    try {
      const response = await withTimeout(
        client.messages.create({
          model: MODELS.fallback,
          system: systemContent,
          messages: anthropicMessages,
          max_tokens: maxTokens,
        }),
        RETRY_CONFIG.timeout_ms
      );
      const block = response.content[0];
      const content = (block && block.type === "text" ? block.text.trim() : "") || "";
      const latencyMs = Date.now() - fallbackStart;
      console.log(`[API Gateway] task=ai_chat model=${MODELS.fallback} latency=${latencyMs}ms turns=${anthropicMessages.length} fallback=true`);
      return content;
    } catch {
      console.error(`[API Gateway] Chat fallback also failed after ${Date.now() - fallbackStart}ms`);
    }
  }

  throw lastError instanceof Error
    ? lastError
    : new Error(`Chat API call failed after all retries (total ${Date.now() - startTime}ms)`);
}
