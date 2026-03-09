import OpenAI from "openai";
import { sanitizeMessages, validateApiKey } from "./security";
import type { PromptResult } from "./prompt-orchestrator";

const MODELS = {
  simple: process.env.OPENAI_MODEL_SIMPLE || "gpt-4o-mini",
  complex: process.env.OPENAI_MODEL_COMPLEX || "gpt-4o",
  fallback: process.env.OPENAI_MODEL_SIMPLE || "gpt-4o-mini",
};

const RETRY_CONFIG = {
  max_retries: 3,
  timeout_ms: 15000,
  base_delay_ms: 500,
} as const;

function createOpenAIClient(): OpenAI {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!validateApiKey(apiKey)) {
    throw new Error(
      "OPENAI_API_KEY is missing or invalid. Set it as an environment variable."
    );
  }

  return new OpenAI({ apiKey });
}

let _client: OpenAI | null = null;
function getClient(): OpenAI {
  if (!_client) _client = createOpenAIClient();
  return _client;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isRetryableError(error: unknown): boolean {
  if (error instanceof OpenAI.APIError) {
    return [429, 500, 502, 503].includes(error.status ?? 0);
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

async function callOpenAI(options: ApiCallOptions): Promise<string> {
  const client = getClient();

  const rawMessages: Array<{ role: "system" | "user"; content: string }> = [
    { role: "system", content: options.systemPrompt },
    { role: "user", content: options.userPrompt },
  ];

  const { messages, totalRedactions } = sanitizeMessages(rawMessages, true);
  if (totalRedactions > 0) {
    console.log(`[Security] Redacted ${totalRedactions} PII item(s) before API call`);
  }

  let lastError: unknown = null;

  for (let attempt = 1; attempt <= RETRY_CONFIG.max_retries; attempt++) {
    try {
      const requestOptions: OpenAI.Chat.ChatCompletionCreateParamsNonStreaming = {
        model: options.model,
        messages,
        temperature: options.temperature,
        max_tokens: options.maxTokens,
      };

      if (options.jsonMode) {
        requestOptions.response_format = { type: "json_object" };
      }

      const response = await withTimeout(
        client.chat.completions.create(requestOptions),
        RETRY_CONFIG.timeout_ms
      );

      const content = response.choices[0]?.message?.content?.trim();
      if (!content) throw new Error("Empty response from LLM");
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
    const content = await callOpenAI({
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
      const content = await callOpenAI({
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

  let totalRedactions = 0;
  for (const msg of messages) {
    if (msg.role === "user" || msg.role === "system") {
      const { messages: sanitized, totalRedactions: count } = sanitizeMessages([msg], true);
      msg.content = sanitized[0].content;
      totalRedactions += count;
    }
  }
  if (totalRedactions > 0) {
    console.log(`[Security] Redacted ${totalRedactions} PII item(s) in chat`);
  }

  let lastError: unknown = null;

  for (let attempt = 1; attempt <= RETRY_CONFIG.max_retries; attempt++) {
    try {
      const response = await withTimeout(
        client.chat.completions.create({
          model: MODELS.complex,
          messages,
          max_tokens: maxTokens,
        }),
        RETRY_CONFIG.timeout_ms
      );

      const content = response.choices[0]?.message?.content?.trim();
      if (!content) throw new Error("Empty response from LLM");
      const latencyMs = Date.now() - startTime;
      const estTokens = Math.ceil(content.length / 4);
      console.log(`[API Gateway] task=ai_chat model=${MODELS.complex} latency=${latencyMs}ms est_tokens=${estTokens} turns=${messages.length} fallback=false`);
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
        client.chat.completions.create({
          model: MODELS.fallback,
          messages,
          max_tokens: maxTokens,
        }),
        RETRY_CONFIG.timeout_ms
      );
      const content = response.choices[0]?.message?.content?.trim() || "";
      const latencyMs = Date.now() - fallbackStart;
      console.log(`[API Gateway] task=ai_chat model=${MODELS.fallback} latency=${latencyMs}ms turns=${messages.length} fallback=true`);
      return content;
    } catch {
      console.error(`[API Gateway] Chat fallback also failed after ${Date.now() - fallbackStart}ms`);
    }
  }

  throw lastError instanceof Error
    ? lastError
    : new Error(`Chat API call failed after all retries (total ${Date.now() - startTime}ms)`);
}
