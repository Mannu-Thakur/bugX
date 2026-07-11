import { useCallback } from 'react';
import { useX } from '../x/XContext';
import { getModelById, type ProviderId } from '../x/xModels';
import type {
  InterviewQuestion,
  InterviewAnswer,
  AnswerEvaluation,
  InterviewConfig,
  SubmissionContext,
  InterviewReport,
  EvalScores,
  InterviewSession,
  QuestionFeedback,
  BadgeId,
} from './types';

// ─────────────────────────────────────────────────────────────
//  Helpers
// ─────────────────────────────────────────────────────────────
function generateId() {
  return Math.random().toString(36).slice(2, 10);
}

async function callAI(
  provider: NonNullable<ReturnType<typeof getModelById>>['provider'],
  model: NonNullable<ReturnType<typeof getModelById>>['model'],
  apiKey: string,
  systemPrompt: string,
  userPrompt: string
): Promise<string> {
  let resultText = '';

  if (provider.id === 'anthropic') {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true',
      },
      body: JSON.stringify({
        model: model.id,
        max_tokens: 2000,
        messages: [{ role: 'user', content: `${systemPrompt}\n\n${userPrompt}` }],
      }),
    });
    if (!response.ok) {
      const err = await response.text();
      throw new Error(`Anthropic error: ${response.status} - ${err}`);
    }
    const data = await response.json();
    resultText = data.content?.[0]?.text || '';
  } else {
    const response = await fetch(provider.apiEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: model.id,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        max_tokens: 2000,
        temperature: 0.7,
      }),
    });
    if (!response.ok) {
      const err = await response.text();
      throw new Error(`API error: ${response.status} - ${err}`);
    }
    const data = await response.json();
    resultText = data.choices?.[0]?.message?.content || '';
  }

  return resultText;
}

function parseJSON<T>(text: string): T {
  let cleaned = text.trim();
  const codeBlockMatch = cleaned.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
  if (codeBlockMatch) cleaned = codeBlockMatch[1];
  // Strip any leading/trailing non-JSON chars
  const jsonStart = cleaned.indexOf('[') !== -1 && cleaned.indexOf('{') !== -1
    ? Math.min(cleaned.indexOf('['), cleaned.indexOf('{'))
    : cleaned.indexOf('[') !== -1
    ? cleaned.indexOf('[')
    : cleaned.indexOf('{');
  const jsonEnd = Math.max(cleaned.lastIndexOf(']'), cleaned.lastIndexOf('}'));
  if (jsonStart >= 0 && jsonEnd >= 0) {
    cleaned = cleaned.slice(jsonStart, jsonEnd + 1);
  }
  return JSON.parse(cleaned) as T;
}

// ─────────────────────────────────────────────────────────────
//  Hook
// ─────────────────────────────────────────────────────────────
export function useInterviewAI() {
  const { selectedModelId, getEffectiveKey } = useX();

  const getAIClient = useCallback(() => {
    const modelInfo = getModelById(selectedModelId);
    if (!modelInfo) throw new Error('No AI model selected. Configure one in X Settings.');
    const { model, provider } = modelInfo;
    const apiKey = getEffectiveKey(provider.id as ProviderId);
    if (!apiKey) throw new Error(`No API key for ${provider.name}. Configure one in X Settings.`);
    return { model, provider, apiKey };
  }, [selectedModelId, getEffectiveKey]);

  // ── 1. Generate Questions ──────────────────────────────────
  const generateQuestions = useCallback(async (
    config: InterviewConfig,
    context: SubmissionContext
  ): Promise<InterviewQuestion[]> => {
    const { model, provider, apiKey } = getAIClient();

    const systemPrompt = `You are a senior FAANG interviewer conducting a ${config.mode.replace('_', ' ')} interview.
Generate exactly ${config.questionCount} interview questions based on the candidate's solution.
Return ONLY a JSON array (no markdown, no extra text) with this schema:
[{
  "id": "string",
  "text": "the question text",
  "category": "one of: algorithm_choice|time_complexity|space_complexity|edge_cases|trade_offs|alternatives|optimizations|communication|system_design|behavioral|custom",
  "isFollowUp": false,
  "hint": "optional 1-sentence hint",
  "expectedKeywords": ["key", "concepts", "expected"]
}]

Rules:
- Be SPECIFIC to the actual code provided, not generic
- Questions should probe understanding, not just recall facts
- Difficulty: ${config.difficulty} (easy=conceptual, medium=deeper analysis, hard=optimization/alternatives, expert=advanced scalability)
- Mode: ${config.mode === 'technical' ? 'Focus on algorithm, complexity, edge cases, alternatives' : config.mode === 'hr' ? 'Focus on behavioral: teamwork, challenges, motivation' : config.mode === 'system_design' ? 'Focus on scaling, architecture, data models, trade-offs' : `Focus on topics: ${config.customTopics?.join(', ')}`}
- Make questions feel like a REAL interview conversation, not a quiz`;

    const userPrompt = `Problem: ${context.problemTitle}
Difficulty: ${context.difficulty}
Description: ${context.problemDescription.slice(0, 800)}
Constraints: ${context.constraints || 'None specified'}

Candidate's Solution (${context.language}):
\`\`\`${context.language}
${context.sourceCode.slice(0, 1500)}
\`\`\`
Runtime: ${context.runtimeMs !== null ? `${context.runtimeMs}ms` : 'N/A'}
Memory: ${context.memoryKb !== null ? `${(context.memoryKb / 1024).toFixed(1)}MB` : 'N/A'}

Generate ${config.questionCount} interview questions.`;

    const rawText = await callAI(provider, model, apiKey, systemPrompt, userPrompt);
    const parsed = parseJSON<InterviewQuestion[]>(rawText);

    // Ensure all required fields exist
    return parsed.map((q, i) => ({
      id: q.id || generateId(),
      text: q.text || `Question ${i + 1}`,
      category: q.category || 'algorithm_choice',
      isFollowUp: q.isFollowUp ?? false,
      hint: q.hint,
      expectedKeywords: q.expectedKeywords || [],
    }));
  }, [getAIClient]);

  // ── 2. Evaluate Answer ─────────────────────────────────────
  const evaluateAnswer = useCallback(async (
    question: InterviewQuestion,
    answer: InterviewAnswer,
    session: Pick<InterviewSession, 'config' | 'submissionContext' | 'questions' | 'answers' | 'evaluations'>
  ): Promise<AnswerEvaluation> => {
    const { model, provider, apiKey } = getAIClient();

    const systemPrompt = `You are a senior FAANG interviewer evaluating a candidate's answer.
Return ONLY a JSON object (no markdown, no extra text) with this EXACT schema:
{
  "scores": {
    "technicalAccuracy": 0-10,
    "communication": 0-10,
    "confidence": 0-10,
    "problemSolving": 0-10,
    "optimizationKnowledge": 0-10,
    "complexityUnderstanding": 0-10
  },
  "feedback": "2-3 sentence specific feedback on this answer",
  "expectedDiscussion": "What a strong answer should have included (2-3 sentences)",
  "score": 0-10,
  "nextDifficulty": "easier|same|harder"
}

Scoring guidelines:
- 9-10: Exceptional, demonstrates expert-level understanding
- 7-8: Strong answer, covers main points
- 5-6: Adequate but missing important details
- 3-4: Partial understanding, significant gaps
- 1-2: Incorrect or very incomplete
- nextDifficulty: 'harder' if score >= 7, 'easier' if score <= 4, 'same' otherwise`;

    const conversationHistory = session.questions
      .slice(0, session.answers.length)
      .map((q, i) => `Q: ${q.text}\nA: ${session.answers[i]?.text || '(skipped)'}`)
      .join('\n\n');

    const userPrompt = `Candidate solved: ${session.submissionContext.problemTitle}
Their code (${session.submissionContext.language}):
\`\`\`
${session.submissionContext.sourceCode.slice(0, 800)}
\`\`\`

Previous Q&A:
${conversationHistory || 'None yet'}

Current Question: "${question.text}"
Candidate's Answer: "${answer.text}"
Answer duration: ${answer.durationSec}s

Evaluate the answer.`;

    const rawText = await callAI(provider, model, apiKey, systemPrompt, userPrompt);
    const parsed = parseJSON<AnswerEvaluation>(rawText);

    return {
      questionId: question.id,
      scores: {
        technicalAccuracy: Number(parsed.scores?.technicalAccuracy ?? 5),
        communication: Number(parsed.scores?.communication ?? 5),
        confidence: Number(parsed.scores?.confidence ?? 5),
        problemSolving: Number(parsed.scores?.problemSolving ?? 5),
        optimizationKnowledge: Number(parsed.scores?.optimizationKnowledge ?? 5),
        complexityUnderstanding: Number(parsed.scores?.complexityUnderstanding ?? 5),
      },
      feedback: parsed.feedback || 'Feedback unavailable.',
      expectedDiscussion: parsed.expectedDiscussion || 'No expected discussion available.',
      score: Number(parsed.score ?? 5),
      nextDifficulty: parsed.nextDifficulty || 'same',
    };
  }, [getAIClient]);

  // ── 3. Generate Adaptive Follow-Up ────────────────────────
  const generateFollowUp = useCallback(async (
    lastQuestion: InterviewQuestion,
    lastEvaluation: AnswerEvaluation,
    context: SubmissionContext
  ): Promise<InterviewQuestion> => {
    const { model, provider, apiKey } = getAIClient();

    const direction = lastEvaluation.nextDifficulty;
    const systemPrompt = `You are a FAANG interviewer. Generate ONE follow-up question.
Return ONLY a JSON object (no markdown):
{
  "id": "string",
  "text": "the follow-up question",
  "category": "one of: algorithm_choice|time_complexity|space_complexity|edge_cases|trade_offs|alternatives|optimizations|communication|system_design|behavioral|custom",
  "isFollowUp": true,
  "hint": "optional hint"
}
The follow-up should be ${direction === 'harder' ? 'MORE challenging and probe deeper' : direction === 'easier' ? 'SIMPLER and more foundational' : 'at the same level'}.`;

    const userPrompt = `Problem: ${context.problemTitle}
Previous question: "${lastQuestion.text}"
Previous score: ${lastEvaluation.score}/10
Candidate feedback: ${lastEvaluation.feedback}

Generate an adaptive follow-up question.`;

    const rawText = await callAI(provider, model, apiKey, systemPrompt, userPrompt);
    const parsed = parseJSON<InterviewQuestion>(rawText);

    return {
      id: parsed.id || generateId(),
      text: parsed.text || 'Can you elaborate further?',
      category: parsed.category || lastQuestion.category,
      isFollowUp: true,
      followUpOf: lastQuestion.id,
      hint: parsed.hint,
      expectedKeywords: [],
    };
  }, [getAIClient]);

  // ── 4. Generate Report ─────────────────────────────────────
  const generateReport = useCallback(async (
    session: InterviewSession
  ): Promise<InterviewReport> => {
    const { model, provider, apiKey } = getAIClient();

    if (session.evaluations.length === 0) {
      throw new Error('No evaluations to generate report from.');
    }

    // Compute averaged scores
    const avgScores: EvalScores = {
      technicalAccuracy: 0,
      communication: 0,
      confidence: 0,
      problemSolving: 0,
      optimizationKnowledge: 0,
      complexityUnderstanding: 0,
    };
    for (const ev of session.evaluations) {
      avgScores.technicalAccuracy += ev.scores.technicalAccuracy;
      avgScores.communication += ev.scores.communication;
      avgScores.confidence += ev.scores.confidence;
      avgScores.problemSolving += ev.scores.problemSolving;
      avgScores.optimizationKnowledge += ev.scores.optimizationKnowledge;
      avgScores.complexityUnderstanding += ev.scores.complexityUnderstanding;
    }
    const n = session.evaluations.length;
    for (const key of Object.keys(avgScores) as Array<keyof EvalScores>) {
      avgScores[key] = Math.round((avgScores[key] / n) * 10) / 10;
    }

    const overallScore = Math.round(
      (session.evaluations.reduce((s, e) => s + e.score, 0) / n) * 10
    );

    const systemPrompt = `You are a FAANG interviewer writing a comprehensive interview report.
Return ONLY a JSON object (no markdown):
{
  "strengths": ["string", "string", "string"],
  "weaknesses": ["string", "string"],
  "suggestedTopics": ["topic1", "topic2", "topic3"],
  "recommendedProblems": ["problem1", "problem2", "problem3"],
  "summary": "3-4 sentence overall interview summary"
}`;

    const qaHistory = session.questions.map((q, i) => {
      const ans = session.answers[i];
      const ev = session.evaluations.find(e => e.questionId === q.id);
      return `Q: ${q.text}\nA: ${ans?.text || '(skipped)'}\nScore: ${ev?.score ?? 0}/10\nFeedback: ${ev?.feedback || 'N/A'}`;
    }).join('\n\n');

    const userPrompt = `Interview for: ${session.submissionContext.problemTitle}
Mode: ${session.config.mode} | Difficulty: ${session.config.difficulty}
Overall score: ${overallScore}/100
Avg scores: Technical=${avgScores.technicalAccuracy}, Communication=${avgScores.communication}, Complexity=${avgScores.complexityUnderstanding}

Interview Transcript:
${qaHistory}

Generate a detailed interview report.`;

    const rawText = await callAI(provider, model, apiKey, systemPrompt, userPrompt);
    const parsed = parseJSON<Pick<InterviewReport, 'strengths' | 'weaknesses' | 'suggestedTopics' | 'recommendedProblems' | 'summary'>>(rawText);

    // Determine badges
    const badges: BadgeId[] = [];
    if (overallScore >= 95) badges.push('perfect_score');
    if (avgScores.communication >= 9) badges.push('excellent_communicator');
    if (avgScores.complexityUnderstanding >= 9) badges.push('complexity_expert');
    if (avgScores.technicalAccuracy >= 9) badges.push('algorithm_guru');
    if (session.config.mode === 'system_design') badges.push('system_design_pro');
    const avgDuration = session.answers.reduce((s, a) => s + a.durationSec, 0) / n;
    if (avgDuration < 60) badges.push('speed_demon');

    // Detailed feedback
    const detailedFeedback: QuestionFeedback[] = session.questions.map((q, i) => {
      const ev = session.evaluations.find(e => e.questionId === q.id);
      return {
        question: q.text,
        candidateAnswer: session.answers[i]?.text || '(skipped)',
        feedback: ev?.feedback || 'Not evaluated',
        expectedDiscussion: ev?.expectedDiscussion || '',
        score: ev?.score ?? 0,
      };
    });

    return {
      overallScore,
      scores: avgScores,
      strengths: parsed.strengths || ['Good effort'],
      weaknesses: parsed.weaknesses || [],
      suggestedTopics: parsed.suggestedTopics || [],
      recommendedProblems: parsed.recommendedProblems || [],
      badges,
      detailedFeedback,
      summary: parsed.summary || 'Interview completed.',
    };
  }, [getAIClient]);

  return { generateQuestions, evaluateAnswer, generateFollowUp, generateReport };
}
