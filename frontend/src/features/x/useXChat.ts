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

  parts.push(`\n## Response Format`, `- Use markdown with fenced code blocks`, `- Keep responses focused and scannable`);

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
            onToken(json.delta.text);
          }
        } catch { /* ignore parse errors */ }
      }
    }
  }
}

// OpenAI-compatible streaming (Groq, OpenAI, Gemini OpenAI-compat, DeepSeek, Qwen, etc.)
async function streamOpenAICompat(
  endpoint: string,
  messages: { role: string; content: string }[],
  modelId: string,
  apiKey: string,
  onToken: (token: string) => void,
  signal: AbortSignal
): Promise<void> {
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: modelId,
      messages,
      stream: true,
      max_tokens: 4096,
    }),
    signal,
  });

  if (!response.ok) {
    const errBody = await response.text();
    throw new Error(`API error ${response.status}: ${errBody}`);
  }

  const reader = response.body!.getReader();
  const decoder = new TextDecoder();

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
          if (token) onToken(token);
        } catch { /* ignore parse errors */ }
      }
    }
  }
}

export function useXChat() {
  const {
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
          await streamOpenAICompat(
            p.apiEndpoint,
            messagesWithSystem,
            m.id,
            key,
            onToken,
            controller.signal
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

  const stopStreaming = useCallback(() => {
    abortControllerRef.current?.abort();
    setIsStreaming(false);
  }, [abortControllerRef, setIsStreaming]);

  return { sendMessage, stopStreaming };
}
