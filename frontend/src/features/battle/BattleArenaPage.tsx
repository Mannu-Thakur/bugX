import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import Editor from '@monaco-editor/react';
import { 
  Swords, Trophy, Clock, Play, Send, AlertTriangle, Terminal, 
  Volume2, VolumeX, ArrowLeft
} from 'lucide-react';
import { MOCK_PROBLEM_DETAILS } from '../../shared/lib/mockData';
import { cn } from '../../shared/lib/cn';

// Simple CSS confetti particle generator in JS for premium visual reward without external dependencies!
interface ConfettiParticle {
  id: number;
  x: number;
  y: number;
  size: number;
  color: string;
  delay: number;
  duration: number;
  angle: number;
}

export const BattleArenaPage: React.FC = () => {
  const navigate = useNavigate();
  
  // Audio effects simulation (visual/console-based, with sound toggling option)
  const [soundEnabled, setSoundEnabled] = useState(true);
  
  // Configuration loaded from sessionStorage
  const [config, setConfig] = useState<any>(null);
  const [problem, setProblem] = useState<any>(null);
  
  // Timer State
  const [timeLeft, setTimeLeft] = useState(0);
  const [isTimeLow, setIsTimeLow] = useState(false);
  const [battleActive, setBattleActive] = useState(true);
  
  // Player 1 state
  const [p1Language, setP1Language] = useState<'javascript' | 'python'>('javascript');
  const [p1Code, setP1Code] = useState('');
  const [p1Terminal, setP1Terminal] = useState<{ status: 'idle' | 'running' | 'success' | 'failed'; logs: string[] }>({
    status: 'idle',
    logs: ['Terminal initialized. Ready for Player 1 code execution.']
  });
  const [, setP1TestResults] = useState<any[]>([]);
  const [p1Score, setP1Score] = useState(0);
  const [p1Solved, setP1Solved] = useState(false);
  const [p1Attempts, setP1Attempts] = useState(0);

  // Player 2 state
  const [p2Language, setP2Language] = useState<'javascript' | 'python'>('javascript');
  const [p2Code, setP2Code] = useState('');
  const [p2Terminal, setP2Terminal] = useState<{ status: 'idle' | 'running' | 'success' | 'failed'; logs: string[] }>({
    status: 'idle',
    logs: ['Terminal initialized. Ready for Player 2 code execution.']
  });
  const [, setP2TestResults] = useState<any[]>([]);
  const [p2Score, setP2Score] = useState(0);
  const [p2Solved, setP2Solved] = useState(false);
  const [p2Attempts, setP2Attempts] = useState(0);

  // General Battle States
  const [showWinnerModal, setShowWinnerModal] = useState(false);
  const [winner, setWinner] = useState<string | null>(null);
  const [confetti, setConfetti] = useState<ConfettiParticle[]>([]);
  
  // Loading and error states
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Load configuration from session storage on mount
  useEffect(() => {
    const rawConfig = sessionStorage.getItem('battleConfig');
    if (!rawConfig) {
      setErrorMsg("No active battle configuration found. Please return to the Battle Lobby to setup a match.");
      return;
    }

    try {
      const parsedConfig = JSON.parse(rawConfig);
      setConfig(parsedConfig);
      setTimeLeft(parsedConfig.timeLimit * 60);

      let problemDetail: any = null;

      if (parsedConfig.problemSource === 'catalog') {
        const slug = parsedConfig.selectedSlug;
        const catalogProb = MOCK_PROBLEM_DETAILS[slug];
        if (catalogProb) {
          problemDetail = {
            title: catalogProb.title,
            description: catalogProb.description,
            constraints: catalogProb.constraints || 'No constraints provided.',
            scoreBase: catalogProb.score_base,
            testCases: catalogProb.sample_test_cases.map(tc => ({
              input: tc.input || '',
              expectedOutput: tc.expected_output || ''
            })),
            pythonTemplate: catalogProb.templates.find(t => t.language === 'python')?.source_code || 
                            '# Write your solution here\n',
            jsTemplate: catalogProb.templates.find(t => t.language === 'javascript')?.source_code || 
                        '// Write your solution here\n'
          };
        } else {
          throw new Error(`Catalog problem with slug "${slug}" not found.`);
        }
      } else {
        // Custom problem
        const custom = parsedConfig.customProblem;
        problemDetail = {
          title: custom.title,
          description: custom.description,
          constraints: 'No constraints provided.',
          scoreBase: 300, // Fixed base score for custom problems
          testCases: custom.testCases.map((tc: any) => ({
            input: tc.input,
            expectedOutput: tc.expectedOutput
          })),
          pythonTemplate: custom.pythonTemplate,
          jsTemplate: custom.jsTemplate
        };
      }

      setProblem(problemDetail);
      
      // Initialize code editors with starter templates
      setP1Code(problemDetail.jsTemplate);
      setP2Code(problemDetail.jsTemplate);

    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || "Failed to load battle problem. Make sure it is defined correctly.");
    }
  }, []);

  // Timer Countdown Effect
  useEffect(() => {
    if (!battleActive || timeLeft <= 0) {
      if (timeLeft <= 0 && battleActive) {
        handleEndBattle(true); // End battle due to timeout
      }
      return;
    }

    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        if (prev < 60) {
          setIsTimeLow(true);
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [timeLeft, battleActive]);

  // CSS Confetti Generator Effect
  useEffect(() => {
    if (showWinnerModal) {
      const colors = ['#f43f5e', '#3b82f6', '#10b981', '#f59e0b', '#a855f7', '#ec4899', '#06b6d4'];
      const particles: ConfettiParticle[] = Array.from({ length: 80 }).map((_, i) => ({
        id: i,
        x: Math.random() * 100, // percentage width
        y: Math.random() * 20 - 20, // percentage height (above screen)
        size: Math.random() * 8 + 6,
        color: colors[Math.floor(Math.random() * colors.length)],
        delay: Math.random() * 3,
        duration: Math.random() * 2 + 3,
        angle: Math.random() * 360
      }));
      setConfetti(particles);
    } else {
      setConfetti([]);
    }
  }, [showWinnerModal]);

  if (errorMsg) {
    return (
      <div className="max-w-md mx-auto my-16 bg-dark-panel border border-dark-border rounded-xl p-8 text-center space-y-5 shadow-2xl">
        <div className="w-16 h-16 bg-rose-500/10 border border-rose-500/20 rounded-full flex items-center justify-center mx-auto text-rose-400">
          <AlertTriangle className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-bold text-gray-200">Battle Connection Error</h2>
        <p className="text-gray-400 text-sm leading-relaxed">{errorMsg}</p>
        <Link to="/battle">
          <button className="px-5 py-2.5 bg-dark-bg border border-dark-border hover:bg-dark-hover text-gray-300 font-bold rounded-lg text-sm transition-all flex items-center gap-2 mx-auto mt-2">
            <ArrowLeft className="w-4 h-4" /> Return to Lobby
          </button>
        </Link>
      </div>
    );
  }

  if (!config || !problem) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-xs text-gray-400 font-medium">Entering Battle Arena...</span>
        </div>
      </div>
    );
  }

  // Helper: Format Time
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Helper: Python line-by-line basic transpiler to Javascript
  const transpilePythonToJs = (pyCode: string) => {
    let jsCode = pyCode;
    
    // Remove type hints safely
    jsCode = jsCode.replace(/:\s*(?:list\[\w+\]|int|str|float|bool|dict\[\w+,\s*\w+\]|List\[\w+\]|Dict\[\w+,\s*\w+\])/g, '');
    jsCode = jsCode.replace(/->\s*(?:list\[\w+\]|int|str|float|bool|dict\[\w+,\s*\w+\]|List\[\w+\]|Dict\[\w+,\s*\w+\]|None)/g, '');

    // Replace class definitions
    jsCode = jsCode.replace(/class\s+Solution\s*:/g, '// class Solution');

    // Translate def parameters (self) and statements
    jsCode = jsCode.replace(/def\s+(\w+)\s*\(\s*self\s*,\s*/g, 'function $1(');
    jsCode = jsCode.replace(/def\s+(\w+)\s*\(\s*self\s*\)/g, 'function $1()');
    jsCode = jsCode.replace(/def\s+(\w+)\s*\(/g, 'function $1(');

    // Replace python comments
    jsCode = jsCode.replace(/#.*/g, match => match.replace('#', '//'));

    // Handle indentation indentation levels using a simple line parser
    const lines = jsCode.split('\n');
    const resultLines: string[] = [];
    const indentLevels: number[] = [];

    for (let i = 0; i < lines.length; i++) {
      let line = lines[i];
      const trimmed = line.trim();
      if (!trimmed) {
        resultLines.push(line);
        continue;
      }

      const spaces = line.match(/^(\s*)/)?.[1].length || 0;

      // Close braces if indentation decreased
      while (indentLevels.length > 0 && spaces < indentLevels[indentLevels.length - 1]) {
        const closedSpaces = indentLevels.pop() || 0;
        resultLines.push(' '.repeat(closedSpaces) + '}');
      }

      // Convert basic Python words/loops to JS
      let jsLine = line
        .replace(/\band\b/g, '&&')
        .replace(/\bor\b/g, '||')
        .replace(/\bnot\b/g, '!')
        .replace(/\bTrue\b/g, 'true')
        .replace(/\bFalse\b/g, 'false')
        .replace(/\bNone\b/g, 'null')
        .replace(/\belif\b/g, 'else if')
        .replace(/\bprint\s*\(/g, 'console.log(')
        .replace(/\bpass\b/g, '// pass')
        // len(x) -> x.length
        .replace(/len\(([^)]+)\)/g, '$1.length')
        // append -> push
        .replace(/\.append\(([^)]+)\)/g, '.push($1)')
        // Python style range loop translation: for i in range(x)
        .replace(/for\s+(\w+)\s+in\s+range\s*\(\s*([^)]+)\s*\)\s*:/g, (_match, variable, rangeVal) => {
          const parts = rangeVal.split(',').map((p: string) => p.trim());
          if (parts.length === 1) {
            return `for (let ${variable} = 0; ${variable} < ${parts[0]}; ${variable}++) {`;
          } else {
            return `for (let ${variable} = ${parts[0]}; ${variable} < ${parts[1]}; ${variable}++) {`;
          }
        });

      // Wrap if / while conditional statements in JS parenthesis
      if (jsLine.trim().startsWith('if ') && jsLine.trim().endsWith(':')) {
        const cond = jsLine.substring(jsLine.indexOf('if ') + 3, jsLine.lastIndexOf(':')).trim();
        jsLine = ' '.repeat(spaces) + `if (${cond}) :`;
      } else if (jsLine.trim().startsWith('while ') && jsLine.trim().endsWith(':')) {
        const cond = jsLine.substring(jsLine.indexOf('while ') + 6, jsLine.lastIndexOf(':')).trim();
        jsLine = ' '.repeat(spaces) + `while (${cond}) :`;
      }

      // If line ends with a colon, replace with {
      if (jsLine.trim().endsWith(':')) {
        jsLine = jsLine.substring(0, jsLine.lastIndexOf(':')) + ' {';
        indentLevels.push(spaces);
      }

      resultLines.push(jsLine);
    }

    // Close remaining indentation levels
    while (indentLevels.length > 0) {
      const closedSpaces = indentLevels.pop() || 0;
      resultLines.push(' '.repeat(closedSpaces) + '}');
    }

    return resultLines.join('\n');
  };

  // Helper: Auto-find JS/python main function name
  const findFunctionName = (code: string, fallbackName: string = 'solve') => {
    // Look for standard function declarations
    const match = code.match(/function\s+(\w+)/);
    if (match && match[1]) return match[1];
    
    // Look for arrow function definitions
    const arrowMatch = code.match(/(?:const|let|var)\s+(\w+)\s*=\s*(?:\([^)]*\)|[a-zA-Z_]\w*)\s*=>/);
    if (arrowMatch && arrowMatch[1]) return arrowMatch[1];
    
    // Look for Python def declarations
    const pythonMatch = code.match(/def\s+(\w+)\s*\(/);
    if (pythonMatch && pythonMatch[1]) return pythonMatch[1];

    return fallbackName;
  };

  // Local Code Execution Engine
  const executeCode = (code: string, language: 'javascript' | 'python', testCases: any[]) => {
    let runnableJs = code;

    // Transpile if python
    if (language === 'python') {
      runnableJs = transpilePythonToJs(code);
    }

    const functionName = findFunctionName(code, 'solve');
    const results: any[] = [];
    const logs: string[] = [`Running test cases against JS function "${functionName}"...`];
    let passedCount = 0;

    for (let i = 0; i < testCases.length; i++) {
      const tc = testCases[i];
      let args: any[] = [];
      
      try {
        // Safe JSON parsing for arguments
        const cleanInput = tc.input.trim();
        const wrapped = cleanInput.startsWith('[') && cleanInput.endsWith(']')
          ? cleanInput
          : `[${cleanInput}]`;
        
        args = JSON.parse(wrapped);
        if (!Array.isArray(args)) {
          args = [args];
        }
      } catch (err) {
        // Fallback to literal argument if JSON is not standard
        args = [tc.input];
      }

      try {
        // Create function runner
        // Include console.log mocking to grab logs if any!
        const consoleLogs: string[] = [];
        const mockConsole = {
          log: (...args: any[]) => {
            consoleLogs.push(args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' '));
          }
        };

        const runner = new Function(
          'console',
          `${runnableJs};
           return (typeof ${functionName} !== 'undefined') ? ${functionName}(...arguments) : null;`
        );

        // Execute sandboxed inside Function
        const startTime = performance.now();
        const returnedValue = runner(mockConsole, ...args);
        const duration = (performance.now() - startTime).toFixed(2);

        // Standardize output formats for validation
        const returnedStr = JSON.stringify(returnedValue);
        const expectedClean = tc.expectedOutput.trim();
        
        let expectedValue: any;
        try {
          expectedValue = JSON.parse(expectedClean);
        } catch {
          expectedValue = expectedClean;
        }
        
        const isMatched = JSON.stringify(returnedValue) === JSON.stringify(expectedValue) || 
                          returnedStr === expectedClean || 
                          String(returnedValue).trim() === expectedClean;

        if (consoleLogs.length > 0) {
          logs.push(`[TC ${i+1} Print]: ${consoleLogs.join(' | ')}`);
        }

        if (isMatched) {
          passedCount++;
          results.push({ id: `tc-${i}`, passed: true, input: tc.input, expected: tc.expectedOutput, actual: returnedStr, time: duration });
          logs.push(`✅ Test Case ${i + 1} PASSED (${duration}ms)`);
        } else {
          results.push({ id: `tc-${i}`, passed: false, input: tc.input, expected: tc.expectedOutput, actual: returnedStr, time: duration });
          logs.push(`❌ Test Case ${i + 1} FAILED: Expected "${tc.expectedOutput}", got "${returnedStr}" (${duration}ms)`);
        }

      } catch (err: any) {
        results.push({ id: `tc-${i}`, passed: false, input: tc.input, expected: tc.expectedOutput, error: err.message });
        logs.push(`🚨 Test Case ${i + 1} ERROR: ${err.message}`);
      }
    }

    return {
      success: passedCount === testCases.length,
      passedCount,
      totalCount: testCases.length,
      results,
      logs
    };
  };

  // Run Code logic for players
  const handleRunCode = (player: 1 | 2) => {
    const isP1 = player === 1;
    const name = isP1 ? config.player1 : config.player2;
    const code = isP1 ? p1Code : p2Code;
    const lang = isP1 ? p1Language : p2Language;
    const setTerminal = isP1 ? setP1Terminal : setP2Terminal;
    const setTestResults = isP1 ? setP1TestResults : setP2TestResults;
    const incrementAttempts = isP1 ? setP1Attempts : setP2Attempts;

    if (soundEnabled) {
      playSystemSound('click');
    }

    setTerminal({ status: 'running', logs: [`[${name}] Compiling and executing code locally...`] });
    incrementAttempts(prev => prev + 1);

    setTimeout(() => {
      // Execute only sample test cases (first 2 cases) for standard "Run Code"
      const sampleCases = problem.testCases.slice(0, 2);
      const execution = executeCode(code, lang, sampleCases);

      setTestResults(execution.results);
      setTerminal({
        status: execution.success ? 'success' : 'failed',
        logs: [
          ...execution.logs,
          `🏁 Execution completed. Passed ${execution.passedCount}/${execution.totalCount} sample test cases.`
        ]
      });
    }, 600);
  };

  // Submit Code logic for players
  const handleSubmitCode = (player: 1 | 2) => {
    const isP1 = player === 1;
    const name = isP1 ? config.player1 : config.player2;
    const code = isP1 ? p1Code : p2Code;
    const lang = isP1 ? p1Language : p2Language;
    
    const setTerminal = isP1 ? setP1Terminal : setP2Terminal;
    const setTestResults = isP1 ? setP1TestResults : setP2TestResults;
    const setScore = isP1 ? setP1Score : setP2Score;
    const setSolved = isP1 ? setP1Solved : setP2Solved;
    const attempts = isP1 ? p1Attempts : p2Attempts;
    const incrementAttempts = isP1 ? setP1Attempts : setP2Attempts;

    if (soundEnabled) {
      playSystemSound('submit');
    }

    setTerminal({ status: 'running', logs: [`🚨 [${name}] SUBMITTING: Running all validation test cases...`] });
    incrementAttempts(prev => prev + 1);

    setTimeout(() => {
      // Execute all test cases on full submission
      const execution = executeCode(code, lang, problem.testCases);

      setTestResults(execution.results);
      setTerminal({
        status: execution.success ? 'success' : 'failed',
        logs: [
          ...execution.logs,
          execution.success 
            ? `🎉 ALL ${execution.totalCount} TEST CASES PASSED! Solution Accepted.`
            : `❌ FAILED: ${execution.totalCount - execution.passedCount} test cases failed code validation.`
        ]
      });

      if (execution.success) {
        setSolved(true);
        if (soundEnabled) {
          playSystemSound('victory');
        }

        // Scoring Formula: Base Score * % of cases passed + Speed Bonus + Attempt Penalty
        // Speed bonus: Time left / Total time * 50
        const speedBonus = Math.floor((timeLeft / (config.timeLimit * 60)) * 50);
        // Attempt penalty: -5% per attempt, capped at 25% max penalty
        const penaltyMultiplier = Math.max(0.75, 1 - (attempts * 0.05));
        const finalScore = Math.floor((problem.scoreBase + speedBonus) * penaltyMultiplier);

        setScore(finalScore);

        // Check if both solved to auto-end battle
        const otherSolved = isP1 ? p2Solved : p1Solved;
        if (otherSolved) {
          // Both solved, trigger instant end
          setTimeout(() => {
            handleEndBattle(false, finalScore, isP1);
          }, 800);
        }
      }
    }, 900);
  };

  // Sound generator simulation using web audio API! No resources/files needed!
  const playSystemSound = (type: 'click' | 'submit' | 'victory' | 'defeat' | 'low-time') => {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      
      osc.connect(gain);
      gain.connect(audioCtx.destination);

      if (type === 'click') {
        osc.frequency.setValueAtTime(600, audioCtx.currentTime);
        gain.gain.setValueAtTime(0.05, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.05);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.05);
      } else if (type === 'submit') {
        osc.frequency.setValueAtTime(440, audioCtx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(880, audioCtx.currentTime + 0.15);
        gain.gain.setValueAtTime(0.08, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.15);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.15);
      } else if (type === 'victory') {
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(523.25, audioCtx.currentTime); // C5
        osc.frequency.setValueAtTime(659.25, audioCtx.currentTime + 0.1); // E5
        osc.frequency.setValueAtTime(783.99, audioCtx.currentTime + 0.2); // G5
        osc.frequency.setValueAtTime(1046.50, audioCtx.currentTime + 0.3); // C6
        gain.gain.setValueAtTime(0.1, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.6);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.6);
      } else if (type === 'defeat') {
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(220, audioCtx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(110, audioCtx.currentTime + 0.5);
        gain.gain.setValueAtTime(0.1, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.5);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.5);
      } else if (type === 'low-time') {
        osc.frequency.setValueAtTime(150, audioCtx.currentTime);
        gain.gain.setValueAtTime(0.15, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.1);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.1);
      }
    } catch (e) {
      console.warn("AudioContext failed to trigger.", e);
    }
  };

  // End Battle and show Winner Modal
  const handleEndBattle = (_isTimeout = false, overrideScore?: number, overridePlayer1?: boolean) => {
    setBattleActive(false);

    let p1FinalScore = p1Score;
    let p2FinalScore = p2Score;

    if (overrideScore !== undefined) {
      if (overridePlayer1) {
        p1FinalScore = overrideScore;
      } else {
        p2FinalScore = overrideScore;
      }
    }

    let winnerName = null;
    if (p1FinalScore > p2FinalScore) {
      winnerName = config.player1;
    } else if (p2FinalScore > p1FinalScore) {
      winnerName = config.player2;
    } else {
      winnerName = 'Tie Match';
    }

    setWinner(winnerName);
    setShowWinnerModal(true);

    if (soundEnabled) {
      playSystemSound(winnerName === 'Tie Match' ? 'defeat' : 'victory');
    }
  };

  // Handle conceding the match
  const handleConcede = (player: 1 | 2) => {
    const isP1 = player === 1;
    const name = isP1 ? config.player1 : config.player2;
    if (confirm(`${name}, are you sure you want to concede? This will award the match to your opponent.`)) {
      if (isP1) {
        setP2Score(problem.scoreBase);
        handleEndBattle(false, problem.scoreBase, false);
      } else {
        setP1Score(problem.scoreBase);
        handleEndBattle(false, problem.scoreBase, true);
      }
    }
  };

  // Language toggler
  const handleLanguageChange = (player: 1 | 2, lang: 'javascript' | 'python') => {
    if (player === 1) {
      setP1Language(lang);
      setP1Code(lang === 'javascript' ? problem.jsTemplate : problem.pythonTemplate);
    } else {
      setP2Language(lang);
      setP2Code(lang === 'javascript' ? problem.jsTemplate : problem.pythonTemplate);
    }
  };

  return (
    <div className="min-h-screen bg-[#07090e] text-gray-200 flex flex-col font-sans select-none overflow-hidden relative">
      
      {/* Zero-dependency pure CSS confetti particles rendering */}
      {showWinnerModal && confetti.map((p) => (
        <div 
          key={p.id}
          className="absolute rounded-sm pointer-events-none z-50 animate-confetti-fall"
          style={{
            left: `${p.x}%`,
            top: `${p.y}%`,
            width: `${p.size}px`,
            height: `${p.size * 1.6}px`,
            backgroundColor: p.color,
            animationDelay: `${p.delay}s`,
            animationDuration: `${p.duration}s`,
            transform: `rotate(${p.angle}deg)`,
            opacity: 0.85
          }}
        />
      ))}

      {/* Styled pure CSS animation frames specifically for our confetti fall */}
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes confetti-fall {
          0% {
            transform: translateY(0) rotate(0deg);
            opacity: 1;
          }
          100% {
            transform: translateY(110vh) rotate(720deg);
            opacity: 0;
          }
        }
        .animate-confetti-fall {
          position: absolute;
          animation-name: confetti-fall;
          animation-timing-function: cubic-bezier(0.1, 0.8, 0.3, 1);
          animation-fill-mode: forwards;
        }
      `}} />

      {/* Arena Header Bar */}
      <header className="bg-dark-panel/90 backdrop-blur-md border-b border-dark-border px-6 py-3 flex items-center justify-between select-none shrink-0 shadow-lg relative z-10">
        
        {/* Left Side: Swords + Lobby Return */}
        <div className="flex items-center gap-4">
          <Link to="/battle">
            <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-dark-bg border border-dark-border text-xs text-gray-400 hover:text-gray-200 transition-colors">
              <ArrowLeft className="w-3.5 h-3.5" /> Leave Arena
            </button>
          </Link>
          
          <div className="flex items-center gap-2">
            <Swords className="w-5 h-5 text-orange-500 animate-pulse" />
            <span className="text-xs uppercase font-black tracking-widest text-orange-500 bg-orange-500/10 px-2 py-0.5 rounded border border-orange-500/20">
              1v1 Battle
            </span>
          </div>
        </div>

        {/* Center: Digital Timer Block */}
        <div className="flex items-center gap-3 bg-dark-bg/80 border border-dark-border px-5 py-1.5 rounded-full shadow-inner">
          <Clock className={cn("w-4.5 h-4.5", isTimeLow ? "text-red-500 animate-bounce" : "text-amber-400")} />
          <span className={cn(
            "font-mono font-black text-xl tracking-wider select-none", 
            isTimeLow ? "text-red-500 drop-shadow-[0_0_10px_rgba(239,68,68,0.5)] animate-pulse" : "text-amber-400"
          )}>
            {formatTime(timeLeft)}
          </span>
        </div>

        {/* Right Side: Sound control & Manual Terminate */}
        <div className="flex items-center gap-3">
          <button 
            onClick={() => setSoundEnabled(!soundEnabled)}
            className="p-2 rounded-lg bg-dark-bg hover:bg-dark-hover border border-dark-border text-gray-400 hover:text-gray-200 transition-colors"
            title="Toggle Sound Effects"
          >
            {soundEnabled ? <Volume2 className="w-4 h-4 text-emerald-400" /> : <VolumeX className="w-4 h-4 text-gray-500" />}
          </button>
          <button 
            onClick={() => {
              if(confirm("Force end the battle? Score results will be compiled instantly.")) {
                handleEndBattle();
              }
            }}
            className="px-3.5 py-1.5 bg-rose-600/10 border border-rose-500/30 text-rose-400 hover:bg-rose-600/25 font-extrabold text-xs rounded-lg transition-all"
          >
            Force End Match
          </button>
        </div>
      </header>

      {/* Main Competitive Dashboard */}
      <section className="bg-dark-bg/40 border-b border-dark-border px-6 py-2 flex items-center justify-around shrink-0 select-none text-center">
        {/* Player 1 Card */}
        <div className="flex items-center gap-4 bg-blue-500/5 border border-blue-500/20 px-5 py-2.5 rounded-xl min-w-[240px]">
          <div className="w-10 h-10 bg-blue-600/20 border border-blue-500/40 rounded-xl flex items-center justify-center text-lg font-black text-blue-400">
            🔵
          </div>
          <div className="text-left space-y-0.5">
            <div className="text-sm font-black text-blue-400 flex items-center gap-1.5">
              {config.player1}
              {p1Solved && <span className="text-[10px] bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-1 rounded">SOLVED</span>}
            </div>
            <div className="text-xs text-gray-400 font-bold">Attempts: {p1Attempts}</div>
          </div>
          <div className="ml-auto text-right">
            <div className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Score</div>
            <div className="text-xl font-black text-blue-300 font-mono">{p1Score}</div>
          </div>
        </div>

        {/* VS Swords Graphic */}
        <div className="text-gray-600 font-black italic tracking-widest text-lg select-none px-4">
          VS
        </div>

        {/* Player 2 Card */}
        <div className="flex items-center gap-4 bg-rose-500/5 border border-rose-500/20 px-5 py-2.5 rounded-xl min-w-[240px]">
          <div className="ml-auto text-left">
            <div className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Score</div>
            <div className="text-xl font-black text-rose-300 font-mono">{p2Score}</div>
          </div>
          <div className="text-right space-y-0.5">
            <div className="text-sm font-black text-rose-400 flex items-center gap-1.5">
              {p2Solved && <span className="text-[10px] bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-1 rounded">SOLVED</span>}
              {config.player2}
            </div>
            <div className="text-xs text-gray-400 font-bold">Attempts: {p2Attempts}</div>
          </div>
          <div className="w-10 h-10 bg-rose-600/20 border border-rose-500/40 rounded-xl flex items-center justify-center text-lg font-black text-rose-400">
            🔴
          </div>
        </div>
      </section>

      {/* Main 3-Column Arena Workspace */}
      <main className="flex-1 flex overflow-hidden">
        
        {/* Column 1: Problem Description (Width 25%) */}
        <div className="w-[25%] border-r border-dark-border bg-dark-panel flex flex-col overflow-y-auto">
          <div className="p-5 space-y-5">
            <div className="space-y-2 border-b border-dark-border pb-4 select-none">
              <span className="text-[10px] font-black uppercase text-amber-500 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded">
                Base: {problem.scoreBase} PTS
              </span>
              <h2 className="text-lg font-black text-gray-100 mt-1">{problem.title}</h2>
            </div>
            
            <div className="text-gray-300 text-xs leading-relaxed space-y-3 whitespace-pre-wrap font-sans select-text">
              {problem.description}
            </div>

            {problem.constraints && (
              <div className="pt-4 border-t border-dark-border select-none">
                <h4 className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-2">Constraints</h4>
                <pre className="text-[10px] font-mono text-gray-400 bg-dark-bg p-3 border border-dark-border rounded-lg leading-normal whitespace-pre-wrap">
                  {problem.constraints}
                </pre>
              </div>
            )}

            {/* Test Cases display */}
            <div className="pt-4 border-t border-dark-border select-none">
              <h4 className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-2">Sample Test Cases</h4>
              <div className="space-y-2.5">
                {problem.testCases.slice(0, 2).map((tc: any, index: number) => (
                  <div key={index} className="bg-dark-bg border border-dark-border rounded-lg p-2.5 text-[10px] space-y-1.5">
                    <div className="font-bold text-gray-400">Test Case {index + 1}</div>
                    <div className="flex gap-1.5">
                      <span className="text-gray-500 shrink-0">Input:</span>
                      <code className="text-gray-300 font-mono truncate">{tc.input}</code>
                    </div>
                    <div className="flex gap-1.5">
                      <span className="text-gray-500 shrink-0">Output:</span>
                      <code className="text-emerald-400 font-mono truncate">{tc.expectedOutput}</code>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Column 2: Player 1 Workspace (Width 37.5%) */}
        <div className="w-[37.5%] border-r border-dark-border flex flex-col bg-dark-bg relative">
          
          {/* Workspace Title bar */}
          <div className="px-4 py-2 border-b border-dark-border bg-blue-950/15 flex items-center justify-between select-none">
            <span className="text-xs font-black text-blue-400 flex items-center gap-1.5">
              🔵 {config.player1} Workspace
            </span>
            
            {/* Lang Dropdown */}
            <select
              value={p1Language}
              onChange={(e) => handleLanguageChange(1, e.target.value as 'javascript' | 'python')}
              disabled={p1Solved || !battleActive}
              className="bg-dark-bg border border-dark-border text-gray-400 text-[10px] font-bold rounded px-2 py-1 focus:outline-none focus:border-blue-500/50"
            >
              <option value="javascript">JavaScript</option>
              <option value="python">Python</option>
            </select>
          </div>

          {/* Monaco Editor Container */}
          <div className="flex-1 min-h-[300px] border-b border-dark-border">
            <Editor
              height="100%"
              language={p1Language}
              value={p1Code}
              onChange={(val) => setP1Code(val || '')}
              theme="vs-dark"
              options={{
                fontSize: 12,
                minimap: { enabled: false },
                scrollbar: { vertical: 'visible', horizontal: 'visible' },
                readOnly: p1Solved || !battleActive,
                lineNumbersMinChars: 3,
                wordWrap: 'on'
              }}
            />
          </div>

          {/* Player 1 Actions Footer */}
          <div className="px-4 py-2 bg-dark-panel/40 flex justify-between items-center select-none">
            <button 
              onClick={() => handleConcede(1)}
              disabled={p1Solved || !battleActive}
              className="text-[10px] text-rose-400 hover:text-rose-300 font-bold transition-all px-2.5 py-1.5 rounded border border-rose-500/10 hover:bg-rose-500/5 disabled:opacity-50"
            >
              Concede
            </button>
            <div className="flex gap-2">
              <button
                onClick={() => handleRunCode(1)}
                disabled={p1Solved || !battleActive || p1Terminal.status === 'running'}
                className="px-3.5 py-1.5 bg-dark-bg hover:bg-dark-hover border border-dark-border text-gray-300 font-extrabold text-xs rounded-lg transition-all active:scale-95 flex items-center gap-1.5"
              >
                <Play className="w-3 h-3 text-gray-400" /> Run
              </button>
              <button
                onClick={() => handleSubmitCode(1)}
                disabled={p1Solved || !battleActive || p1Terminal.status === 'running'}
                className="px-4 py-1.5 bg-blue-500 hover:bg-blue-600 text-white font-black text-xs rounded-lg shadow shadow-blue-500/20 transition-all active:scale-95 flex items-center gap-1.5"
              >
                <Send className="w-3 h-3" /> Submit
              </button>
            </div>
          </div>

          {/* Terminal Logs Panel */}
          <div className="h-[180px] bg-[#0c0f16] border-t border-dark-border flex flex-col font-mono text-[10px]">
            <div className="px-3 py-1.5 border-b border-dark-border bg-dark-panel/50 text-gray-500 font-bold uppercase select-none flex items-center gap-1">
              <Terminal className="w-3.5 h-3.5" /> P1 Output Log
            </div>
            <div className="flex-1 p-3 overflow-y-auto space-y-1.5 select-text select-none">
              {p1Terminal.logs.map((log, idx) => (
                <div 
                  key={idx} 
                  className={cn(
                    "leading-relaxed", 
                    log.includes('✅') ? 'text-emerald-400 font-bold' : 
                    log.includes('❌') ? 'text-rose-400 font-bold' :
                    log.includes('🚨') ? 'text-orange-400 font-bold' : 
                    'text-gray-400'
                  )}
                >
                  {log}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Column 3: Player 2 Workspace (Width 37.5%) */}
        <div className="w-[37.5%] flex flex-col bg-dark-bg relative">
          
          {/* Workspace Title bar */}
          <div className="px-4 py-2 border-b border-dark-border bg-rose-950/15 flex items-center justify-between select-none">
            <span className="text-xs font-black text-rose-400 flex items-center gap-1.5">
              🔴 {config.player2} Workspace
            </span>
            
            {/* Lang Dropdown */}
            <select
              value={p2Language}
              onChange={(e) => handleLanguageChange(2, e.target.value as 'javascript' | 'python')}
              disabled={p2Solved || !battleActive}
              className="bg-dark-bg border border-dark-border text-gray-400 text-[10px] font-bold rounded px-2 py-1 focus:outline-none focus:border-rose-500/50"
            >
              <option value="javascript">JavaScript</option>
              <option value="python">Python</option>
            </select>
          </div>

          {/* Monaco Editor Container */}
          <div className="flex-1 min-h-[300px] border-b border-dark-border">
            <Editor
              height="100%"
              language={p2Language}
              value={p2Code}
              onChange={(val) => setP2Code(val || '')}
              theme="vs-dark"
              options={{
                fontSize: 12,
                minimap: { enabled: false },
                scrollbar: { vertical: 'visible', horizontal: 'visible' },
                readOnly: p2Solved || !battleActive,
                lineNumbersMinChars: 3,
                wordWrap: 'on'
              }}
            />
          </div>

          {/* Player 2 Actions Footer */}
          <div className="px-4 py-2 bg-dark-panel/40 flex justify-between items-center select-none">
            <button 
              onClick={() => handleConcede(2)}
              disabled={p2Solved || !battleActive}
              className="text-[10px] text-rose-400 hover:text-rose-300 font-bold transition-all px-2.5 py-1.5 rounded border border-rose-500/10 hover:bg-rose-500/5 disabled:opacity-50"
            >
              Concede
            </button>
            <div className="flex gap-2">
              <button
                onClick={() => handleRunCode(2)}
                disabled={p2Solved || !battleActive || p2Terminal.status === 'running'}
                className="px-3.5 py-1.5 bg-dark-bg hover:bg-dark-hover border border-dark-border text-gray-300 font-extrabold text-xs rounded-lg transition-all active:scale-95 flex items-center gap-1.5"
              >
                <Play className="w-3 h-3 text-gray-400" /> Run
              </button>
              <button
                onClick={() => handleSubmitCode(2)}
                disabled={p2Solved || !battleActive || p2Terminal.status === 'running'}
                className="px-4 py-1.5 bg-rose-500 hover:bg-rose-600 text-white font-black text-xs rounded-lg shadow shadow-rose-500/20 transition-all active:scale-95 flex items-center gap-1.5"
              >
                <Send className="w-3 h-3" /> Submit
              </button>
            </div>
          </div>

          {/* Terminal Logs Panel */}
          <div className="h-[180px] bg-[#0c0f16] border-t border-dark-border flex flex-col font-mono text-[10px]">
            <div className="px-3 py-1.5 border-b border-dark-border bg-dark-panel/50 text-gray-500 font-bold uppercase select-none flex items-center gap-1">
              <Terminal className="w-3.5 h-3.5" /> P2 Output Log
            </div>
            <div className="flex-1 p-3 overflow-y-auto space-y-1.5 select-text select-none">
              {p2Terminal.logs.map((log, idx) => (
                <div 
                  key={idx} 
                  className={cn(
                    "leading-relaxed", 
                    log.includes('✅') ? 'text-emerald-400 font-bold' : 
                    log.includes('❌') ? 'text-rose-400 font-bold' :
                    log.includes('🚨') ? 'text-orange-400 font-bold' : 
                    'text-gray-400'
                  )}
                >
                  {log}
                </div>
              ))}
            </div>
          </div>
        </div>

      </main>

      {/* Battle Results Premium Modal overlay */}
      {showWinnerModal && (
        <div className="fixed inset-0 z-50 bg-[#020305]/85 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in select-none">
          <div className="bg-dark-panel border border-dark-border max-w-lg w-full rounded-2xl p-8 space-y-6 shadow-2xl relative overflow-hidden select-none animate-scale-up">
            
            {/* Hologram top lighting banner */}
            <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-blue-500 via-orange-500 to-rose-500" />

            <div className="text-center space-y-4">
              <div className="inline-flex p-4 rounded-full bg-orange-500/10 border border-orange-500/20 text-orange-400 mx-auto animate-bounce">
                <Trophy className="w-10 h-10" />
              </div>
              
              <div className="space-y-1">
                <h3 className="text-2xl font-black text-gray-100 uppercase tracking-tight">Battle Concluded!</h3>
                <p className="text-xs text-gray-400 font-semibold tracking-wider uppercase">Scores & Standings</p>
              </div>
            </div>

            {/* Score comparison grid */}
            <div className="bg-dark-bg border border-dark-border rounded-xl p-4 divide-y divide-dark-border">
              {/* Player 1 summary */}
              <div className="flex justify-between items-center py-2.5">
                <span className="text-sm font-black text-blue-400">🔵 {config.player1}</span>
                <div className="flex items-center gap-3">
                  <span className="text-[10px] text-gray-500 uppercase font-bold">{p1Solved ? 'Solved' : 'Incomplete'}</span>
                  <span className="font-mono font-black text-lg text-blue-300">{p1Score} pts</span>
                </div>
              </div>
              
              {/* Player 2 summary */}
              <div className="flex justify-between items-center py-2.5">
                <span className="text-sm font-black text-rose-400">🔴 {config.player2}</span>
                <div className="flex items-center gap-3">
                  <span className="text-[10px] text-gray-500 uppercase font-bold">{p2Solved ? 'Solved' : 'Incomplete'}</span>
                  <span className="font-mono font-black text-lg text-rose-300">{p2Score} pts</span>
                </div>
              </div>
            </div>

            {/* Victory banner */}
            <div className="bg-gradient-to-r from-orange-500/10 via-orange-500/20 to-orange-500/10 border border-orange-500/20 p-4 rounded-xl text-center space-y-1 select-none">
              {winner === 'Tie Match' ? (
                <>
                  <div className="text-amber-400 font-black text-lg uppercase">⚔️ TIE MATCH ⚔️</div>
                  <div className="text-[11px] text-gray-400">Both players scored the exact same points! Excellent challenge.</div>
                </>
              ) : (
                <>
                  <div className="text-[10px] text-amber-500 uppercase font-extrabold tracking-widest">Victory Champion</div>
                  <div className="text-orange-400 font-black text-xl tracking-wide uppercase drop-shadow-[0_0_10px_rgba(249,115,22,0.3)]">
                    👑 {winner} 👑
                  </div>
                  <div className="text-[11px] text-gray-400 mt-1">Conquered the battlefield using pure algorithmic speed!</div>
                </>
              )}
            </div>

            {/* Modal actions */}
            <div className="grid grid-cols-2 gap-3 pt-2">
              <button 
                onClick={() => {
                  setShowWinnerModal(false);
                  navigate('/battle');
                }}
                className="py-3 px-4 bg-dark-bg border border-dark-border hover:bg-dark-hover text-gray-300 text-sm font-black rounded-xl transition-all"
              >
                Back to Lobby
              </button>
              <button 
                onClick={() => {
                  setShowWinnerModal(false);
                  // Quick remount / re-initialize the battle!
                  setTimeLeft(config.timeLimit * 60);
                  setIsTimeLow(false);
                  setP1Score(0);
                  setP1Attempts(0);
                  setP1Solved(false);
                  setP1Terminal({ status: 'idle', logs: ['Arena reset. Ready for rematch Player 1!'] });
                  setP1TestResults([]);
                  setP2Score(0);
                  setP2Attempts(0);
                  setP2Solved(false);
                  setP2Terminal({ status: 'idle', logs: ['Arena reset. Ready for rematch Player 2!'] });
                  setP2TestResults([]);
                  setBattleActive(true);
                }}
                className="py-3 px-4 bg-gradient-to-r from-orange-500 to-yellow-500 hover:from-orange-600 hover:to-yellow-600 text-white text-sm font-black rounded-xl transition-all shadow-md shadow-orange-500/20"
              >
                ⚔️ Play Rematch
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};
