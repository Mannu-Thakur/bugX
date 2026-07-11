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
    throw new Error(`Anthropic API error ${response.status}: ${errBody}`);
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
    throw new Error(`API error ${response.status}: ${errBody}`);
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
        if (err instanceof Error && err.name === 'AbortError') {
          updateMessage(assistantId, { isStreaming: false });
          return;
        }

        // Fallback to Groq free model
        const errMsg = err instanceof Error ? err.message : String(err);
        const groqProvider = PROVIDERS.find(p => p.id === 'groq')!;
        const fallbackModel = groqProvider.models[0];
        const groqKey = getEffectiveKey('groq');

        if (groqKey && selectedModelId !== fallbackModel.id) {
          updateMessage(assistantId, {
            content: `⚠️ ${provider.name} failed: ${errMsg}\n\nFalling back to ${fallbackModel.displayName}...\n\n`,
            isStreaming: true,
          });
          try {
            let acc2 = `⚠️ ${provider.name} failed: ${errMsg}\n\nFalling back to ${fallbackModel.displayName}...\n\n`;
            await streamOpenAICompat(
              groqProvider.apiEndpoint,
              [{ role: 'system', content: systemPrompt }, ...history.slice(0, -1), { role: 'user', content: finalText }],
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
            const fallbackErrMsg = fallbackErr instanceof Error ? fallbackErr.message : String(fallbackErr);
            updateMessage(assistantId, {
              content: `Failed to get a response. Please check your connection and try again.\n\nError: ${fallbackErrMsg}`,
              isStreaming: false,
              error: fallbackErrMsg,
            });
          }
        } else {
          updateMessage(assistantId, {
            content: `Failed to get a response.\n\n**Error:** ${errMsg}`,
            isStreaming: false,
            error: errMsg,
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
        if (controller.signal.aborted) {
          updateMessage(assistantId, { isStreaming: false });
        } else {
          const errMsg = err instanceof Error ? err.message : String(err);
          const isNetworkError =
            err instanceof TypeError ||
            errMsg.includes('failed to fetch') ||
            errMsg.includes('NetworkError') ||
            errMsg.includes('econnrefused');

          const hasFallback = provider.id === 'gemini' && getEffectiveKey('groq');

          if (hasFallback && isNetworkError) {
            updateMessage(assistantId, {
              content: 'Gemini failed. Falling back to Llama 3.3 (Groq)...',
              isStreaming: true,
            });

            try {
              const fallbackProvider = PROVIDERS.find(pr => pr.id === 'groq')!;
              const fallbackModel = fallbackProvider.models.find(mo => mo.id === 'llama-3.3-70b-versatile')!;
              const fallbackKey = getEffectiveKey('groq')!;

              let acc2 = '';
              const onToken2 = (token: string) => {
                acc2 += token;
                updateMessage(assistantId, { content: acc2, isStreaming: true });
              };

              await streamOpenAICompat(
                fallbackProvider.apiEndpoint,
                [
                  { role: 'system', content: systemPrompt },
                  ...history,
                ],
                fallbackModel.id,
                fallbackKey,
                onToken2,
                controller.signal
              );
              updateMessage(assistantId, { content: acc2, isStreaming: false, modelId: fallbackModel.id });
            } catch (fallbackErr) {
              const fallbackErrMsg = fallbackErr instanceof Error ? fallbackErr.message : String(fallbackErr);
              updateMessage(assistantId, {
                content: `Failed to get a response. Please check your connection and try again.\n\nError: ${fallbackErrMsg}`,
                isStreaming: false,
                error: fallbackErrMsg,
              });
            }
          } else {
            updateMessage(assistantId, {
              content: `Failed to get a response.\n\n**Error:** ${errMsg}`,
              isStreaming: false,
              error: errMsg,
            });
          }
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
