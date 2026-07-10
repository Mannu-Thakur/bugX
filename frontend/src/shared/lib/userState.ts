export interface UserState {
  prefLang?: string;
  notes?: Record<string, string>; // problemSlug -> notes text
  drafts?: Record<string, string>; // problemSlug_lang -> code draft
  battleHistory?: unknown[];
  editorFontSize?: number;
}

const getKeyState = (userId: string): string => `user_state_${userId}`;

const loadState = (userId: string): UserState => {
  try {
    const raw = localStorage.getItem(getKeyState(userId));
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
};

const saveState = (userId: string, state: UserState): void => {
  try {
    localStorage.setItem(getKeyState(userId), JSON.stringify(state));
  } catch (err) {
    console.error("Failed to save user state:", err);
  }
};

export const userStorage = {
  getLanguage: (userId: string): string | null => {
    return loadState(userId).prefLang ?? null;
  },
  setLanguage: (userId: string, lang: string): void => {
    const state = loadState(userId);
    state.prefLang = lang;
    saveState(userId, state);
  },

  getNote: (userId: string, problemSlug: string): string => {
    return loadState(userId).notes?.[problemSlug] ?? '';
  },
  setNote: (userId: string, problemSlug: string, note: string): void => {
    const state = loadState(userId);
    if (!state.notes) state.notes = {};
    state.notes[problemSlug] = note;
    saveState(userId, state);
  },

  getDraft: (userId: string, problemSlug: string, lang: string): string | null => {
    return loadState(userId).drafts?.[`${problemSlug}_${lang}`] ?? null;
  },
  setDraft: (userId: string, problemSlug: string, lang: string, code: string): void => {
    const state = loadState(userId);
    if (!state.drafts) state.drafts = {};
    state.drafts[`${problemSlug}_${lang}`] = code;
    saveState(userId, state);
  },
  removeDraft: (userId: string, problemSlug: string, lang: string): void => {
    const state = loadState(userId);
    if (state.drafts) {
      delete state.drafts[`${problemSlug}_${lang}`];
      saveState(userId, state);
    }
  },

  getBattleHistory: (userId: string): unknown[] => {
    return loadState(userId).battleHistory ?? [];
  },
  setBattleHistory: (userId: string, history: unknown[]): void => {
    const state = loadState(userId);
    state.battleHistory = history;
    saveState(userId, state);
  },
  clearBattleHistory: (userId: string): void => {
    const state = loadState(userId);
    state.battleHistory = [];
    saveState(userId, state);
  },

  getFontSize: (userId: string): number | null => {
    return loadState(userId).editorFontSize ?? null;
  },
  setFontSize: (userId: string, size: number): void => {
    const state = loadState(userId);
    state.editorFontSize = size;
    saveState(userId, state);
  }
};
