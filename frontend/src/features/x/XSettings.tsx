import React, { useState } from 'react';
import { ShieldCheck, ShieldAlert, Key, ToggleLeft, ToggleRight, Trash2, Code, Info, RefreshCw } from 'lucide-react';
import { useX } from './XContext';
import { PROVIDERS, getProviderById, type ProviderId, CAPABILITY_COLORS } from './xModels';
import { cn } from '../../shared/lib/cn';
import { useToast } from '../../shared/ui/toast/ToastProvider';

export const XSettings: React.FC = () => {
  const {
    selectedModelId,
    setSelectedModelId,
    apiKeys,
    setApiKey,
    removeApiKey,
    enabledProviders,
    toggleProvider,
    rules,
    setRules,
    commands,
    addCustomCommand,
    removeCustomCommand,
  } = useX();

  const { success, error } = useToast();

  const [activeSubTab, setActiveSubTab] = useState<'models' | 'api' | 'rules' | 'commands'>('models');

  // API Key verifying states
  const [testingProvider, setTestingProvider] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<Record<string, { status: 'success' | 'error'; message: string }>>({});
  const [tempKeys, setTempKeys] = useState<Record<string, string>>({});

  // Custom command states
  const [newTrigger, setNewTrigger] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newPrompt, setNewPrompt] = useState('');

  const handleTestConnection = async (providerId: string) => {
    const provider = getProviderById(providerId as any);
    if (!provider) return;

    const enteredKey = tempKeys[providerId] || apiKeys[providerId as ProviderId];
    if (!enteredKey) {
      error(`Please enter an API key for ${provider.name} first.`);
      return;
    }

    setTestingProvider(providerId);
    setTestResult(prev => ({ ...prev, [providerId]: undefined as any }));

    try {
      // Test key by requesting a minimal model completion
      const testModel = provider.models[0]?.id;
      if (!testModel) throw new Error('No test model available');

      let headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };

      let body: any = {
        model: testModel,
        messages: [{ role: 'user', content: 'Say OK' }],
        max_tokens: 5,
      };

      if (provider.id === 'anthropic') {
        headers['x-api-key'] = enteredKey;
        headers['anthropic-version'] = '2023-06-01';
        headers['anthropic-dangerous-direct-browser-access'] = 'true';
        body = {
          model: testModel,
          messages: [{ role: 'user', content: 'Say OK' }],
          max_tokens: 5,
        };
      } else {
        headers['Authorization'] = `Bearer ${enteredKey}`;
      }

      const res = await fetch(provider.apiEndpoint, {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const errText = await res.text();
        throw new Error(errText || `API returned status ${res.status}`);
      }

      setTestResult(prev => ({
        ...prev,
        [providerId]: { status: 'success', message: 'Verified' },
      }));
      // Auto save the verified key
      setApiKey(providerId as any, enteredKey);
      success(`${provider.name} API key verified and saved.`);
    } catch (err: any) {
      let msg = 'Connection failed';
      if (err?.message?.includes('Quota') || err?.message?.includes('insufficient_quota')) {
        msg = 'Quota exceeded';
      } else if (err?.message?.includes('invalid_api_key') || err?.message?.includes('401')) {
        msg = 'Invalid API Key';
      }
      setTestResult(prev => ({
        ...prev,
        [providerId]: { status: 'error', message: msg },
      }));
      error(`Failed to verify key: ${msg}`);
    } finally {
      setTestingProvider(null);
    }
  };

  const handleAddCommand = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTrigger.startsWith('/')) {
      error('Slash commands must start with a slash (e.g. /debug)');
      return;
    }
    if (!newTrigger || !newPrompt) {
      error('Please fill in command trigger and prompt template.');
      return;
    }
    addCustomCommand({
      trigger: newTrigger.toLowerCase().trim(),
      description: newDesc.trim() || 'Custom command',
      prompt: newPrompt,
    });
    setNewTrigger('');
    setNewDesc('');
    setNewPrompt('');
    success(`Command ${newTrigger} added.`);
  };

  return (
    <div className="space-y-6 animate-fade-in">

      {/* Sub tabs selector */}
      <div className="flex border-b border-white/[0.05] pb-px gap-6">
        {(['models', 'api', 'rules', 'commands'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveSubTab(tab)}
            className={cn(
              'pb-3 text-xs font-bold uppercase tracking-wider relative transition-all cursor-pointer',
              activeSubTab === tab ? 'text-[#4F7DFF]' : 'text-gray-500 hover:text-white'
            )}
          >
            {tab === 'api' ? 'API Keys' : tab}
            {activeSubTab === tab && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#4F7DFF] rounded-full" />
            )}
          </button>
        ))}
      </div>

      {/* ── MODELS TAB ── */}
      {activeSubTab === 'models' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {PROVIDERS.map(provider => {
            const isEnabled = enabledProviders.has(provider.id);
            return (
              <div
                key={provider.id}
                className={cn(
                  'p-5 rounded-2xl border bg-white/[0.01] transition-all duration-300',
                  isEnabled ? 'border-white/[0.08]' : 'border-white/[0.03] opacity-60'
                )}
              >
                <div className="flex justify-between items-start mb-3">
                  <div className="flex items-center gap-2.5">
                    <div
                      className="w-2.5 h-2.5 rounded-full"
                      style={{ background: provider.color }}
                    />
                    <h4 className="text-[14px] font-bold text-white leading-none">{provider.name}</h4>
                  </div>

                  <button
                    onClick={() => toggleProvider(provider.id)}
                    className="text-gray-500 hover:text-white transition-colors cursor-pointer"
                  >
                    {isEnabled ? (
                      <ToggleRight className="w-9 h-9 text-orange-500" />
                    ) : (
                      <ToggleLeft className="w-9 h-9 text-gray-700" />
                    )}
                  </button>
                </div>

                <p className="text-xs text-[#9CA3AF]/60 leading-relaxed mb-4">{provider.description}</p>

                {/* Model selector details */}
                {isEnabled && (
                  <div className="space-y-3 pt-3 border-t border-white/[0.04]">
                    <div>
                      <label className="text-[10px] font-bold text-gray-500 uppercase block mb-1">Active Model</label>
                      <select
                        value={selectedModelId}
                        onChange={(e) => setSelectedModelId(e.target.value)}
                        className="w-full bg-[#161618] border border-white/[0.08] rounded-xl px-3 py-2 text-xs font-semibold text-white outline-none cursor-pointer"
                      >
                        {provider.models.map(m => (
                          <option key={m.id} value={m.id}>
                            {m.displayName}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Tags */}
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {provider.models.find(m => m.id === selectedModelId)?.capabilities.map(cap => (
                        <span
                          key={cap}
                          className={cn('text-[9px] font-bold px-2 py-0.5 rounded uppercase tracking-wide', CAPABILITY_COLORS[cap])}
                        >
                          {cap}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ── API KEYS TAB ── */}
      {activeSubTab === 'api' && (
        <div className="space-y-4 max-w-2xl">
          {PROVIDERS.filter(p => p.requiresKey).map(provider => {
            const savedKey = apiKeys[provider.id];
            const displayValue = tempKeys[provider.id] !== undefined ? tempKeys[provider.id] : (savedKey ? '••••••••••••••••' : '');
            const result = testResult[provider.id];

            return (
              <div
                key={provider.id}
                className="p-5 rounded-2xl border border-white/[0.06] bg-white/[0.01] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
              >
                <div className="space-y-1 shrink-0">
                  <span className="text-xs font-bold text-white">{provider.name}</span>
                  <div className="flex items-center gap-2">
                    <Key className="w-3.5 h-3.5 text-gray-600" />
                    <span className="text-[10px] text-gray-500 font-mono">
                      {savedKey ? 'Key Configured' : 'No Key Saved'}
                    </span>
                  </div>
                </div>

                <div className="flex-1 w-full flex items-center gap-2">
                  <input
                    type="password"
                    value={displayValue}
                    placeholder="Enter API Key"
                    onChange={(e) => setTempKeys(prev => ({ ...prev, [provider.id]: e.target.value }))}
                    className="w-full bg-[#161618] border border-white/[0.08] rounded-xl px-3.5 py-2 text-xs font-mono text-white outline-none placeholder-gray-700"
                  />

                  {testingProvider === provider.id ? (
                    <button disabled className="px-4 py-2 bg-gray-800 text-gray-500 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-not-allowed">
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      Testing
                    </button>
                  ) : (
                    <button
                      onClick={() => handleTestConnection(provider.id)}
                      className="px-4 py-2 bg-white/[0.04] hover:bg-white/[0.08] text-white border border-white/[0.08] hover:border-white/[0.15] rounded-xl text-xs font-bold transition-all cursor-pointer"
                    >
                      Verify
                    </button>
                  )}
                </div>

                {/* Status indicator */}
                <div className="shrink-0 flex items-center gap-2">
                  {result?.status === 'success' && (
                    <div className="flex items-center gap-1 text-[11px] font-bold text-emerald-400">
                      <ShieldCheck className="w-4 h-4" />
                      {result.message}
                    </div>
                  )}
                  {result?.status === 'error' && (
                    <div className="flex items-center gap-1 text-[11px] font-bold text-red-400">
                      <ShieldAlert className="w-4 h-4" />
                      {result.message}
                    </div>
                  )}
                  {savedKey && !result && (
                    <div className="flex items-center gap-1 text-[11px] font-bold text-emerald-400">
                      <ShieldCheck className="w-4 h-4" />
                      ✓ Active
                    </div>
                  )}

                  {savedKey && (
                    <button
                      onClick={() => {
                        removeApiKey(provider.id);
                        setTempKeys(prev => ({ ...prev, [provider.id]: '' }));
                        success(`Removed ${provider.name} API key.`);
                      }}
                      className="p-2 rounded-lg text-gray-500 hover:text-red-400 hover:bg-red-500/10 transition-all cursor-pointer"
                      title="Remove key"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── RULES TAB ── */}
      {activeSubTab === 'rules' && (
        <div className="space-y-4 max-w-2xl">
          <div className="p-5 rounded-2xl border border-white/[0.06] bg-white/[0.01] space-y-4">
            <div className="space-y-1">
              <h4 className="text-xs font-bold text-white">System Instructions / Rules</h4>
              <p className="text-[11px] text-gray-500">
                Customize how X formats responses, answers coding queries, or structures solutions.
              </p>
            </div>

            <textarea
              value={rules.text}
              onChange={(e) => setRules({ text: e.target.value })}
              placeholder="e.g. Always explain before coding. Prefer C++ by default. Optimize for O(N) space."
              className="w-full h-40 bg-[#161618] border border-white/[0.08] rounded-xl px-4 py-3 text-xs text-gray-200 outline-none leading-relaxed resize-none focus:border-orange-500/50 transition-colors"
            />

            {/* Presets */}
            <div>
              <span className="text-[10px] font-bold text-gray-500 uppercase block mb-2">Preset Suggestions</span>
              <div className="flex flex-wrap gap-1.5">
                {[
                  'DSA-style explanations',
                  'Always mention complexity',
                  'Never spoil full solutions',
                  'Generate hints first',
                  'Prefer concise answers',
                  'Use modern C++20 standard',
                ].map(preset => (
                  <button
                    key={preset}
                    onClick={() => {
                      const text = rules.text ? `${rules.text}\n- ${preset}` : `- ${preset}`;
                      setRules({ text });
                      success(`Added rule: ${preset}`);
                    }}
                    className="px-2.5 py-1.5 rounded-lg bg-white/[0.03] hover:bg-white/[0.06] border border-white/[0.04] text-[10px] text-gray-400 hover:text-white transition-all cursor-pointer"
                  >
                    + {preset}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── COMMANDS TAB ── */}
      {activeSubTab === 'commands' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
          {/* List of current commands */}
          <div className="lg:col-span-2 space-y-3">
            <h4 className="text-[10px] font-semibold uppercase tracking-wider text-gray-500 px-1">Registered Commands</h4>
            <div className="space-y-2">
              {commands.map(cmd => (
                <div
                  key={cmd.trigger}
                  className="p-3.5 rounded-xl border border-white/[0.05] bg-white/[0.01] flex items-center justify-between gap-4"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <code className="text-xs font-mono font-bold text-orange-400">{cmd.trigger}</code>
                      {cmd.isBuiltIn && (
                        <span className="text-[8px] font-bold px-1.5 py-0.5 rounded bg-white/[0.04] text-gray-500 uppercase tracking-wide">
                          Built-in
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-gray-500 leading-normal">{cmd.description}</p>
                  </div>

                  {!cmd.isBuiltIn && (
                    <button
                      onClick={() => {
                        removeCustomCommand(cmd.trigger);
                        success(`Removed ${cmd.trigger}`);
                      }}
                      className="p-2 rounded-lg text-gray-650 hover:text-red-400 hover:bg-red-500/10 transition-all cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Add custom command form */}
          <div className="lg:col-span-1 p-5 rounded-2xl border border-white/[0.06] bg-white/[0.01] space-y-4">
            <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
              <Code className="w-4 h-4 text-orange-400" />
              Add Custom Command
            </h4>

            <form onSubmit={handleAddCommand} className="space-y-3">
              <div>
                <label className="text-[9px] font-bold text-gray-500 uppercase block mb-1">Trigger</label>
                <input
                  type="text"
                  placeholder="/refactor"
                  value={newTrigger}
                  onChange={(e) => setNewTrigger(e.target.value)}
                  className="w-full bg-[#161618] border border-white/[0.08] rounded-xl px-3 py-2 text-xs text-white outline-none"
                />
              </div>

              <div>
                <label className="text-[9px] font-bold text-gray-500 uppercase block mb-1">Description</label>
                <input
                  type="text"
                  placeholder="Clean and refactor code"
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  className="w-full bg-[#161618] border border-white/[0.08] rounded-xl px-3 py-2 text-xs text-white outline-none"
                />
              </div>

              <div>
                <label className="text-[9px] font-bold text-gray-500 uppercase block mb-1">Prompt Template</label>
                <textarea
                  placeholder="Rewrite this code to use clean variables:\n\n{code}"
                  value={newPrompt}
                  onChange={(e) => setNewPrompt(e.target.value)}
                  className="w-full h-24 bg-[#161618] border border-white/[0.08] rounded-xl px-3 py-2 text-xs text-white outline-none resize-none leading-relaxed"
                />
                <span className="text-[8px] text-gray-600 mt-1 block">
                  Supports templates: <code>{`{code}`}</code>, <code>{`{language}`}</code>, <code>{`{error}`}</code>.
                </span>
              </div>

              <button
                type="submit"
                className="w-full py-2 bg-orange-600 hover:bg-orange-500 text-white rounded-xl text-xs font-bold transition-all cursor-pointer active:scale-[0.97]"
              >
                Create Command
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Footer Info */}
      <div className="flex items-center gap-2 p-3 bg-white/[0.02] border border-white/[0.04] rounded-xl text-[11px] text-gray-500">
        <Info className="w-4 h-4 shrink-0 text-orange-400" />
        <span>
          All settings are saved directly in your browser. API keys are completely local and not shared with platform servers.
        </span>
      </div>

    </div>
  );
};
export default XSettings;
