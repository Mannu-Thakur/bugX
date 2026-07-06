/**
 * Feature Flags — centralized toggle for all new bugX features.
 *
 * Every flag reads from a VITE_FEATURE_* env variable.
 * Default: false (disabled) — no feature activates unless explicitly set to 'true'.
 *
 * Usage:
 *   import { FEATURES } from '@/shared/config/features';
 *   if (!FEATURES.RESUME_EXPORT) return null;
 */

export const FEATURES = {
  // Phase 1 — Analytics & Profile
  TOPIC_MASTERY:    import.meta.env.VITE_FEATURE_TOPIC_MASTERY    === 'true',
  BADGES:           import.meta.env.VITE_FEATURE_BADGES           === 'true',
  RATING_GRAPH:     import.meta.env.VITE_FEATURE_RATING_GRAPH     === 'true',
  PUBLIC_PROFILES:  import.meta.env.VITE_FEATURE_PUBLIC_PROFILES  === 'true',
  SIMILAR_PROBLEMS: import.meta.env.VITE_FEATURE_SIMILAR_PROBLEMS === 'true',
  RESUME_EXPORT:    import.meta.env.VITE_FEATURE_RESUME_EXPORT    === 'true',

  // Phase 2 — Learning Layer
  DAILY_CHALLENGE:  import.meta.env.VITE_FEATURE_DAILY_CHALLENGE  === 'true',
  COLLECTIONS:      import.meta.env.VITE_FEATURE_COLLECTIONS      === 'true',
  ROADMAPS:         import.meta.env.VITE_FEATURE_ROADMAPS         === 'true',
  COMPANY_PREP:     import.meta.env.VITE_FEATURE_COMPANY_PREP     === 'true',
  VISUALIZER:       import.meta.env.VITE_FEATURE_VISUALIZER       === 'true',

  // Phase 3 — Community Layer
  FORUM:            import.meta.env.VITE_FEATURE_FORUM            === 'true',
  FRIENDS:          import.meta.env.VITE_FEATURE_FRIENDS          === 'true',
  COMMUNITY_CHALLENGES: import.meta.env.VITE_FEATURE_COMMUNITY_CHALLENGES === 'true',

  // Phase 4 — Polish & AI
  NOTIFICATIONS:    import.meta.env.VITE_FEATURE_NOTIFICATIONS    === 'true',
  ANALYTICS:        import.meta.env.VITE_FEATURE_ANALYTICS        === 'true',
} as const;

export type FeatureKey = keyof typeof FEATURES;
