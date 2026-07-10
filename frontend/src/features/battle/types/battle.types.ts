export type BattleMode = 'local' | 'invite';
export type BattleStatus = 'pending' | 'countdown' | 'active' | 'finished' | 'aborted';

export interface BattleProblemTemplate {
  language: string;
  template_code: string;
  source_code?: string;
  function_name?: string;
}

export interface BattleSampleTestCase {
  id: string;
  input: string;
  expected_output: string;
  is_sample: boolean;
}

export interface BattleTag {
  id: string;
  name: string;
}

export interface BattleProblem {
  id: string;
  slug: string;
  title: string;
  description: string;
  difficulty: string;
  time_limit_ms: number;
  memory_limit_kb: number;
  score_base: number;
  templates: BattleProblemTemplate[];
  sample_test_cases: BattleSampleTestCase[];
  tags: BattleTag[];
  constraints?: string | null;
  hints?: string[];
}

export interface BattlePlayerState {
  player_index: number;
  username: string;
  is_active: boolean;
  score: number;
  solved: boolean;
  solved_at: string | null;
  attempts: number;
  code: string;
  lang: 'python' | 'javascript' | 'cpp' | 'java';
  terminal: { status: 'idle' | 'running' | 'success' | 'failed'; logs: string[] };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  testResults: any[];
  progress?: Record<string, {
    code: string;
    lang: 'python' | 'javascript' | 'cpp' | 'java';
    solved: boolean;
    solved_at: string | null;
    attempts: number;
    score: number;
  }>;
  active_problem_index?: number;
}

export interface BattleRoom {
  id: string;
  host_username: string;
  max_players: number;
  status: BattleStatus;
  time_limit: number;
  time_left: number | null;
  problem_source: string;
  selected_slug: string | null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  custom_problem: any;
  problem_id: string | null;
  selected_slugs?: string[] | null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  custom_problems?: any[] | null;
  problem_ids?: string[] | null;
  start_time: string | null;
  created_at: string;
  players: BattlePlayerState[];
  problem: BattleProblem | null;
  problems?: BattleProblem[];
}
