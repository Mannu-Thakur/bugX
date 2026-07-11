import React, { useState, useEffect } from 'react';
import { Mic, MicOff, Send, Keyboard } from 'lucide-react';
import { useSpeechRecognition } from '../useSpeechRecognition';

interface AnswerInputProps {
  onSubmit: (text: string, method: 'typed' | 'voice') => void;
  disabled?: boolean;
}

export const AnswerInput: React.FC<AnswerInputProps> = ({ onSubmit, disabled }) => {
  const [answerText, setAnswerText] = useState('');
  const [inputMode, setInputMode] = useState<'text' | 'voice'>('text');

  const {
    isSupported: isVoiceSupported,
    isListening,
    transcript,
    interimTranscript,
    startListening,
    stopListening,
    resetTranscript,
    error: voiceError
  } = useSpeechRecognition();

  // Keep input text updated with voice transcript
  useEffect(() => {
    if (transcript) {
      setAnswerText(prev => {
        // Avoid repeating content if possible, or append smart-ly
        const combined = prev ? prev.trim() + ' ' + transcript : transcript;
        resetTranscript();
        return combined;
      });
    }
  }, [transcript, resetTranscript]);

  const toggleListening = () => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  };

  const handleSend = () => {
    if (!answerText.trim()) return;
    const finalMethod = inputMode === 'voice' || isListening ? 'voice' : 'typed';

    if (isListening) {
      stopListening();
    }

    onSubmit(answerText.trim(), finalMethod);
    setAnswerText('');
    resetTranscript();
  };

  return (
    <div className="rounded-2xl border border-[#262835] bg-gradient-to-br from-[#1c1d27] via-[#12131a] to-[#0d0e14] p-4 sm:p-5 space-y-4 shadow-2xl select-none hover:border-[#343647] transition-all duration-300">
      {/* Mode Switches */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setInputMode('text')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all duration-150 cursor-pointer ${
              inputMode === 'text'
                ? 'bg-white/[0.06] border border-white/[0.08] text-white/90'
                : 'text-white/40 hover:text-white/80 hover:bg-white/[0.02]'
            }`}
          >
            <Keyboard className="w-3.5 h-3.5" />
            Type Answer
          </button>
          {isVoiceSupported && (
            <button
              onClick={() => setInputMode('voice')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all duration-150 cursor-pointer ${
                inputMode === 'voice'
                  ? 'bg-white/[0.06] border border-white/[0.08] text-white/90'
                  : 'text-white/40 hover:text-white/80 hover:bg-white/[0.02]'
              }`}
            >
              <Mic className="w-3.5 h-3.5" />
              Speak Answer
            </button>
          )}
        </div>
        <span className="text-[10px] text-white/30 font-bold uppercase tracking-wider">
          Mic Status: {isListening ? 'LIVE' : 'MUTED'}
        </span>
      </div>

      {/* Answer Area */}
      <div className="relative">
        <textarea
          value={answerText + (isListening && interimTranscript ? (answerText ? ' ' : '') + interimTranscript : '')}
          onChange={(e) => setAnswerText(e.target.value)}
          placeholder={
            inputMode === 'voice'
              ? 'Click the mic button to start speaking...'
              : 'Write your response here. Feel free to discuss trade-offs, complexity, or alternative approaches...'
          }
          className="w-full min-h-[120px] bg-[#08090d]/85 rounded-xl border border-white/[0.05] p-3.5 text-xs text-white/90 placeholder-white/20 focus:outline-none focus:border-indigo-500/35 focus:bg-[#07080a] transition-all resize-y select-text leading-relaxed shadow-inner"
          disabled={disabled}
        />

        {/* Voice active overlay indicator */}
        {isListening && (
          <div className="absolute top-3.5 right-3.5 flex items-center gap-1.5 pointer-events-none select-none">
            <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
            <span className="text-[9px] font-black text-rose-400 tracking-wider uppercase bg-rose-950/50 px-1.5 py-0.5 rounded border border-rose-500/20">
              Recording
            </span>
          </div>
        )}
      </div>

      {/* Action panel (buttons) */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
        {voiceError ? (
          <p className="text-[11px] text-rose-400 font-bold flex-1 text-center sm:text-left">
            ⚠️ {voiceError}
          </p>
        ) : (
          <div className="flex items-center gap-2 text-[10px] text-white/30 font-medium">
            <span>💡 Quick tip: Speak or write details about time & space complexities.</span>
          </div>
        )}

        <div className="flex items-center gap-2 w-full sm:w-auto shrink-0 justify-end">
          {inputMode === 'voice' && (
            <button
              onClick={toggleListening}
              disabled={disabled}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold border transition-all duration-150 cursor-pointer select-none active:scale-[0.97] ${
                isListening
                  ? 'bg-rose-500/10 border-rose-500/30 text-rose-400 hover:bg-rose-500/20 shadow-md shadow-rose-500/10'
                  : 'bg-[#0d0f14]/80 border-white/[0.06] text-white/70 hover:bg-[#131316]/80 hover:border-white/[0.1]'
              }`}
            >
              {isListening ? (
                <>
                  <MicOff className="w-3.5 h-3.5" />
                  Stop Voice
                </>
              ) : (
                <>
                  <Mic className="w-3.5 h-3.5 text-indigo-400" />
                  Start Voice
                </>
              )}
            </button>
          )}

          <button
            onClick={handleSend}
            disabled={disabled || !answerText.trim()}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold border select-none transition-all duration-150 active:scale-[0.97] cursor-pointer ${
              !answerText.trim() || disabled
                ? 'bg-white/[0.02] border-white/[0.04] text-white/20 cursor-not-allowed'
                : 'bg-indigo-600 border-indigo-600 text-white hover:bg-indigo-550 hover:border-indigo-550 shadow-md shadow-indigo-500/10'
            }`}
          >
            Submit Answer
            <Send className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
