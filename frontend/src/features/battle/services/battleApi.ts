import { api } from '../../../shared/lib/api';

export const battleApi = {
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
  }) => api.battle.create(body),

  join: (id: string, username: string) => api.battle.join(id, username),

  get: (id: string, playerIndex?: number) => api.battle.get(id, playerIndex),

  update: (id: string, body: {
    player_index: number;
    score?: number;
    solved?: boolean;
    attempts?: number;
    code?: string;
    lang?: string;
    active_problem_index?: number;
    problem_index?: number;
  }) => api.battle.update(id, body),

  start: (id: string) => api.battle.start(id),
};
