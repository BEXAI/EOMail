/**
 * EOMail.co — System Wrapper: API Gateway
 * The execution layer interfacing with LLM providers.
 * Handles: model routing, exponential backoff retry, fallback chaining,
 * timeout enforcement, and provider abstraction.
 */

import OpenAI from "openai";
import { sanitizeMessages, validateApiKey } from "./security";
import type { TaskComplexity, PromptResult } from "./prompt-orchestrator";

// ─── Model Routing Config ─────────────────────────────────────────────────────

const MODELS = {
  // Simple tasks: low latency, cost-efficient
  simple: "gpt-4o-mini",
  // Complex tasks: high reasoning, multi-step synthesis
  complex: "gpt-4o",
  // Fallback chain if primary model fails
  fallback: "gpt-4o-mini",
} as const;

// ─── Resilience Config ────────────────────────────────────────────────────────

const RETRY_CONFIG = {
  max_retries: 3,
  timeout_ms: 15000,
  base_delay_ms: 500, // Doubles on each retry (exponential backoff)
} as const;

// ─── OpenAI Client Setup ──────────────────────────────────────────────────────

function createOpenAIClient(): OpenAI {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!validateApiKey(apiKey)) {
    throw new Error(
      "OPENAI_API_KEY is missing or invalid. Add it to Replit Secrets."
    );
  }

  return new OpenAI({ apiKey });
}

// Lazy singleton — only instantiated on first call
let _client: OpenAI | null = null;
function getClient(): OpenAI {
  if (!_client) _client = createOpenAIClient();
  return _client;
}

// ─── Retry Utilities ──────────────────────────────────────────────────────────

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isRetryableError(error: unknown): boolean {
  if (error instanceof OpenAI.APIError) {
    // Retry on rate limit (429), server errors (500, 502, 503)
    return [429, 500, 502, 503].includes(error.status ?? 0);
  }
  // Retry on network timeouts
  if (error instanceof Error && error.message.includes("timeout")) return true;
  return false;
}

/**
 * Wraps a promise with a timeout.
 */
function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  const timeout = new Promise<never>((_, reject) =>
    setTimeout(() => reject(new Error(`Request timed out after ${ms}ms`)), ms)
  );
  return Promise.race([promise, timeout]);
}

// ─── Core API Call with Exponential Backoff ────────────────────────────────────

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

  // Apply PII redaction to user messages before transmission
  const { messages, totalRedactions } = sanitizeMessages(rawMessages);
  if (totalRedactions > 0) {
    console.log(`[Security] Redacted ${totalRedactions} PII item(s) before API call`);
  }

  let lastError: unknown = null;

  for (let attempt = 1; attempt <= RETRY_CONFIG.max_retries; attempt++) {
    try {
      const requestOptions: OpenAI.Chat.ChatCompletionCreateParamsNonStreaming =
        {
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
        // Exponential backoff: 500ms, 1000ms, 2000ms
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

// ─── Main Gateway Execute Function ────────────────────────────────────────────

export interface GatewayResponse {
  content: string;
  model: string;
  usedFallback: boolean;
  taskType: string;
}

/**
 * Executes a prompt through the API Gateway.
 * Routes to the correct model based on task complexity,
 * applies retry logic, and falls back if the primary model fails.
 */
export async function executePrompt(
  promptResult: PromptResult,
  options?: { jsonMode?: boolean }
): Promise<GatewayResponse> {
  const primaryModel =
    promptResult.complexity === "complex" ? MODELS.complex : MODELS.simple;

  // ── Attempt primary model ─────────────────────────────────────────────────
  try {
    const content = await callOpenAI({
      systemPrompt: promptResult.systemPrompt,
      userPrompt: promptResult.userPrompt,
      model: primaryModel,
      temperature: promptResult.temperature,
      maxTokens: promptResult.maxTokens,
      jsonMode: options?.jsonMode,
    });

    return {
      content,
      model: primaryModel,
      usedFallback: false,
      taskType: promptResult.taskType,
    };
  } catch (primaryError) {
    console.error(
      `[API Gateway] Primary model (${primaryModel}) failed:`,
      primaryError instanceof Error ? primaryError.message : primaryError
    );
  }

  // ── Fallback model chaining ───────────────────────────────────────────────
  if (primaryModel !== MODELS.fallback) {
    console.log(`[API Gateway] Falling back to ${MODELS.fallback}...`);
    try {
      const content = await callOpenAI({
        systemPrompt: promptResult.systemPrompt,
        userPrompt: promptResult.userPrompt,
        model: MODELS.fallback,
        temperature: promptResult.temperature,
        maxTokens: promptResult.maxTokens,
        jsonMode: options?.jsonMode,
      });

      return {
        content,
        model: MODELS.fallback,
        usedFallback: true,
        taskType: promptResult.taskType,
      };
    } catch (fallbackError) {
      console.error(
        `[API Gateway] Fallback model also failed:`,
        fallbackError instanceof Error ? fallbackError.message : fallbackError
      );
    }
  }

  throw new Error(
    `[API Gateway] All models failed for task: ${promptResult.taskType}`
  );
}

/**
 * Convenience: execute and parse JSON response.
 */
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
