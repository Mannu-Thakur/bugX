// ─────────────────────────────────────────────────────────
//  X — Model & Provider Configuration
//  Add your real API keys below (they are stored only in the
//  browser and NEVER sent to the bugX backend).
// ─────────────────────────────────────────────────────────

export type CapabilityTag =
  | 'Free'
  | 'Fast'
  | 'Coding'
  | 'Reasoning'
  | 'Long Context'
  | 'Vision'
  | 'Personal API';

export type ProviderId =
  | 'groq'
  | 'gemini'
  | 'openai'
  | 'anthropic'
  | 'deepseek'
  | 'qwen'
  | 'moonshot'
  | 'bytedance';

export interface XModel {
  id: string;
  name: string;
  provider: ProviderId;
  displayName: string;
  capabilities: CapabilityTag[];
  contextWindow: number; // tokens
  speed: 'ultra' | 'fast' | 'medium' | 'slow';
  isPlatformFree?: boolean;
}

export interface XProvider {
  id: ProviderId;
  name: string;
  description: string;
  color: string; // accent color hex
  models: XModel[];
  apiEndpoint: string;
  requiresKey: boolean;
  // Platform-level key (only for free providers). Replace placeholder with real key.
  platformApiKey?: string;
}

const IS_DEV = import.meta.env.DEV;

// ─────────────────────────────────────────────────────────
//  PLATFORM FREE KEYS  ←  paste your keys here
// ─────────────────────────────────────────────────────────
const PLATFORM_GROQ_KEY    = 'YOUR_GROQ_API_KEY_HERE';
const PLATFORM_GEMINI_KEY  = 'YOUR_GEMINI_API_KEY_HERE';
const PLATFORM_DEEPSEEK_KEY = 'YOUR_DEEPSEEK_API_KEY_HERE';

export const PROVIDERS: XProvider[] = [
  {
    id: 'groq',
    name: 'Groq',
    description: 'Ultra-fast inference via Groq LPU hardware. Free for all users.',
    color: '#f55036',
    requiresKey: true,
    platformApiKey: PLATFORM_GROQ_KEY,
    apiEndpoint: IS_DEV ? '/proxy/groq/openai/v1/chat/completions' : 'https://api.groq.com/openai/v1/chat/completions',
    models: [
      {
        id: 'llama-3.3-70b-versatile',
        name: 'llama-3.3-70b-versatile',
        provider: 'groq',
        displayName: 'Llama 3.3 70B',
        capabilities: ['Free', 'Fast', 'Coding'],
        contextWindow: 128000,
        speed: 'ultra',
        isPlatformFree: true,
      },
      {
        id: 'llama-3.1-8b-instant',
        name: 'llama-3.1-8b-instant',
        provider: 'groq',
        displayName: 'Llama 3.1 8B Instant',
        capabilities: ['Free', 'Fast'],
        contextWindow: 131072,
        speed: 'ultra',
        isPlatformFree: true,
      },
      {
        id: 'gemma2-9b-it',
        name: 'gemma2-9b-it',
        provider: 'groq',
        displayName: 'Gemma 2 9B',
        capabilities: ['Free', 'Fast', 'Coding'],
        contextWindow: 8192,
        speed: 'ultra',
        isPlatformFree: true,
      },
    ],
  },
  {
    id: 'gemini',
    name: 'Google Gemini',
    description: 'Google\'s Gemini models. Use your own Gemini API key or the platform free tier.',
    color: '#4285f4',
    requiresKey: true,
    platformApiKey: PLATFORM_GEMINI_KEY,
    apiEndpoint: IS_DEV ? '/proxy/gemini/v1beta/openai/chat/completions' : 'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions',
    models: [
      {
        id: 'gemini-2.0-flash',
        name: 'gemini-2.0-flash',
        provider: 'gemini',
        displayName: 'Gemini 2.0 Flash',
        capabilities: ['Free', 'Fast', 'Coding', 'Vision'],
        contextWindow: 1000000,
        speed: 'fast',
        isPlatformFree: true,
      },
      {
        id: 'gemini-2.5-flash',
        name: 'gemini-2.5-flash',
        provider: 'gemini',
        displayName: 'Gemini 2.5 Flash',
        capabilities: ['Free', 'Reasoning', 'Long Context', 'Coding'],
        contextWindow: 1000000,
        speed: 'medium',
        isPlatformFree: true,
      },
    ],
  },
  {
    id: 'deepseek',
    name: 'DeepSeek',
    description: 'DeepSeek\'s powerful coding-focused models. Excellent for competitive programming.',
    color: '#4d6bfe',
    requiresKey: true,
    platformApiKey: PLATFORM_DEEPSEEK_KEY,
    apiEndpoint: IS_DEV ? '/proxy/deepseek/chat/completions' : 'https://api.deepseek.com/chat/completions',
    models: [
      {
        id: 'deepseek-chat',
        name: 'deepseek-chat',
        provider: 'deepseek',
        displayName: 'DeepSeek V3',
        capabilities: ['Free', 'Coding', 'Fast'],
        contextWindow: 64000,
        speed: 'fast',
        isPlatformFree: true,
      },
      {
        id: 'deepseek-reasoner',
        name: 'deepseek-reasoner',
        provider: 'deepseek',
        displayName: 'DeepSeek R1',
        capabilities: ['Free', 'Reasoning', 'Coding'],
        contextWindow: 64000,
        speed: 'medium',
        isPlatformFree: true,
      },
    ],
  },
  {
    id: 'openai',
    name: 'OpenAI',
    description: 'GPT-4o and o-series models via your personal OpenAI API key.',
    color: '#10a37f',
    requiresKey: true,
    apiEndpoint: 'https://api.openai.com/v1/chat/completions',
    models: [
      {
        id: 'gpt-4o',
        name: 'gpt-4o',
        provider: 'openai',
        displayName: 'GPT-4o',
        capabilities: ['Personal API', 'Coding', 'Vision'],
        contextWindow: 128000,
        speed: 'fast',
      },
      {
        id: 'gpt-4o-mini',
        name: 'gpt-4o-mini',
        provider: 'openai',
        displayName: 'GPT-4o Mini',
        capabilities: ['Personal API', 'Fast', 'Coding'],
        contextWindow: 128000,
        speed: 'ultra',
      },
      {
        id: 'o4-mini',
        name: 'o4-mini',
        provider: 'openai',
        displayName: 'o4 Mini',
        capabilities: ['Personal API', 'Reasoning', 'Coding'],
        contextWindow: 200000,
        speed: 'medium',
      },
    ],
  },
  {
    id: 'anthropic',
    name: 'Anthropic',
    description: 'Claude — best-in-class for code understanding and reasoning.',
    color: '#d97706',
    requiresKey: true,
    apiEndpoint: 'https://api.anthropic.com/v1/messages',
    models: [
      {
        id: 'claude-3-5-sonnet-20241022',
        name: 'claude-3-5-sonnet-20241022',
        provider: 'anthropic',
        displayName: 'Claude 3.5 Sonnet',
        capabilities: ['Personal API', 'Coding', 'Reasoning'],
        contextWindow: 200000,
        speed: 'fast',
      },
      {
        id: 'claude-3-haiku-20240307',
        name: 'claude-3-haiku-20240307',
        provider: 'anthropic',
        displayName: 'Claude 3 Haiku',
        capabilities: ['Personal API', 'Fast'],
        contextWindow: 200000,
        speed: 'ultra',
      },
    ],
  },
  {
    id: 'qwen',
    name: 'Qwen',
    description: 'Alibaba\'s Qwen models via personal API key.',
    color: '#6366f1',
    requiresKey: true,
    apiEndpoint: 'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions',
    models: [
      {
        id: 'qwen-turbo',
        name: 'qwen-turbo',
        provider: 'qwen',
        displayName: 'Qwen Turbo',
        capabilities: ['Personal API', 'Fast'],
        contextWindow: 131072,
        speed: 'ultra',
      },
      {
        id: 'qwen-plus',
        name: 'qwen-plus',
        provider: 'qwen',
        displayName: 'Qwen Plus',
        capabilities: ['Personal API', 'Coding', 'Long Context'],
        contextWindow: 131072,
        speed: 'fast',
      },
    ],
  },
  {
    id: 'moonshot',
    name: 'Moonshot',
    description: 'Kimi models with extremely long context windows.',
    color: '#8b5cf6',
    requiresKey: true,
    apiEndpoint: 'https://api.moonshot.cn/v1/chat/completions',
    models: [
      {
        id: 'moonshot-v1-32k',
        name: 'moonshot-v1-32k',
        provider: 'moonshot',
        displayName: 'Moonshot 32K',
        capabilities: ['Personal API', 'Long Context'],
        contextWindow: 32000,
        speed: 'medium',
      },
    ],
  },
  {
    id: 'bytedance',
    name: 'ByteDance',
    description: 'Doubao models from ByteDance via personal API key.',
    color: '#ec4899',
    requiresKey: true,
    apiEndpoint: 'https://ark.cn-beijing.volces.com/api/v3/chat/completions',
    models: [
      {
        id: 'doubao-lite-4k',
        name: 'doubao-lite-4k',
        provider: 'bytedance',
        displayName: 'Doubao Lite',
        capabilities: ['Personal API', 'Fast'],
        contextWindow: 4096,
        speed: 'ultra',
      },
    ],
  },
];

// Default model (always free, always works)
export const DEFAULT_MODEL_ID = 'llama-3.3-70b-versatile';
export const DEFAULT_PROVIDER_ID: ProviderId = 'groq';

export function getProviderById(id: ProviderId): XProvider | undefined {
  return PROVIDERS.find(p => p.id === id);
}

export function getModelById(modelId: string): { model: XModel; provider: XProvider } | undefined {
  for (const provider of PROVIDERS) {
    const model = provider.models.find(m => m.id === modelId);
    if (model) return { model, provider };
  }
  return undefined;
}

export const SPEED_LABELS: Record<XModel['speed'], string> = {
  ultra: 'Ultra-fast',
  fast: 'Fast',
  medium: 'Medium',
  slow: 'Slow',
};

export const CAPABILITY_COLORS: Record<CapabilityTag, string> = {
  'Free': 'text-emerald-400 bg-emerald-500/10',
  'Fast': 'text-blue-400 bg-blue-500/10',
  'Coding': 'text-violet-400 bg-violet-500/10',
  'Reasoning': 'text-amber-400 bg-amber-500/10',
  'Long Context': 'text-cyan-400 bg-cyan-500/10',
  'Vision': 'text-pink-400 bg-pink-500/10',
  'Personal API': 'text-gray-400 bg-gray-500/10',
};
