/* eslint-disable react-refresh/only-export-components */
import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
} from 'react';
import { DEFAULT_MODEL_ID, type ProviderId, PROVIDERS } from './xModels';

export interface XMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
  modelId?: string;
  isStreaming?: boolean;
  error?: string;
}

export interface XConversation {
  id: string;
  problemSlug: string;
  messages: XMessage[];
  createdAt: number;
  updatedAt: number;
}

export interface XRules {
  text: string;
}

export interface XCommand {
  trigger: string; // e.g. "/debug"
  description: string;
  prompt: string; // template with {code}, {problem}, {error} placeholders
  isBuiltIn: boolean;
}

const BUILT_IN_COMMANDS: XCommand[] = [
  {
    trigger: '/debug',
    description: 'Debug the current code',
    prompt: 'Debug this code and identify the issue:\n\n```\n{code}\n```\n\nError output:\n{error}',
    isBuiltIn: true,
  },
  {
    trigger: '/hint',
    description: 'Get a hint without the full solution',
    prompt: 'Give me a hint for this problem without spoiling the full solution. Problem: {problem}. My current code:\n\n```\n{code}\n```',
    isBuiltIn: true,
  },
  {
    trigger: '/explain',
    description: 'Explain the current code',
    prompt: 'Explain this code step by step:\n\n```{language}\n{code}\n```',
    isBuiltIn: true,
  },
  {
    trigger: '/complexity',
    description: 'Analyze time and space complexity',
    prompt: 'Analyze the time and space complexity of this solution:\n\n```{language}\n{code}\n```\n\nProvide Big O notation and explain why.',
    isBuiltIn: true,
  },
  {
    trigger: '/refactor',
    description: 'Refactor and clean up the code',
    prompt: 'Refactor this code to be cleaner and more readable without changing the logic:\n\n```{language}\n{code}\n```',
    isBuiltIn: true,
  },
  {
    trigger: '/optimize',
    description: 'Optimize for performance',
    prompt: 'Optimize this solution for better time complexity:\n\n```{language}\n{code}\n```\n\nProblem constraints: {constraints}',
    isBuiltIn: true,
  },
  {
    trigger: '/dryrun',
    description: 'Dry run with a sample input',
    prompt: 'Dry run this code step by step with the first sample input:\n\n```{language}\n{code}\n```\n\nSample input: {sampleInput}',
    isBuiltIn: true,
  },
  {
    trigger: '/generate',
    description: 'Generate a solution',
    prompt: 'Generate an optimal solution for this problem in {language}:\n\n{problem}\n\nConstraints: {constraints}',
    isBuiltIn: true,
  },
];

const STORAGE_KEY_MESSAGES = 'x_conversations';
const STORAGE_KEY_MODEL = 'x_selected_model';
const STORAGE_KEY_RULES = 'x_rules';
const STORAGE_KEY_COMMANDS = 'x_custom_commands';
const STORAGE_KEY_API_KEYS = 'x_api_keys';
const STORAGE_KEY_ENABLED_PROVIDERS = 'x_enabled_providers';

interface XContextValue {
  // Conversation
  messages: XMessage[];
  addMessage: (msg: Omit<XMessage, 'id' | 'timestamp'>) => string;
  updateMessage: (id: string, updates: Partial<XMessage>) => void;
  clearMessages: () => void;
  problemSlug: string | null;
  setProblemSlug: (slug: string | null) => void;

  // Model
  selectedModelId: string;
  setSelectedModelId: (id: string) => void;

  // Panel
  isOpen: boolean;
  togglePanel: () => void;
  openPanel: () => void;
  closePanel: () => void;

  // Streaming
  isStreaming: boolean;
  setIsStreaming: (v: boolean) => void;
  abortControllerRef: React.MutableRefObject<AbortController | null>;

  // API Keys (user-provided)
  apiKeys: Partial<Record<ProviderId, string>>;
  setApiKey: (provider: ProviderId, key: string) => void;
  removeApiKey: (provider: ProviderId) => void;
  getEffectiveKey: (provider: ProviderId) => string | null;

  // Enabled providers
  enabledProviders: Set<ProviderId>;
  toggleProvider: (id: ProviderId) => void;

  // Rules
  rules: XRules;
  setRules: (r: XRules) => void;

  // Commands
  commands: XCommand[];
  addCustomCommand: (cmd: Omit<XCommand, 'isBuiltIn'>) => void;
  removeCustomCommand: (trigger: string) => void;
  resolveCommand: (trigger: string) => XCommand | null;
}

export const XCtx = createContext<XContextValue | null>(null);

export const XProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [problemSlug, setProblemSlug] = useState<string | null>(null);
  const [messages, setMessages] = useState<XMessage[]>([]);
  const [selectedModelId, setSelectedModelIdState] = useState<string>(
    () => localStorage.getItem(STORAGE_KEY_MODEL) || DEFAULT_MODEL_ID
  );
  // Always start closed — the panel should only open when the user explicitly
  // clicks the X button. We deliberately do NOT restore the persisted value here
  // so that navigating to a new problem never auto-opens the panel.
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);

  const [apiKeys, setApiKeysState] = useState<Partial<Record<ProviderId, string>>>(() => {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY_API_KEYS) || '{}'); } catch { return {}; }
  });

  const [enabledProviders, setEnabledProviders] = useState<Set<ProviderId>>(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY_ENABLED_PROVIDERS) || 'null');
      if (Array.isArray(saved)) return new Set(saved as ProviderId[]);
    } catch { /* ignore */ }
    // Default: enable the three free platform providers
    return new Set<ProviderId>(['groq', 'gemini', 'deepseek']);
  });

  const [rules, setRulesState] = useState<XRules>(() => {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY_RULES) || '{"text":""}'); }
    catch { return { text: '' }; }
  });

  const [customCommands, setCustomCommands] = useState<XCommand[]>(() => {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY_COMMANDS) || '[]'); }
    catch { return []; }
  });

  // Load conversation when problemSlug changes
  useEffect(() => {
    if (!problemSlug) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setMessages([]);
      return;
    }
    try {
      const all: Record<string, XMessage[]> = JSON.parse(
        localStorage.getItem(STORAGE_KEY_MESSAGES) || '{}'
      );
      setMessages(all[problemSlug] || []);
    } catch { setMessages([]); }
  }, [problemSlug]);

  // Persist messages
  useEffect(() => {
    if (!problemSlug) return;
    try {
      const all: Record<string, XMessage[]> = JSON.parse(
        localStorage.getItem(STORAGE_KEY_MESSAGES) || '{}'
      );
      all[problemSlug] = messages;
      localStorage.setItem(STORAGE_KEY_MESSAGES, JSON.stringify(all));
    } catch { /* ignore */ }
  }, [messages, problemSlug]);

  const addMessage = useCallback((msg: Omit<XMessage, 'id' | 'timestamp'>): string => {
    const id = Math.random().toString(36).slice(2);
    const full: XMessage = { ...msg, id, timestamp: Date.now() };
    setMessages(prev => [...prev, full]);
    return id;
  }, []);

  const updateMessage = useCallback((id: string, updates: Partial<XMessage>) => {
    setMessages(prev => prev.map(m => m.id === id ? { ...m, ...updates } : m));
  }, []);

  const clearMessages = useCallback(() => setMessages([]), []);

  const setSelectedModelId = useCallback((id: string) => {
    setSelectedModelIdState(id);
    localStorage.setItem(STORAGE_KEY_MODEL, id);
  }, []);

  const togglePanel = useCallback(() => {
    setIsOpen(prev => {
      const next = !prev;
      localStorage.setItem('x_panel_open', String(next));
      return next;
    });
  }, []);
  const openPanel = useCallback(() => {
    setIsOpen(true); localStorage.setItem('x_panel_open', 'true');
  }, []);
  const closePanel = useCallback(() => {
    setIsOpen(false); localStorage.setItem('x_panel_open', 'false');
  }, []);

  const setApiKey = useCallback((provider: ProviderId, key: string) => {
    setApiKeysState(prev => {
      const next = { ...prev, [provider]: key };
      localStorage.setItem(STORAGE_KEY_API_KEYS, JSON.stringify(next));
      return next;
    });
  }, []);

  const removeApiKey = useCallback((provider: ProviderId) => {
    setApiKeysState(prev => {
      const next = { ...prev };
      delete next[provider];
      localStorage.setItem(STORAGE_KEY_API_KEYS, JSON.stringify(next));
      return next;
    });
  }, []);

  // Returns the effective key to use: user-provided key takes priority over platform key
  const getEffectiveKey = useCallback((provider: ProviderId): string | null => {
    const p = PROVIDERS.find(pr => pr.id === provider);
    if (!p) return null;
    const userKey = apiKeys[provider];
    if (userKey && userKey.length > 0) return userKey;
    if (p.platformApiKey && !p.platformApiKey.startsWith('YOUR_')) return p.platformApiKey;
    return null;
  }, [apiKeys]);

  const toggleProvider = useCallback((id: ProviderId) => {
    setEnabledProviders(prev => {
      const next = new Set(prev);
      if (next.has(id)) { next.delete(id); } else { next.add(id); }
      localStorage.setItem(STORAGE_KEY_ENABLED_PROVIDERS, JSON.stringify([...next]));
      return next;
    });
  }, []);

  const setRules = useCallback((r: XRules) => {
    setRulesState(r);
    localStorage.setItem(STORAGE_KEY_RULES, JSON.stringify(r));
  }, []);

  const addCustomCommand = useCallback((cmd: Omit<XCommand, 'isBuiltIn'>) => {
    const full: XCommand = { ...cmd, isBuiltIn: false };
    setCustomCommands(prev => {
      const next = [...prev.filter(c => c.trigger !== cmd.trigger), full];
      localStorage.setItem(STORAGE_KEY_COMMANDS, JSON.stringify(next));
      return next;
    });
  }, []);

  const removeCustomCommand = useCallback((trigger: string) => {
    setCustomCommands(prev => {
      const next = prev.filter(c => c.trigger !== trigger);
      localStorage.setItem(STORAGE_KEY_COMMANDS, JSON.stringify(next));
      return next;
    });
  }, []);

  const resolveCommand = useCallback((trigger: string): XCommand | null => {
    const all = [...BUILT_IN_COMMANDS, ...customCommands];
    return all.find(c => c.trigger === trigger) || null;
  }, [customCommands]);

  return (
    <XCtx.Provider value={{
      messages, addMessage, updateMessage, clearMessages,
      problemSlug, setProblemSlug,
      selectedModelId, setSelectedModelId,
      isOpen, togglePanel, openPanel, closePanel,
      isStreaming, setIsStreaming, abortControllerRef,
      apiKeys, setApiKey, removeApiKey, getEffectiveKey,
      enabledProviders, toggleProvider,
      rules, setRules,
      commands: [...BUILT_IN_COMMANDS, ...customCommands],
      addCustomCommand, removeCustomCommand, resolveCommand,
    }}>
      {children}
    </XCtx.Provider>
  );
};

export const useX = (): XContextValue => {
  const ctx = useContext(XCtx);
  if (!ctx) throw new Error('useX must be used inside XProvider');
  return ctx;
};

export { BUILT_IN_COMMANDS };
