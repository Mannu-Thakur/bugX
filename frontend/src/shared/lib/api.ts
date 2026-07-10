import { ENV } from '../config/env';

// Core Types
export type Role = 'USER' | 'ADMIN';
export type Difficulty = 'EASY' | 'MEDIUM' | 'HARD';
export type Language = 'python' | 'javascript' | 'cpp' | 'java';

export type SubmissionStatus =
  | 'PENDING'
  | 'RUNNING'
  | 'ACCEPTED'
  | 'SAMPLE_PASSED'
  | 'WRONG_ANSWER'
  | 'TIME_LIMIT'
  | 'RUNTIME_ERROR'
  | 'COMPILE_ERROR'
  | 'MEMORY_LIMIT';

export interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  pages: number;
}

export interface User {
  id: string;
  email: string;
  username: string;
  role: Role;
  avatarUrl: string | null;
  leetcodeUrl: string | null;
  githubUrl: string | null;
  linkedinUrl: string | null;
  portfolioUrl: string | null;
  fullName: string | null;
  bio: string | null;
  location: string | null;
  isActive: boolean;
  createdAt: string;
}

export interface StudyFileItem {
  id: string;
  subject: string;
  name: string;
  type: string;
  size: number;
  uploadedAt: string;
}

export interface UserStats {
  total_solved: number;
  easy_solved: number;
  medium_solved: number;
  hard_solved: number;
  total_score: number;
  current_streak: number;
  best_streak: number;
  last_active_date: string | null;
}

export interface LeaderboardEntry {
  rank: number;
  username: string;
  score: number;
  solved: number;
}

export interface SubmissionSummary {
  id: string;
  problem_id: string;
  problem_slug?: string | null;
  problem_title?: string | null;
  language: string;
  status: string;
  score: number;
  runtime_ms: number | null;
  run_samples_only: boolean;
  source_code: string;
  error_message?: string | null;
  created_at: string;
}

export interface Tag {
  id: string;
  name: string;
}

export interface ProblemListItem {
  id: string;
  slug: string;
  title: string;
  difficulty: Difficulty;
  acceptance_rate: number | null;
  score_base: number;
  tags: Tag[];
  is_published: boolean;
  created_at: string;
  user_status?: { solved: boolean; best_score: number | null } | null;
}

export interface ProblemDetail {
  id: string;
  slug: string;
  title: string;
  difficulty: Difficulty;
  description: string;
  constraints: string | null;
  acceptance_rate: number | null;
  score_base: number;
  time_limit_ms: number;
  memory_limit_kb: number;
  tags: Tag[];
  templates: { language: string; source_code?: string; template_code?: string; function_name?: string; arg_style?: string }[];
  sample_test_cases: { id: string; input: string | null; expected_output: string | null; is_sample: boolean }[];
  is_published: boolean;
  created_at: string;
  user_status: { solved: boolean; best_score: number | null } | null;
  hints?: string[];
}

export interface CompanyListItem {
  id: string;
  name: string;
  slug: string;
  logo_light: string | null;
  logo_dark: string | null;
  brand_color: string | null;
  totalProblems: number;
  easyCount: number;
  mediumCount: number;
  hardCount: number;
}

export interface CompanyDetail {
  name: string;
  slug: string;
  logo_light: string | null;
  logo_dark: string | null;
  brand_color: string | null;
}

export interface CompanyResponse {
  company: CompanyDetail;
  problems: Paginated<ProblemListItem>;
  stats: {
    totalProblems: number;
    easyCount: number;
    mediumCount: number;
    hardCount: number;
    topics: { name: string; slug: string; count: number }[];
  };
}

export interface TopicListItem {
  id: string;
  name: string;
  slug: string;
  totalProblems: number;
  easyCount: number;
  mediumCount: number;
  hardCount: number;
}

export interface TopicDetail {
  name: string;
  slug: string;
}

export interface TopicResponse {
  topic: TopicDetail;
  problems: Paginated<ProblemListItem>;
  stats: {
    totalProblems: number;
    easyCount: number;
    mediumCount: number;
    hardCount: number;
  };
}

export interface StatsOverview {
  totalProblems: number;
  totalCompanies: number;
  totalTopics: number;
  solvedCount: number;
  bookmarkedCount: number;
  difficultyDistribution: { easy: number; medium: number; hard: number };
  sourceDistribution: Record<string, number>;
  companyDistribution: { name: string; slug: string; count: number }[];
  topic_distribution: { name: string; slug: string; count: number }[];
  recentProblems: ProblemListItem[];
}

export interface ProblemListParams {
  page?: number;
  limit?: number;
  difficulty?: string;
  tag?: string;
  search?: string;
  sort?: string;
  company?: string;
  topic?: string;
  source?: string;
  solved?: string;
  bookmarked?: string;
}

export interface TemplateCreatePayload {
  language: string;
  template_code: string;
  function_name: string;
  arg_style: string;
}

export interface TestCaseCreatePayload {
  input: string;
  expected_output: string;
  is_sample?: boolean;
  order_index: number;
  weight?: number;
}

export interface ProblemCreatePayload {
  slug: string;
  title: string;
  description: string;
  difficulty: Difficulty;
  time_limit_ms?: number;
  memory_limit_kb?: number;
  score_base?: number;
  runtime_bonus_max?: number;
  expected_complexity?: string | null;
  tag_ids?: string[];
  templates: TemplateCreatePayload[];
  test_cases: TestCaseCreatePayload[];
}

export interface ProblemUpdatePayload {
  title?: string;
  description?: string;
  difficulty?: Difficulty;
  time_limit_ms?: number;
  memory_limit_kb?: number;
  score_base?: number;
  runtime_bonus_max?: number;
  expected_complexity?: string | null;
  is_published?: boolean;
  tag_ids?: string[];
}

export interface SubmissionCreatePayload {
  problem_id: string;
  language: string;
  source_code: string;
  run_samples_only?: boolean;
  battle_id?: string;
}

export interface SubmissionResponse {
  id: string;
  user_id: string;
  problem_id: string;
  language: string;
  status: SubmissionStatus;
  passed_count: number;
  total_count: number;
  passed_weight: number;
  total_weight: number;
  score: number;
  runtime_ms: number | null;
  memory_kb: number | null;
  error_message: string | null;
  source_code: string;
  run_samples_only: boolean;
  problem_slug?: string | null;
  problem_title?: string | null;
  created_at: string;
  updated_at: string;
}

export interface SubmissionResultResponse {
  id: string;
  test_case_id: string;
  passed: boolean;
  runtime_ms: number;
  memory_kb: number;
  test_case_input: string | null;
  expected_output: string | null;
  stdout: string | null;
  stderr: string | null;
  is_sample?: boolean;
  is_first_failing_hidden?: boolean;
}

export interface BestSubmissionResponse {
  id: string;
  status: string;
  score: number;
  runtime_ms: number | null;
  passed_count: number;
  total_count: number;
  created_at: string;
}

export interface LastSubmissionResponse {
  id: string;
  language: string;
  source_code: string;
  status: string;
  score: number;
  runtime_ms: number | null;
  passed_count: number;
  total_count: number;
  created_at: string;
}

export interface ApiError {
  status: number;
  code: string;
  message: string;
  detail: unknown;
}

// Token Storage — Remember Me aware
// When remember=true, store in localStorage (survives browser close).
// When remember=false, store in sessionStorage (cleared on browser close).
// A small flag in localStorage tracks which storage is active.
const TOKEN_KEY = 'access_token';
const REMEMBER_KEY = 'remember_me';

export const getToken = (): string | null => {
  const remembered = localStorage.getItem(REMEMBER_KEY) === '1';
  if (remembered) {
    return localStorage.getItem(TOKEN_KEY);
  }
  return sessionStorage.getItem(TOKEN_KEY) || localStorage.getItem(TOKEN_KEY);
};

export const setToken = (token: string, remember: boolean = true): void => {
  if (remember) {
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(REMEMBER_KEY, '1');
    sessionStorage.removeItem(TOKEN_KEY);
  } else {
    sessionStorage.setItem(TOKEN_KEY, token);
    localStorage.removeItem(TOKEN_KEY);
    localStorage.setItem(REMEMBER_KEY, '0');
  }
};

export const clearToken = (): void => {
  localStorage.removeItem(TOKEN_KEY);
  sessionStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(REMEMBER_KEY);
};

// Response / Error Normalization
export async function normalizeError(response: Response): Promise<ApiError> {
  const status = response.status;
  let code = 'ERROR';
  let message = 'An unexpected error occurred.';
  let detail: unknown = null;

  // Detect 429 rate limits first to guarantee RATE_LIMIT code mapping
  if (status === 429) {
    return {
      status,
      code: 'RATE_LIMIT',
      message: 'Too many requests. Please wait before trying again.',
      detail: null,
    };
  }

  try {
    const data = await response.json();
    detail = data.detail;

    if (data.code) {
      code = data.code;
    }

    if (typeof data.message === 'string') {
      message = data.message;
    } else if (typeof detail === 'string') {
      message = detail;
    } else if (detail && typeof detail === 'object' && !Array.isArray(detail)) {
      const detailObj = detail as Record<string, unknown>;
      if (typeof detailObj.message === 'string') {
        message = detailObj.message;
      }
      if (typeof detailObj.error_type === 'string') {
        code = detailObj.error_type;
      }
    } else if (Array.isArray(detail)) {
      // FastAPI ValidationError parsing e.g. [{loc: ['body', 'password'], msg: '...', type: '...'}]
      const parts = (detail as Array<{ loc?: (string | number)[]; msg: string; type: string }>).map((err) => {
        const field = err.loc ? err.loc[err.loc.length - 1] : '';
        return field ? `${field}: ${err.msg}` : err.msg;
      });
      message = parts.join(' | ');
      code = 'VALIDATION_ERROR';
    }
  } catch {
    message = response.statusText || message;
  }

  return {
    status,
    code,
    message,
    detail,
  };
}

// API Call Wrapper
interface RequestOptions extends RequestInit {
  params?: Record<string, string | number | boolean | undefined>;
}

const apiOrigin = ENV.API_URL.replace(/\/api\/v\d+\/?$/, '');

const toAssetUrl = (value?: string | null): string | null => {
  if (!value) return null;
  if (/^(https?:|data:|blob:)/i.test(value)) return value;
  if (value.startsWith('/')) return `${apiOrigin}${value}`;
  return value;
};

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { params, headers: customHeaders, ...rest } = options;

  let url = `${ENV.API_URL}${path}`;
  if (params) {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined) {
        searchParams.append(key, String(value));
      }
    });
    const queryString = searchParams.toString();
    if (queryString) {
      url += `?${queryString}`;
    }
  }

  const headers = new Headers(customHeaders);
  if (!headers.has('Content-Type') && !(rest.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }

  const token = getToken();
  const hadToken = Boolean(token);
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  let response: Response;
  try {
    response = await fetch(url, {
      ...rest,
      headers,
    });
  } catch (err) {
    const networkError: ApiError = {
      status: 0,
      code: 'NETWORK_ERROR',
      message: 'Backend Core: offline? The backend server is unreachable. Please verify it is running.',
      detail: err instanceof Error ? err.message : String(err),
    };
    throw networkError;
  }

  if (!response.ok) {
    const error = await normalizeError(response);

    // Auto-logout on 401 Unauthorized unless we're actually calling login/register
    if (response.status === 401 && hadToken && !path.includes('/auth/')) {
      clearToken();
      window.dispatchEvent(new Event('auth_session_expired'));
    }

    throw error;
  }

  if (response.status === 204) {
    return null as T;
  }

  return response.json();
}

// Endpoint Client
interface RawLeaderboardEntry {
  rank: number;
  username: string;
  total_score?: number;
  total_solved?: number;
  weekly_score?: number;
  weekly_solved?: number;
}

interface RawUser {
  id: string;
  email: string;
  username: string;
  role: Role;
  avatar_url?: string | null;
  avatarUrl?: string | null;
  leetcode_url?: string | null;
  leetcodeUrl?: string | null;
  github_url?: string | null;
  githubUrl?: string | null;
  linkedin_url?: string | null;
  linkedinUrl?: string | null;
  portfolio_url?: string | null;
  portfolioUrl?: string | null;
  full_name?: string | null;
  fullName?: string | null;
  bio?: string | null;
  location?: string | null;
  is_active?: boolean;
  isActive?: boolean;
  created_at?: string;
  createdAt?: string;
}

const normalizeUser = (raw: RawUser): User => ({
  id: raw.id,
  email: raw.email,
  username: raw.username,
  role: raw.role,
  avatarUrl: toAssetUrl(raw.avatarUrl ?? raw.avatar_url ?? null),
  leetcodeUrl: raw.leetcodeUrl ?? raw.leetcode_url ?? null,
  githubUrl: raw.githubUrl ?? raw.github_url ?? null,
  linkedinUrl: raw.linkedinUrl ?? raw.linkedin_url ?? null,
  portfolioUrl: raw.portfolioUrl ?? raw.portfolio_url ?? null,
  fullName: raw.fullName ?? raw.full_name ?? null,
  bio: raw.bio ?? null,
  location: raw.location ?? null,
  isActive: raw.isActive ?? raw.is_active ?? true,
  createdAt: raw.createdAt ?? raw.created_at ?? new Date().toISOString(),
});

export interface UserUpdatePayload {
  username?: string;
  avatarUrl?: string | null;
  leetcodeUrl?: string | null;
  githubUrl?: string | null;
  linkedinUrl?: string | null;
  portfolioUrl?: string | null;
  fullName?: string | null;
  bio?: string | null;
  location?: string | null;
}

const toUserUpdatePayload = (body: UserUpdatePayload) => ({
  ...(body.username !== undefined ? { username: body.username } : {}),
  ...(body.avatarUrl !== undefined ? { avatar_url: body.avatarUrl } : {}),
  ...(body.leetcodeUrl !== undefined ? { leetcode_url: body.leetcodeUrl } : {}),
  ...(body.githubUrl !== undefined ? { github_url: body.githubUrl } : {}),
  ...(body.linkedinUrl !== undefined ? { linkedin_url: body.linkedinUrl } : {}),
  ...(body.portfolioUrl !== undefined ? { portfolio_url: body.portfolioUrl } : {}),
  ...(body.fullName !== undefined ? { full_name: body.fullName } : {}),
  ...(body.bio !== undefined ? { bio: body.bio } : {}),
  ...(body.location !== undefined ? { location: body.location } : {}),
});

interface RawStudyFileItem {
  id: string;
  subject: string;
  name: string;
  type: string;
  size: number;
  uploaded_at?: string;
  uploadedAt?: string;
}

const normalizeStudyFile = (raw: RawStudyFileItem): StudyFileItem => ({
  id: raw.id,
  subject: raw.subject,
  name: raw.name,
  type: raw.type,
  size: raw.size,
  uploadedAt: raw.uploadedAt ?? raw.uploaded_at ?? new Date().toISOString(),
});

export const api = {
  auth: {
    register: (body: Record<string, unknown>) =>
      request<{ access_token: string; token_type: string; user: RawUser }>('/auth/register', {
        method: 'POST',
        body: JSON.stringify(body),
      }).then(data => ({ ...data, user: normalizeUser(data.user) })),

    login: (body: Record<string, unknown>) =>
      request<{ access_token: string; token_type: string; user: RawUser }>('/auth/login', {
        method: 'POST',
        body: JSON.stringify(body),
      }).then(data => ({ ...data, user: normalizeUser(data.user) })),

    forgotPassword: (body: Record<string, unknown>) =>
      request<{
        message: string;
        code_required: boolean;
        email_sent: boolean;
        /** Only present in ENV=development when SMTP is not configured */
        dev_code?: string;
        dev_note?: string;
      }>('/auth/forgot-password', {
        method: 'POST',
        body: JSON.stringify(body),
      }),

    logout: () =>
      request<{ message: string }>('/auth/logout', {
        method: 'POST',
      }),
  },

  users: {
    getMe: () =>
      request<RawUser>('/users/me', {
        method: 'GET',
      }).then(normalizeUser),

    updateMe: (body: UserUpdatePayload) =>
      request<RawUser>('/users/me', {
        method: 'PATCH',
        body: JSON.stringify(toUserUpdatePayload(body)),
      }).then(normalizeUser),

    uploadAvatar: (file: File) => {
      const form = new FormData();
      form.append('file', file);
      return request<RawUser>('/users/me/avatar', {
        method: 'POST',
        body: form,
      }).then(normalizeUser);
    },

    getStats: () =>
      request<UserStats>('/users/me/stats', {
        method: 'GET',
      }),

    getSubmissions: (page = 1, limit = 20, problemId?: string) => {
      const url = `/users/me/submissions?page=${page}&limit=${limit}${problemId ? `&problem_id=${problemId}` : ''}`;
      return request<Paginated<SubmissionSummary>>(url, {
        method: 'GET',
      });
    },
  },

  files: {
    list: (subject?: string) =>
      request<RawStudyFileItem[]>('/users/me/files', {
        method: 'GET',
        params: { subject },
      }).then((items) => items.map(normalizeStudyFile)),

    upload: (subject: string, file: File) => {
      const form = new FormData();
      form.append('file', file);
      return request<RawStudyFileItem>('/users/me/files', {
        method: 'POST',
        params: { subject },
        body: form,
      }).then(normalizeStudyFile);
    },

    delete: (fileId: string) =>
      request<void>(`/users/me/files/${fileId}`, {
        method: 'DELETE',
      }),

    download: async (fileId: string): Promise<{ blob: Blob; filename: string }> => {
      const response = await fetch(`${ENV.API_URL}/users/me/files/${fileId}/download`, {
        headers: {
          ...(getToken() ? { Authorization: `Bearer ${getToken()}` } : {}),
        },
      });

      if (!response.ok) {
        throw await normalizeError(response);
      }

      const disposition = response.headers.get('content-disposition') || '';
      const filenameMatch = disposition.match(/filename\*?=(?:UTF-8''|")?([^";]+)/i);
      const filename = filenameMatch ? decodeURIComponent(filenameMatch[1].replace(/"$/, '')) : 'download';

      return {
        blob: await response.blob(),
        filename,
      };
    },
  },

  problems: {
    list: (params?: ProblemListParams) =>
      request<Paginated<ProblemListItem>>('/problems', {
        method: 'GET',
        params: params as Record<string, string | number | boolean | undefined>,
      }),

    get: (slug: string) =>
      request<ProblemDetail>(`/problems/${slug}`, {
        method: 'GET',
      }),

    random: (params?: { difficulty?: string; tag?: string }) =>
      request<ProblemDetail>('/problems/random', {
        method: 'GET',
        params: params as Record<string, string | number | boolean | undefined>,
      }),

    getBestSubmission: (slug: string) =>
      request<BestSubmissionResponse>(`/problems/${slug}/submissions/best`, {
        method: 'GET',
      }),

    getLastSubmission: (slug: string) =>
      request<LastSubmissionResponse>(`/problems/${slug}/submissions/last`, {
        method: 'GET',
      }),

    create: (body: ProblemCreatePayload) =>
      request<ProblemDetail>('/problems', {
        method: 'POST',
        body: JSON.stringify(body),
      }),

    update: (slug: string, body: ProblemUpdatePayload) =>
      request<ProblemDetail>(`/problems/${slug}`, {
        method: 'PATCH',
        body: JSON.stringify(body),
      }),

    import: (urlOrSlug: string) =>
      request<ProblemDetail>('/problems/import', {
        method: 'POST',
        body: JSON.stringify({ url_or_slug: urlOrSlug }),
      }),
  },

  submissions: {
    create: (body: SubmissionCreatePayload) =>
      request<{ id: string; status: SubmissionStatus }>('/submissions', {
        method: 'POST',
        body: JSON.stringify(body),
      }),

    get: (id: string) =>
      request<SubmissionResponse>(`/submissions/${id}`, {
        method: 'GET',
      }),

    getResults: (id: string) =>
      request<SubmissionResultResponse[]>(`/submissions/${id}/results`, {
        method: 'GET',
      }),
  },

  tags: {
    list: () =>
      request<Tag[]>('/problems/tags', {
        method: 'GET',
      }),

    create: (name: string) =>
      request<Tag>('/problems/tags', {
        method: 'POST',
        params: { name },
      }),
  },

  leaderboard: {
    get: (period: 'all' | 'week', limit = 50) =>
      request<RawLeaderboardEntry[]>('/leaderboard/', {
        method: 'GET',
        params: { period, limit },
      }).then((data) =>
        data.map((item) => ({
          rank: item.rank,
          username: item.username,
          score: period === 'week' ? (item.weekly_score ?? 0) : (item.total_score ?? 0),
          solved: period === 'week' ? (item.weekly_solved ?? 0) : (item.total_solved ?? 0),
        }))
      ),
  },

  battle: {
    create: (body: {
      host_username: string;
      max_players: number;
      player_usernames: string[];
      time_limit: number;
      problem_source: string;
      selected_slug?: string | null;
      selected_slugs?: string[] | null;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      custom_problem?: any;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      custom_problems?: any[] | null;
    }) =>
      request<{ id: string }>('/battle/create', {
        method: 'POST',
        body: JSON.stringify(body),
      }),

    join: (id: string, username: string) =>
      request<{ player_index: number }>(`/battle/${id}/join`, {
        method: 'POST',
        body: JSON.stringify({ username }),
      }),

    get: (id: string, playerIndex?: number) =>
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      request<any>(`/battle/${id}`, {
        method: 'GET',
        params: { player_index: playerIndex },
      }),

    update: (id: string, body: {
      player_index: number;
      score?: number;
      solved?: boolean;
      attempts?: number;
      code?: string;
      lang?: string;
      active_problem_index?: number;
      problem_index?: number;
    }) =>
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      request<any>(`/battle/${id}/update`, {
        method: 'POST',
        body: JSON.stringify(body),
      }),

    start: (id: string) =>
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      request<any>(`/battle/${id}/start`, {
        method: 'POST',
      }),

    getHistory: () =>
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      request<any[]>('/battle/history', {
        method: 'GET',
      }),
  },

  companies: {
    list: () =>
      request<CompanyListItem[]>('/companies', {
        method: 'GET',
      }),
    get: (slug: string, params?: { page?: number; limit?: number; difficulty?: string; search?: string; sort?: string }) =>
      request<CompanyResponse>(`/companies/${slug}`, {
        method: 'GET',
        params: params as Record<string, string | number | boolean | undefined>,
      }),
  },

  topics: {
    list: () =>
      request<TopicListItem[]>('/topics', {
        method: 'GET',
      }),
    get: (slug: string, params?: { page?: number; limit?: number; difficulty?: string; search?: string; sort?: string }) =>
      request<TopicResponse>(`/topics/${slug}`, {
        method: 'GET',
        params: params as Record<string, string | number | boolean | undefined>,
      }),
  },

  stats: {
    overview: () =>
      request<StatsOverview>('/stats/overview', {
        method: 'GET',
      }),
  },

  bookmarks: {
    add: (slug: string) =>
      request<{ status: string; bookmarked: boolean }>('/problems/' + slug + '/bookmark', {
        method: 'POST',
      }),
    remove: (slug: string) =>
      request<void>('/problems/' + slug + '/bookmark', {
        method: 'DELETE',
      }),
  },
};
