/**
 * WorldSim — LLM API Integration Layer
 * 
 * Supports multiple providers via a unified LLMProvider interface:
 * - DeepSeek (default, cheap, fast, JSON mode supported)
 * - Gemini (free tier backup)
 * - Any OpenAI-compatible endpoint (custom providers)
 * 
 * Architecture:
 * - LLMProviderInterface defines the contract for all providers
 * - callGemini() is the unified entry point (name kept for backward compatibility)
 * - New providers can be added by implementing LLMProviderInterface
 */

import type { DebugLog } from '../engine/types'

// ============================================================
// LLM Provider Interface (Abstraction Layer)
// ============================================================

/**
 * Unified interface for LLM providers.
 * Any provider (OpenAI, Anthropic, local models) can be integrated
 * by implementing this interface.
 */
export interface LLMProviderInterface {
  /** Unique provider identifier */
  readonly name: string
  /** Send a prompt and receive structured text response */
  call(prompt: string, options: LLMCallOptions): Promise<LLMCallResult>
}

export interface LLMCallOptions {
  type: 'world_gen' | 'action' | 'agent_tick'
  temperature?: number
  maxTokens?: number
  jsonMode?: boolean
}

export interface LLMCallResult {
  text: string
  promptTokens: number
  responseTokens: number
}

// ============================================================
// Model Configuration
// ============================================================

export type LLMProvider = 'deepseek' | 'gemini' | 'custom'

export type GeminiModel = 
  | 'deepseek-chat'
  | 'deepseek-reasoner'
  | 'gemini-2.0-flash'
  | 'gemini-2.0-flash-lite'
  | 'gemini-1.5-flash'

export const MODEL_OPTIONS: { id: GeminiModel; label: string; description: string; provider: LLMProvider }[] = [
  { id: 'deepseek-chat', label: 'DeepSeek V3', description: '性价比最优：￥1/M 输入，￥2/M 输出', provider: 'deepseek' },
  { id: 'deepseek-reasoner', label: 'DeepSeek R1', description: '深度推理，成本较高', provider: 'deepseek' },
  { id: 'gemini-2.0-flash', label: 'Gemini 2.0 Flash', description: '免费额度，15 次/分钟', provider: 'gemini' },
  { id: 'gemini-2.0-flash-lite', label: 'Gemini 2.0 Flash Lite', description: '免费额度，30 次/分钟', provider: 'gemini' },
  { id: 'gemini-1.5-flash', label: 'Gemini 1.5 Flash', description: '免费额度备选', provider: 'gemini' },
]

// ============================================================
// Custom Provider Registry
// ============================================================

let customProvider: LLMProviderInterface | null = null

/**
 * Register a custom LLM provider that implements LLMProviderInterface.
 * Once registered, set model to any custom model name and it will route through this provider.
 * 
 * @example
 * registerCustomProvider({
 *   name: 'my-local-llm',
 *   async call(prompt, options) {
 *     const res = await fetch('http://localhost:8080/v1/chat/completions', { ... })
 *     return { text: res.text, promptTokens: 0, responseTokens: 0 }
 *   }
 * })
 */
export function registerCustomProvider(provider: LLMProviderInterface): void {
  customProvider = provider
}

export function getCustomProvider(): LLMProviderInterface | null {
  return customProvider
}

// ============================================================
// State
// ============================================================

let apiKey: string = ''
let currentModel: GeminiModel = 'deepseek-chat'
let genAI: any = null  // GoogleGenerativeAI instance (lazy loaded for Gemini)

export function initGemini(key: string, model?: GeminiModel) {
  apiKey = key
  if (model) currentModel = model
}

export function setModel(model: GeminiModel) {
  currentModel = model
}

export function getModel(): GeminiModel {
  return currentModel
}

export function isGeminiReady(): boolean {
  return apiKey.length > 0
}

function getProvider(): LLMProvider {
  if (customProvider && !MODEL_OPTIONS.find(m => m.id === currentModel)) {
    return 'custom'
  }
  const opt = MODEL_OPTIONS.find(m => m.id === currentModel)
  return opt?.provider || 'deepseek'
}

// ============================================================
// DeepSeek API (OpenAI-compatible)
// ============================================================

const DEEPSEEK_BASE_URL = 'https://api.deepseek.com'

async function callDeepSeek(
  prompt: string,
  type: 'world_gen' | 'action' | 'agent_tick',
  temperature?: number
): Promise<{ text: string; promptTokens: number; responseTokens: number }> {
  const tempMap = { world_gen: 0.9, action: 0.7, agent_tick: 0.6 }
  const tokenMap = { world_gen: 4096, action: 2048, agent_tick: 512 }
  const effectiveTemp = temperature ?? tempMap[type]

  const response = await fetch(`${DEEPSEEK_BASE_URL}/v1/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: currentModel,
      messages: [
        {
          role: 'system',
          content: '你是一个世界模拟引擎。始终只输出有效的 JSON。不要输出 markdown，不要解释，只输出用户提示中指定的 JSON 对象。所有文本内容必须为中文。',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      response_format: { type: 'json_object' },
      temperature: effectiveTemp,
      max_tokens: tokenMap[type],
      stream: false,
    }),
  })

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}))
    const errorMsg = errorData.error?.message || `HTTP ${response.status}`
    throw new Error(`DeepSeek API 错误: ${errorMsg}`)
  }

  const result = await response.json()
  const text = result.choices?.[0]?.message?.content || ''
  const usage = result.usage || {}

  return {
    text,
    promptTokens: usage.prompt_tokens || Math.ceil(prompt.length / 4),
    responseTokens: usage.completion_tokens || Math.ceil(text.length / 4),
  }
}

// ============================================================
// Gemini API (Google)
// ============================================================

async function callGeminiAPI(
  prompt: string,
  type: 'world_gen' | 'action' | 'agent_tick',
  temperature?: number
): Promise<{ text: string; promptTokens: number; responseTokens: number }> {
  // Lazy load GoogleGenerativeAI
  if (!genAI) {
    const { GoogleGenerativeAI } = await import('@google/generative-ai')
    genAI = new GoogleGenerativeAI(apiKey)
  }

  const tempMap = { world_gen: 0.9, action: 0.7, agent_tick: 0.6 }
  const tokenMap = { world_gen: 2048, action: 1024, agent_tick: 512 }
  const effectiveTemp = temperature ?? tempMap[type]

  const model = genAI.getGenerativeModel({
    model: currentModel,
    generationConfig: {
      responseMimeType: 'application/json',
      temperature: effectiveTemp,
      maxOutputTokens: tokenMap[type],
    },
  })

  const result = await model.generateContent(prompt)
  const response = result.response
  const text = response.text()

  return {
    text,
    promptTokens: Math.ceil(prompt.length / 4),
    responseTokens: Math.ceil(text.length / 4),
  }
}

// ============================================================
// Unified API Entry Point
// ============================================================

export async function callGemini(
  prompt: string,
  type: 'world_gen' | 'action' | 'agent_tick',
  temperatureOverride?: number
): Promise<{ data: any; debug: DebugLog }> {
  if (!apiKey && !customProvider) throw new Error('API 密钥未设置，请先输入你的 API Key。')

  const provider = getProvider()
  const maxRetries = 2
  let lastError: any = null
  const tempMap = { world_gen: 0.9, action: 0.7, agent_tick: 0.6 }
  const effectiveTemp = temperatureOverride ?? tempMap[type]

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const startTime = Date.now()

    try {
      // Call the appropriate provider
      let callResult: { text: string; promptTokens: number; responseTokens: number }
      if (provider === 'custom' && customProvider) {
        const tokenMap = { world_gen: 4096, action: 2048, agent_tick: 512 }
        callResult = await customProvider.call(prompt, {
          type,
          temperature: effectiveTemp,
          maxTokens: tokenMap[type],
          jsonMode: true,
        })
      } else if (provider === 'deepseek') {
        callResult = await callDeepSeek(prompt, type, effectiveTemp)
      } else {
        callResult = await callGeminiAPI(prompt, type, effectiveTemp)
      }
      const { text, promptTokens, responseTokens } = callResult

      const latencyMs = Date.now() - startTime

      // Parse JSON response
      let data: any
      try {
        data = JSON.parse(text)
      } catch {
        // Try to extract JSON from markdown code block if present
        const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/)
        if (jsonMatch) {
          data = JSON.parse(jsonMatch[1])
        } else {
          throw new Error(`JSON 响应解析失败: ${text.slice(0, 200)}`)
        }
      }

      const debug: DebugLog = {
        timestamp: Date.now(),
        type,
        promptTokens,
        responseTokens,
        prompt,
        response: text,
        latencyMs,
      }

      return { data, debug }
    } catch (error: any) {
      lastError = error
      const latencyMs = Date.now() - startTime

      // Retry on rate limit errors
      const isRateLimit = error.message?.includes('429') || error.message?.includes('rate')
      if (isRateLimit && attempt < maxRetries) {
        const waitMs = (attempt + 1) * 5000 // 5s, 10s (DeepSeek is faster to recover)
        console.warn(`[WorldSim] Rate limited (${currentModel}). Retrying in ${waitMs / 1000}s... (attempt ${attempt + 1}/${maxRetries})`)
        await new Promise(resolve => setTimeout(resolve, waitMs))
        continue
      }

      const debug: DebugLog = {
        timestamp: Date.now(),
        type,
        promptTokens: Math.ceil(prompt.length / 4),
        responseTokens: 0,
        prompt,
        response: `错误: ${error.message}`,
        latencyMs,
      }
      throw Object.assign(error, { debug })
    }
  }

  throw lastError
}
