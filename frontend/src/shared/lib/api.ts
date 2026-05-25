import { ENV } from '../config/env';

// Core Types
export type Role = 'USER' | 'ADMIN';
export type Difficulty = 'EASY' | 'MEDIUM' | 'HARD';
export type Language = 'python' | 'javascript';

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
  isActive: boolean;
  createdAt: string;
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
  acceptance_rate: number;
  score_base: number;
  tags: Tag[];
  is_published: boolean;
  created_at: string;
}

export interface ProblemDetail {
  id: string;
  slug: string;
  title: string;
  difficulty: Difficulty;
  description: string;
  constraints: string | null;
  acceptance_rate: number;
  score_base: number;
  time_limit_ms: number;
  memory_limit_kb: number;
  tags: Tag[];
  templates: { language: string; source_code: string }[];
  sample_test_cases: { id: string; input_data: string; expected_output: string; is_sample: boolean }[];
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
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const response = await fetch(url, {
    ...rest,
    headers,
  });

  if (!response.ok) {
    const error = await normalizeError(response);
    
    // Auto-logout on 401 Unauthorized unless we're actually calling login/register
    if (response.status === 401 && !path.includes('/auth/')) {
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
export const api = {
  auth: {
    register: (body: Record<string, unknown>) => 
      request<{ access_token: string; token_type: string; user: User }>('/auth/register', {
        method: 'POST',
        body: JSON.stringify(body),
      }),

    login: (body: Record<string, unknown>) => 
      request<{ access_token: string; token_type: string; user: User }>('/auth/login', {
        method: 'POST',
        body: JSON.stringify(body),
      }),
  },
  
  users: {
    getMe: () => 
      request<User>('/users/me', {
        method: 'GET',
      }),

    updateMe: (body: { username?: string; avatarUrl?: string | null }) => 
      request<User>('/users/me', {
        method: 'PATCH',
        body: JSON.stringify(body),
      }),
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
  },

  tags: {
    list: () =>
      request<Tag[]>('/tags', {
        method: 'GET',
      }),
  },
};
