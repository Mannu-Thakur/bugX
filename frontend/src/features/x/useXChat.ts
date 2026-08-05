import { useCallback } from 'react';
import { useX } from './XContext';
import { PROVIDERS, getModelById, type ProviderId } from './xModels';

export interface ChatContext {
  code: string;
  language: string;
  problemTitle: string;
  problemStatement: string;
  constraints: string;
  compilerError: string;
  runtimeError: string;
  sampleInput: string;
}

// Build a rich system prompt that gives X full context about the current problem + user rules
function buildSystemPrompt(ctx: ChatContext, rulesText: string): string {
  const parts: string[] = [
    `You are X, an elite AI coding assistant built into bugX — a premium competitive programming platform.`,
    `You are a native feature, not a chatbot. You have full context of the user's problem, code, and errors.`,
    ``,
    `## Your Personality`,
    `- Precise, minimal, developer-first`,
    `- Never write fluff or unnecessary explanations`,
    `- Always mention time/space complexity when analyzing algorithms`,
    `- Prefer code over prose when the user needs help`,
    `- For hints, give the key insight without spoiling the full implementation`,
    ``,
    `## Code Generation Requirements`,
    `- IMPORTANT: You MUST retain the exact class names, function names, parameter names/types, and return types from the user's template/starter code. Do not rename functions or alter signatures, so that the code remains fully compatible and ready to compile when the user clicks 'Apply'.`,
    ``,
    `## Current Context`,
    `- Problem: ${ctx.problemTitle || 'Unknown'}`,
    `- Language: ${ctx.language || 'Unknown'}`,
  ];

  if (ctx.problemStatement) {
    parts.push(`- Problem Statement:\n${ctx.problemStatement.slice(0, 2000)}`);
  }
  if (ctx.constraints) {
    parts.push(`- Constraints: ${ctx.constraints}`);
  }
  if (ctx.code && ctx.code.trim()) {
    parts.push(`\n## User's Current Code\n\`\`\`${ctx.language}\n${ctx.code.slice(0, 3000)}\n\`\`\``);
  }
  if (ctx.compilerError) {
    parts.push(`\n## Compiler Error\n\`\`\`\n${ctx.compilerError.slice(0, 1000)}\n\`\`\``);
  }
  if (ctx.runtimeError) {
    parts.push(`\n## Runtime Error\n\`\`\`\n${ctx.runtimeError.slice(0, 1000)}\n\`\`\``);
  }

  parts.push(`
## Response Format
Follow these rules for every response — they control how your output is rendered:

1. **Prose vs Code**: Write explanations in clean prose paragraphs. Separate each paragraph with a blank line. Never dump blocks of text without breaks.
2. **Code blocks**: ALWAYS wrap code (including pseudocode, algorithms, and step-by-step procedures) in fenced code blocks with the correct language tag. Example:
   \`\`\`python
   # code here
   \`\`\`
   For pseudocode use the tag \`pseudocode\`, for shell use \`bash\`, etc.
3. **Never** mix code and prose in the same block. If you explain a step then show code, put each in its own block with text between them.
4. **Headings**: Use ## for section headings, ### for subsections. Never use # (top-level h1).
5. **Lists**: Use \`-\` for unordered lists, \`1.\` for ordered lists. Indent nested items with 2 spaces.
6. **Bold**: Use **bold** for key terms, variable names, and important concepts. Use \`inline code\` for identifiers, function names, and values.
7. **Math**: Use \\( ... \\) for inline math and \\[ ... \\] for display math.
8. **Spacing**: Always add a blank line before and after code blocks, headings, and lists.
9. Keep responses focused and concise — every sentence should add value.`);

  if (rulesText.trim()) {
    parts.push(`\n## User's Custom Rules (follow these strictly)\n${rulesText}`);
  }

  return parts.join('\n');
}

// Expand command template with context variables
function expandCommandTemplate(template: string, ctx: ChatContext): string {
  return template
    .replace('{code}', ctx.code || 'No code provided')
    .replace('{language}', ctx.language || 'unknown')
    .replace('{problem}', ctx.problemTitle || 'Unknown problem')
    .replace('{error}', ctx.compilerError || ctx.runtimeError || 'No error')
    .replace('{constraints}', ctx.constraints || 'No constraints')
    .replace('{sampleInput}', ctx.sampleInput || 'No sample input');
}

// Ultra-minimal error summarizer that distills raw errors into short, clean phrases
export function summarizeError(errInput: unknown, status?: number): string {
  const raw = errInput instanceof Error ? errInput.message : String(errInput || '');
  let msg = raw;

  // If raw string contains JSON, try to extract error.message
  if (raw.includes('{') && raw.includes('}')) {
    try {
      const match = raw.match(/\{[\s\S]+\}/);
      if (match) {
        const parsed = JSON.parse(match[0]);
        msg = parsed.error?.message || (typeof parsed.error === 'string' ? parsed.error : null) || parsed.message || parsed.detail || raw;
      }
    } catch { /* ignore */ }
  }

  const lower = msg.toLowerCase();

  // 1. Credits / Payment (402)
  if (status === 402 || lower.includes('credit') || lower.includes('afford') || lower.includes('payment') || lower.includes('quota')) {
    return 'Insufficient credits';
  }

  // 2. Rate limit (429)
  if (status === 429 || lower.includes('rate limit') || lower.includes('tpd') || lower.includes('tpm') || lower.includes('too many requests')) {
    const timeMatch = msg.match(/try again in ([0-9]+m[0-9.]*s?|[0-9]+\s*seconds?|[0-9]+\s*minutes?)/i);
    if (timeMatch) {
      const cleanTime = timeMatch[1].replace(/m[0-9.]*s/i, 'm');
      return `Rate limit reached (Retry in ~${cleanTime})`;
    }
    return 'Rate limit exceeded';
  }

  // 3. API Key / Unauthorized (401 / 403)
  if (status === 401 || status === 403 || lower.includes('api key') || lower.includes('unauthorized') || lower.includes('forbidden')) {
    return 'Invalid or missing API key';
  }

  // 4. Model not found (404)
  if (status === 404 || lower.includes('not found') || lower.includes('does not exist')) {
    return 'Model unavailable';
  }

  // 5. Server error (500, 502, 503, 504)
  if ((status && status >= 500) || lower.includes('bad gateway') || lower.includes('service unavailable') || lower.includes('overloaded')) {
    return 'Provider server unavailable';
  }

  // 6. Network error
  if (lower.includes('failed to fetch') || lower.includes('networkerror') || lower.includes('econnrefused')) {
    return 'Network connection failed';
  }

  // 7. General cleanup: strip technical jargon, org IDs, URLs, token counts
  let clean = msg
    .replace(/API error \d+:\s*/gi, '')
    .replace(/in organization `?org_\w+`?/gi, '')
    .replace(/service tier `?\w+`?/gi, '')
    .replace(/https?:\/\/\S+/gi, '')
    .replace(/`[^`]+`/g, '')
    .replace(/on tokens per day \(TPD\):.*/gi, '')
    .replace(/\s+/g, ' ')
    .trim();

  if (!clean) return 'Request failed';
  if (clean.length > 60) clean = clean.slice(0, 57) + '...';
  return clean;
}

// Extract a clean, human-readable message from raw API error responses
function parseApiErrorResponse(status: number, errBody: string): string {
  return summarizeError(errBody, status);
}

// Anthropic uses a different API format — handle it separately
async function streamAnthropic(
  messages: { role: string; content: string }[],
  systemPrompt: string,
  modelId: string,
  apiKey: string,
  onToken: (token: string) => void,
  signal: AbortSignal
): Promise<void> {
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify({
      model: modelId,
      max_tokens: 4096,
      system: systemPrompt,
      messages,
      stream: true,
    }),
    signal,
  });

  if (!response.ok) {
    const errBody = await response.text();
    const cleanMsg = parseApiErrorResponse(response.status, errBody);
    throw new Error(cleanMsg);
  }

  const reader = response.body!.getReader();
  const decoder = new TextDecoder();

  // RAF-throttle: buffer tokens and flush at ~60fps for smooth streaming
  let buffer = '';
  let rafId: number | null = null;
  const flush = () => {
    if (buffer) { onToken(buffer); buffer = ''; }
    rafId = null;
  };

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    const chunk = decoder.decode(value, { stream: true });
    const lines = chunk.split('\n');
    for (const line of lines) {
      if (line.startsWith('data: ')) {
        const data = line.slice(6).trim();
        if (!data || data === '[DONE]') continue;
        try {
          const json = JSON.parse(data);
          if (json.type === 'content_block_delta' && json.delta?.text) {
            buffer += json.delta.text;
            if (rafId === null) rafId = requestAnimationFrame(flush);
          }
        } catch { /* ignore parse errors */ }
      }
    }
  }
  // Flush any remaining buffered tokens
  if (buffer) onToken(buffer);
  if (rafId !== null) cancelAnimationFrame(rafId);
}

// OpenAI-compatible streaming (Groq, OpenAI, Gemini OpenAI-compat, DeepSeek, Qwen, OpenRouter, etc.)
async function streamOpenAICompat(
  endpoint: string,
  messages: { role: string; content: string }[],
  modelId: string,
  apiKey: string,
  onToken: (token: string) => void,
  signal: AbortSignal,
  extraHeaders?: Record<string, string>,
  fallbackModels?: string[]
): Promise<void> {
  const body: Record<string, unknown> = {
    model: modelId,
    messages,
    stream: true,
    max_tokens: 4096,
  };

  // OpenRouter native model fallback — pass a models[] array so OpenRouter
  // automatically retries the next model if the primary is unavailable
  if (fallbackModels && fallbackModels.length > 0) {
    body.models = [modelId, ...fallbackModels];
  }

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
      ...extraHeaders,
    },
    body: JSON.stringify(body),
    signal,
  });

  if (!response.ok) {
    const errBody = await response.text();
    const cleanMsg = parseApiErrorResponse(response.status, errBody);
    throw new Error(cleanMsg);
  }

  const reader = response.body!.getReader();
  const decoder = new TextDecoder();

  // RAF-throttle: buffer tokens and flush at ~60fps for smooth streaming
  let buffer = '';
  let rafId: number | null = null;
  const flush = () => {
    if (buffer) { onToken(buffer); buffer = ''; }
    rafId = null;
  };

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    const chunk = decoder.decode(value, { stream: true });
    const lines = chunk.split('\n');
    for (const line of lines) {
      if (line.startsWith('data: ')) {
        const data = line.slice(6).trim();
        if (!data || data === '[DONE]') continue;
        try {
          const json = JSON.parse(data);
          const token =
            json.choices?.[0]?.delta?.content ||
            json.choices?.[0]?.text ||
            '';
          if (token) {
            buffer += token;
            if (rafId === null) rafId = requestAnimationFrame(flush);
          }
        } catch { /* ignore parse errors */ }
      }
    }
  }
  // Flush any remaining buffered tokens
  if (buffer) onToken(buffer);
  if (rafId !== null) cancelAnimationFrame(rafId);
}

export function useXChat() {
  const {
    messages,
    addMessage,
    updateMessage,
    truncateMessages,
    selectedModelId,
    isStreaming,
    setIsStreaming,
    abortControllerRef,
    getEffectiveKey,
    rules,
    resolveCommand,
  } = useX();

  const sendMessage = useCallback(
    async (userText: string, chatCtx: ChatContext): Promise<void> => {
      if (!userText.trim() || isStreaming) return;

      // Resolve slash commands
      let finalText = userText;
      const commandMatch = userText.match(/^(\/\w+)/);
      if (commandMatch) {
        const cmd = resolveCommand(commandMatch[1]);
        if (cmd) {
          finalText = expandCommandTemplate(cmd.prompt, chatCtx);
        }
      }

      // Add user message
      addMessage({ role: 'user', content: finalText });

      // Add placeholder assistant message
      const assistantId = addMessage({
        role: 'assistant',
        content: '',
        modelId: selectedModelId,
        isStreaming: true,
      });

      setIsStreaming(true);
      const controller = new AbortController();
      abortControllerRef.current = controller;

      const result = getModelById(selectedModelId);
      if (!result) {
        updateMessage(assistantId, {
          content: 'Model not found. Please select a different model.',
          isStreaming: false,
          error: 'Model not found',
        });
        setIsStreaming(false);
        return;
      }

      const { model, provider } = result;
      const apiKey = getEffectiveKey(provider.id as ProviderId);

      // Build conversation history (exclude current streaming placeholder)
      const history = messages.map(m => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      }));
      history.push({ role: 'user', content: finalText });

      const systemPrompt = buildSystemPrompt(chatCtx, rules.text);

      const tryStream = async (p: typeof provider, m: typeof model, key: string) => {
        let accumulated = '';
        const onToken = (token: string) => {
          accumulated += token;
          updateMessage(assistantId, { content: accumulated, isStreaming: true });
        };

        const messagesWithSystem = [
          { role: 'system', content: systemPrompt },
          ...history.slice(0, -1), // history without current user msg
          { role: 'user', content: finalText },
        ];

        if (p.id === 'anthropic') {
          await streamAnthropic(
            messagesWithSystem.filter(msg => msg.role !== 'system'),
            systemPrompt,
            m.id,
            key,
            onToken,
            controller.signal
          );
        } else {
          // Build OpenRouter-specific extras
          const extraHeaders: Record<string, string> = {};
          const fallbackModels: string[] = [];

          if (p.id === 'openrouter') {
            extraHeaders['HTTP-Referer'] = 'https://bugx.dev';
            extraHeaders['X-Title'] = 'BugX';
            // Use the next two models in the provider list as fallbacks
            const orModels = p.models.map(mo => mo.id);
            const primaryIdx = orModels.indexOf(m.id);
            if (primaryIdx !== -1) {
              const nextModels: string[] = [];
              for (let i = 1; i < orModels.length && nextModels.length < 2; i++) {
                const nextModel = orModels[(primaryIdx + i) % orModels.length];
                if (nextModel !== m.id && !nextModels.includes(nextModel)) {
                  nextModels.push(nextModel);
                }
              }
              fallbackModels.push(...nextModels);
            }
          }

          await streamOpenAICompat(
            p.apiEndpoint,
            messagesWithSystem,
            m.id,
            key,
            onToken,
            controller.signal,
            extraHeaders,
            fallbackModels
          );
        }

        updateMessage(assistantId, { content: accumulated, isStreaming: false, modelId: m.id });
      };

      try {
        if (!apiKey) {
          throw new Error(`No API key available for ${provider.name}. Add your key in X Settings.`);
        }
        await tryStream(provider, model, apiKey);
      } catch (err) {
        if (controller.signal.aborted || (err instanceof Error && err.name === 'AbortError')) {
          updateMessage(assistantId, { isStreaming: false });
          return;
        }

        const primarySummary = summarizeError(err);
        const groqProvider = PROVIDERS.find(p => p.id === 'groq')!;
        const fallbackModel = groqProvider.models[0];
        const groqKey = getEffectiveKey('groq');

        if (groqKey && selectedModelId !== fallbackModel.id) {
          const fallbackNotice = `> ⚡ *${provider.name} (${primarySummary}). Switched to ${fallbackModel.displayName}...*\n\n`;
          updateMessage(assistantId, {
            content: fallbackNotice,
            isStreaming: true,
          });
          try {
            let acc2 = fallbackNotice;
            const messagesWithSystem = [
              { role: 'system', content: systemPrompt },
              ...history.slice(0, -1),
              { role: 'user', content: finalText },
            ];
            await streamOpenAICompat(
              groqProvider.apiEndpoint,
              messagesWithSystem,
              fallbackModel.id,
              groqKey,
              (token) => {
                acc2 += token;
                updateMessage(assistantId, { content: acc2, isStreaming: true });
              },
              controller.signal
            );
            updateMessage(assistantId, { content: acc2, isStreaming: false, modelId: fallbackModel.id });
          } catch (fallbackErr) {
            const fallbackSummary = summarizeError(fallbackErr);
            updateMessage(assistantId, {
              content: '',
              isStreaming: false,
              error: `${provider.name}: ${primarySummary} · ${fallbackModel.displayName}: ${fallbackSummary}`,
            });
          }
        } else {
          updateMessage(assistantId, {
            content: '',
            isStreaming: false,
            error: `${provider.name}: ${primarySummary}`,
          });
        }
      } finally {
        setIsStreaming(false);
        abortControllerRef.current = null;
      }
    },
    [
      messages,
      addMessage,
      updateMessage,
      selectedModelId,
      isStreaming,
      setIsStreaming,
      abortControllerRef,
      getEffectiveKey,
      rules,
      resolveCommand,
    ]
  );

  const resubmitActiveChat = useCallback(
    async (chatCtx: ChatContext, targetMessageId?: string, newContent?: string): Promise<void> => {
      if (isStreaming) return;

      let targetIdx = -1;
      if (targetMessageId) {
        targetIdx = messages.findIndex(m => m.id === targetMessageId);
      } else {
        targetIdx = [...messages].reverse().findIndex(m => m.role === 'user');
        if (targetIdx !== -1) {
          targetIdx = messages.length - 1 - targetIdx;
        }
      }

      if (targetIdx === -1) return;
      const targetUserMsg = messages[targetIdx];
      const userText = newContent !== undefined ? newContent : targetUserMsg.content;
      truncateMessages(targetUserMsg.id, userText);

      let finalText = userText;
      const commandMatch = userText.match(/^(\/\w+)/);
      if (commandMatch) {
        const cmd = resolveCommand(commandMatch[1]);
        if (cmd) {
          finalText = expandCommandTemplate(cmd.prompt, chatCtx);
        }
      }

      const history = messages.slice(0, targetIdx).map(m => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      }));
      history.push({ role: 'user', content: finalText });

      const assistantId = addMessage({
        role: 'assistant',
        content: '',
        modelId: selectedModelId,
        isStreaming: true,
      });

      setIsStreaming(true);
      const controller = new AbortController();
      abortControllerRef.current = controller;

      const result = getModelById(selectedModelId);
      if (!result) {
        updateMessage(assistantId, {
          content: 'Model not found. Please select a different model.',
          isStreaming: false,
          error: 'Model not found',
        });
        setIsStreaming(false);
        return;
      }

      const { model, provider } = result;
      const apiKey = getEffectiveKey(provider.id as ProviderId);
      const systemPrompt = buildSystemPrompt(chatCtx, rules.text);

      const tryStream = async (p: typeof provider, m: typeof model, key: string) => {
        let accumulated = '';
        const onToken = (token: string) => {
          accumulated += token;
          updateMessage(assistantId, { content: accumulated, isStreaming: true });
        };

        if (p.id === 'anthropic') {
          await streamAnthropic(
            history,
            systemPrompt,
            m.id,
            key,
            onToken,
            controller.signal
          );
        } else {
          const extraHeaders: Record<string, string> = {};
          const fallbackModels: string[] = [];

          if (p.id === 'openrouter') {
            extraHeaders['HTTP-Referer'] = 'https://bugx.dev';
            extraHeaders['X-Title'] = 'BugX';
            const orModels = p.models.map(mo => mo.id);
            const primaryIdx = orModels.indexOf(m.id);
            if (primaryIdx !== -1) {
              const nextModels: string[] = [];
              for (let i = 1; i < orModels.length && nextModels.length < 2; i++) {
                const nextModel = orModels[(primaryIdx + i) % orModels.length];
                if (nextModel !== m.id && !nextModels.includes(nextModel)) {
                  nextModels.push(nextModel);
                }
              }
              fallbackModels.push(...nextModels);
            }
          }

          await streamOpenAICompat(
            p.apiEndpoint,
            [
              { role: 'system', content: systemPrompt },
              ...history,
            ],
            m.id,
            key,
            onToken,
            controller.signal,
            extraHeaders,
            fallbackModels
          );
        }

        updateMessage(assistantId, { content: accumulated, isStreaming: false, modelId: m.id });
      };

      try {
        if (!apiKey) {
          throw new Error(`No API key available for ${provider.name}. Add your key in X Settings.`);
        }
        await tryStream(provider, model, apiKey);
      } catch (err) {
        if (controller.signal.aborted || (err instanceof Error && err.name === 'AbortError')) {
          updateMessage(assistantId, { isStreaming: false });
          return;
        }

        const primarySummary = summarizeError(err);
        const groqProvider = PROVIDERS.find(p => p.id === 'groq')!;
        const fallbackModel = groqProvider.models[0];
        const groqKey = getEffectiveKey('groq');

        if (groqKey && selectedModelId !== fallbackModel.id) {
          const fallbackNotice = `> ⚡ *${provider.name} (${primarySummary}). Switched to ${fallbackModel.displayName}...*\n\n`;
          updateMessage(assistantId, {
            content: fallbackNotice,
            isStreaming: true,
          });
          try {
            let acc2 = fallbackNotice;
            const messagesWithSystem = [
              { role: 'system', content: systemPrompt },
              ...history,
            ];
            await streamOpenAICompat(
              groqProvider.apiEndpoint,
              messagesWithSystem,
              fallbackModel.id,
              groqKey,
              (token) => {
                acc2 += token;
                updateMessage(assistantId, { content: acc2, isStreaming: true });
              },
              controller.signal
            );
            updateMessage(assistantId, { content: acc2, isStreaming: false, modelId: fallbackModel.id });
          } catch (fallbackErr) {
            const fallbackSummary = summarizeError(fallbackErr);
            updateMessage(assistantId, {
              content: '',
              isStreaming: false,
              error: `${provider.name}: ${primarySummary} · ${fallbackModel.displayName}: ${fallbackSummary}`,
            });
          }
        } else {
          updateMessage(assistantId, {
            content: '',
            isStreaming: false,
            error: `${provider.name}: ${primarySummary}`,
          });
        }
      } finally {
        setIsStreaming(false);
        abortControllerRef.current = null;
      }
    },
    [
      messages,
      addMessage,
      updateMessage,
      truncateMessages,
      selectedModelId,
      isStreaming,
      setIsStreaming,
      abortControllerRef,
      getEffectiveKey,
      rules,
      resolveCommand,
    ]
  );

  const stopStreaming = useCallback(() => {
    abortControllerRef.current?.abort();
    setIsStreaming(false);
  }, [abortControllerRef, setIsStreaming]);

  return { sendMessage, resubmitActiveChat, stopStreaming };
}
