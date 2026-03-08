import OpenAI from "openai";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { sanitizeMessages, validateApiKey } from "./security";
import type { PromptResult } from "./prompt-orchestrator";

const MODELS = {
  openai_simple: process.env.OPENAI_MODEL_SIMPLE || "gpt-4o-mini",
  openai_complex: process.env.OPENAI_MODEL_COMPLEX || "gpt-4o",
  gemini_simple: process.env.GEMINI_MODEL_SIMPLE || "gemini-1.5-flash",
  gemini_complex: process.env.GEMINI_MODEL_COMPLEX || "gemini-1.5-pro",
};

const RETRY_CONFIG = {
  max_retries: 3,
  timeout_ms: 20000,
  base_delay_ms: 500,
} as const;

function createOpenAIClient(): OpenAI | null {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey || !validateApiKey(apiKey)) return null;
  return new OpenAI({ apiKey });
}

function createGeminiClient(): GoogleGenerativeAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || !validateApiKey(apiKey)) return null;
  return new GoogleGenerativeAI(apiKey);
}

let _openai: OpenAI | null = null;
let _gemini: GoogleGenerativeAI | null = null;

function getOpenAI(): OpenAI | null {
  if (!_openai) _openai = createOpenAIClient();
  return _openai;
}

function getGemini(): GoogleGenerativeAI | null {
  if (!_gemini) _gemini = createGeminiClient();
  return _gemini;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
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
  temperature: number;
  maxTokens: number;
  jsonMode?: boolean;
}

async function callGemini(options: ApiCallOptions, isComplex: boolean): Promise<string> {
  const genAI = getGemini();
  if (!genAI) throw new Error("GEMINI_API_KEY missing");

  const modelName = isComplex ? MODELS.gemini_complex : MODELS.gemini_simple;
  const model = genAI.getGenerativeModel({
    model: modelName,
    generationConfig: {
      temperature: options.temperature,
      maxOutputTokens: options.maxTokens,
      responseMimeType: options.jsonMode ? "application/json" : "text/plain",
    },
  });

  const prompt = `${options.systemPrompt}\n\n${options.userPrompt}`;

  let lastError: unknown = null;
  for (let attempt = 1; attempt <= RETRY_CONFIG.max_retries; attempt++) {
    try {
      const result = await withTimeout(
        model.generateContent(prompt),
        RETRY_CONFIG.timeout_ms
      );
      const response = await result.response;
      const text = response.text();
      if (!text) throw new Error("Empty response from Gemini");
      return text;
    } catch (error) {
      lastError = error;
      console.warn(`[Gemini Gateway] Attempt ${attempt} failed:`, error instanceof Error ? error.message : error);
      if (attempt < RETRY_CONFIG.max_retries) {
        await sleep(RETRY_CONFIG.base_delay_ms * Math.pow(2, attempt - 1));
      } else {
        break;
      }
    }
  }
  throw lastError;
}

async function callOpenAI(options: ApiCallOptions, isComplex: boolean): Promise<string> {
  const client = getOpenAI();
  if (!client) throw new Error("OPENAI_API_KEY missing");

  const modelName = isComplex ? MODELS.openai_complex : MODELS.openai_simple;
  const rawMessages: Array<{ role: "system" | "user"; content: string }> = [
    { role: "system", content: options.systemPrompt },
    { role: "user", content: options.userPrompt },
  ];

  const { messages, totalRedactions } = sanitizeMessages(rawMessages, true);
  if (totalRedactions > 0) {
    console.log(`[Security] Redacted ${totalRedactions} PII item(s) before OpenAI call`);
  }

  let lastError: unknown = null;
  for (let attempt = 1; attempt <= RETRY_CONFIG.max_retries; attempt++) {
    try {
      const response = await withTimeout(
        client.chat.completions.create({
          model: modelName,
          messages: messages.map(m => ({ role: m.role as "system" | "user", content: m.content })),
          temperature: options.temperature,
          max_tokens: options.maxTokens,
          response_format: options.jsonMode ? { type: "json_object" } : undefined,
          stream: false,
        }),
        RETRY_CONFIG.timeout_ms
      );
      if (!("choices" in response)) throw new Error("Unexpected streaming response");
      const content = response.choices[0]?.message?.content?.trim();
      if (!content) throw new Error("Empty response from OpenAI");
      return content;
    } catch (error) {
      lastError = error;
      console.warn(`[OpenAI Gateway] Attempt ${attempt} failed:`, error instanceof Error ? error.message : error);
      if (attempt < RETRY_CONFIG.max_retries) {
        await sleep(RETRY_CONFIG.base_delay_ms * Math.pow(2, attempt - 1));
      } else {
        break;
      }
    }
  }
  throw lastError;
}

export interface GatewayResponse {
  content: string;
  engine: "gemini" | "openai";
  taskType: string;
}

export async function executePrompt(
  promptResult: PromptResult,
  options?: { jsonMode?: boolean }
): Promise<GatewayResponse> {
  const startTime = Date.now();
  const isComplex = promptResult.complexity === "complex";

  // Priority: Gemini -> OpenAI
  if (process.env.GEMINI_API_KEY) {
    try {
      const content = await callGemini({
        systemPrompt: promptResult.systemPrompt,
        userPrompt: promptResult.userPrompt,
        temperature: promptResult.temperature,
        maxTokens: promptResult.maxTokens,
        jsonMode: options?.jsonMode,
      }, isComplex);

      console.log(`[API Gateway] Engine=Gemini 3 Task=${promptResult.taskType} Latency=${Date.now() - startTime}ms`);
      return { content, engine: "gemini", taskType: promptResult.taskType };
    } catch (error) {
      console.error(`[API Gateway] Gemini failed for ${promptResult.taskType}:`, error instanceof Error ? error.message : error);
    }
  }

  if (process.env.OPENAI_API_KEY) {
    try {
      const content = await callOpenAI({
        systemPrompt: promptResult.systemPrompt,
        userPrompt: promptResult.userPrompt,
        temperature: promptResult.temperature,
        maxTokens: promptResult.maxTokens,
        jsonMode: options?.jsonMode,
      }, isComplex);

      console.log(`[API Gateway] Engine=OpenAI Task=${promptResult.taskType} Latency=${Date.now() - startTime}ms`);
      return { content, engine: "openai", taskType: promptResult.taskType };
    } catch (error) {
      console.error(`[API Gateway] OpenAI failed for ${promptResult.taskType}:`, error instanceof Error ? error.message : error);
    }
  }

  throw new Error(`[API Gateway] All AI engines failed for task: ${promptResult.taskType}`);
}

export async function executeJsonPrompt<T>(promptResult: PromptResult): Promise<T> {
  const response = await executePrompt(promptResult, { jsonMode: true });
  try {
    return JSON.parse(response.content) as T;
  } catch (err) {
    // Some models (like Gemini) might wrap JSON in backticks
    const cleaned = response.content.replace(/```json\s*|```/g, "").trim();
    try {
      return JSON.parse(cleaned) as T;
    } catch {
      throw new Error(`[API Gateway] JSON Parse failed: ${response.content}`);
    }
  }
}

export async function executeMultiTurnChat(
  messages: Array<{ role: "system" | "user" | "assistant"; content: string }>,
  maxTokens: number = 2048
): Promise<string> {
  const startTime = Date.now();
  const systemMsg = messages.find(m => m.role === "system")?.content || "";
  const filteredMessages = messages.filter(m => m.role !== "system");

  // Gemini Multi-turn Chat
  if (process.env.GEMINI_API_KEY) {
    try {
      const genAI = getGemini()!;
      const model = genAI.getGenerativeModel({
        model: MODELS.gemini_complex,
        systemInstruction: systemMsg || undefined,
      });
      const chat = model.startChat({
        history: filteredMessages.slice(0, -1).map(m => ({
          role: m.role === "assistant" ? "model" : "user",
          parts: [{ text: m.content }],
        })),
      });

      const lastMsg = filteredMessages[filteredMessages.length - 1].content;
      const result = await withTimeout(chat.sendMessage(lastMsg), RETRY_CONFIG.timeout_ms);
      const content = result.response.text();
      console.log(`[API Gateway] Chat Engine=Gemini 3 Latency=${Date.now() - startTime}ms`);
      return content;
    } catch (error) {
      console.error("[API Gateway] Gemini Chat failed:", error instanceof Error ? error.message : error);
    }
  }

  // OpenAI Multi-turn Chat
  if (process.env.OPENAI_API_KEY) {
    try {
      const client = getOpenAI()!;
      const response = await withTimeout(
        client.chat.completions.create({
          model: MODELS.openai_complex,
          messages: messages.map(m => ({ role: m.role as "system" | "user" | "assistant", content: m.content })),
          max_tokens: maxTokens,
          stream: false,
        }),
        RETRY_CONFIG.timeout_ms
      );
      if (!("choices" in response)) throw new Error("Unexpected streaming response");
      console.log(`[API Gateway] Chat Engine=OpenAI Latency=${Date.now() - startTime}ms`);
      return response.choices[0]?.message?.content || "";
    } catch (error) {
      console.error("[API Gateway] OpenAI Chat failed:", error instanceof Error ? error.message : error);
    }
  }

  throw new Error("[API Gateway] All AI engines failed for chat session");
}
