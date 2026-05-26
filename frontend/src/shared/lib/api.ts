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
}

export interface ProblemListParams {
  page?: number;
  limit?: number;
  difficulty?: string;
  tag?: string;
  search?: string;
  sort?: string;
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
  run_samples_only: boolean;
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

export interface ApiError {
  status: number;
  code: string;
  message: string;
  detail: unknown;
}

// Token Storage
const TOKEN_KEY = 'auth_token';

export const getToken = (): string | null => {
  return localStorage.getItem(TOKEN_KEY);
};

export const setToken = (token: string): void => {
  localStorage.setItem(TOKEN_KEY, token);
};

export const clearToken = (): void => {
  localStorage.removeItem(TOKEN_KEY);
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
  } catch (err: any) {
    const networkError: ApiError = {
      status: 0,
      code: 'NETWORK_ERROR',
      message: 'Backend Core: offline? The backend server is unreachable. Please verify it is running.',
      detail: err?.message || String(err),
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
}

const toUserUpdatePayload = (body: UserUpdatePayload) => ({
  ...(body.username !== undefined ? { username: body.username } : {}),
  ...(body.avatarUrl !== undefined ? { avatar_url: body.avatarUrl } : {}),
  ...(body.leetcodeUrl !== undefined ? { leetcode_url: body.leetcodeUrl } : {}),
  ...(body.githubUrl !== undefined ? { github_url: body.githubUrl } : {}),
  ...(body.linkedinUrl !== undefined ? { linkedin_url: body.linkedinUrl } : {}),
  ...(body.portfolioUrl !== undefined ? { portfolio_url: body.portfolioUrl } : {}),
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

    getSubmissions: (page = 1, limit = 20) =>
      request<Paginated<SubmissionSummary>>(`/users/me/submissions?page=${page}&limit=${limit}`, {
        method: 'GET',
      }),
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

    getBestSubmission: (slug: string) =>
      request<BestSubmissionResponse>(`/problems/${slug}/submissions/best`, {
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
      player1_username: string;
      player2_username: string;
      time_limit: number;
      problem_source: string;
      selected_slug?: string | null;
      custom_problem?: any;
    }) =>
      request<{ id: string }>('/battle/create', {
        method: 'POST',
        body: JSON.stringify(body),
      }),
    
    get: (id: string, player?: number) =>
      request<any>(`/battle/${id}`, {
        method: 'GET',
        params: { player },
      }),
      
    update: (id: string, body: {
      player: number;
      score?: number;
      solved?: boolean;
      attempts?: number;
      code?: string;
      lang?: string;
    }) =>
      request<any>(`/battle/${id}/update`, {
        method: 'POST',
        body: JSON.stringify(body),
      }),
  },
};
