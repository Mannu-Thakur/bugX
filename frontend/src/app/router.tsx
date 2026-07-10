/* eslint-disable react-refresh/only-export-components */
import { createBrowserRouter } from 'react-router-dom';
import { PageShell } from '../shared/ui/layout/PageShell';
import { ProblemListPage } from '../features/problems/ProblemListPage';
import { ProblemDetailPage } from '../features/problems/ProblemDetailPage';
import { XProvider } from '../features/x/XContext';
import { SubmissionResultPage } from '../features/problems/SubmissionResultPage';
import { LeaderboardPage } from '../features/leaderboard/LeaderboardPage';
import { ProfilePage } from '../features/profile/ProfilePage';
import { SettingsPage } from '../features/settings/SettingsPage';
import { LoginPage } from '../features/auth/LoginPage';
import { RegisterPage } from '../features/auth/RegisterPage';
import { ForgotPasswordPage } from '../features/auth/ForgotPasswordPage';
import { OAuthCallbackPage } from '../features/auth/OAuthCallbackPage';
import { NotFoundPage } from '../pages/NotFoundPage';
import { LandingPage } from '../pages/LandingPage';
import { PrivacyPage } from '../pages/PrivacyPage';
import { CookiePage } from '../pages/CookiePage';
import { TermsPage } from '../pages/TermsPage';
import { AnonymousRoute, ProtectedRoute, AdminRoute } from '../features/auth/ProtectedRoute';
import { VisualizerPage } from '../pages/VisualizerPage';
import { AdminDashboardPage } from '../features/admin/AdminDashboardPage';
import { lazy, Suspense } from 'react';
import { AppearancePage } from '../features/appearance/AppearancePage';

const BattleLobbyPage = lazy(() => import('../features/battle/BattleLobbyPage').then(module => ({ default: module.BattleLobbyPage })));
const BattleArenaPage = lazy(() => import('../features/battle/pages/BattleArenaPage').then(module => ({ default: module.BattleArenaPage })));
const BattleRoomPage = lazy(() => import('../features/battle/pages/BattleRoomPage').then(module => ({ default: module.BattleRoomPage })));

// Phase 1 — Frontend-only features (lazy loaded, isolated)
const ResumePreviewPage = lazy(() => import('../features/resume/ResumePreviewPage').then(module => ({ default: module.ResumePreviewPage })));
const AnalyticsPage = lazy(() => import('../features/analytics/AnalyticsPage').then(module => ({ default: module.AnalyticsPage })));
const PublicProfilePage = lazy(() => import('../features/profile/PublicProfilePage').then(module => ({ default: module.PublicProfilePage })));

export const router = createBrowserRouter([
  {
    path: '/',
    element: (
      <PageShell fullWidth>
        <LandingPage />
      </PageShell>
    ),
  },
  {
    path: '/problems',
    element: (
      <PageShell>
        <ProblemListPage />
      </PageShell>
    ),
  },
  {
    path: '/problems/:slug',
    element: (
      <PageShell fullWidth hideFooter>
        <ProblemDetailPage />
      </PageShell>
    ),
  },
  {
    path: '/problems/:slug/submissions/:id',
    element: (
      <PageShell>
        <XProvider>
          <SubmissionResultPage />
        </XProvider>
      </PageShell>
    ),
  },
  {
    path: '/leaderboard',
    element: (
      <PageShell fullWidth>
        <LeaderboardPage />
      </PageShell>
    ),
  },
  {
    path: '/visualizer',
    element: (
      <PageShell fullWidth>
        <VisualizerPage />
      </PageShell>
    ),
  },
  {
    path: '/profile',
    element: (
      <ProtectedRoute>
        <PageShell fullWidth>
          <ProfilePage />
        </PageShell>
      </ProtectedRoute>
    ),
  },
  {
    path: '/settings',
    element: (
      <PageShell fullWidth>
        <SettingsPage />
      </PageShell>
    ),
  },
  {
    path: '/appearance',
    element: (
      <ProtectedRoute>
        <PageShell fullWidth>
          <AppearancePage />
        </PageShell>
      </ProtectedRoute>
    ),
  },
  {
    path: '/login',
    element: (
      <AnonymousRoute>
        <PageShell>
          <LoginPage />
        </PageShell>
      </AnonymousRoute>
    ),
  },
  {
    path: '/register',
    element: (
      <AnonymousRoute>
        <PageShell>
          <RegisterPage />
        </PageShell>
      </AnonymousRoute>
    ),
  },
  {
    path: '/forgot-password',
    element: (
      <AnonymousRoute>
        <PageShell>
          <ForgotPasswordPage />
        </PageShell>
      </AnonymousRoute>
    ),
  },
  {
    path: '/auth/callback',
    element: <OAuthCallbackPage />,
  },
  {
    path: '/privacy',
    element: (
      <PageShell>
        <PrivacyPage />
      </PageShell>
    ),
  },
  {
    path: '/cookies',
    element: (
      <PageShell>
        <CookiePage />
      </PageShell>
    ),
  },
  {
    path: '/terms',
    element: (
      <PageShell>
        <TermsPage />
      </PageShell>
    ),
  },
  // Phase 7: Admin Problem Management
  {
    path: '/admin/*',
    element: (
      <AdminRoute>
        <PageShell>
          <AdminDashboardPage />
        </PageShell>
      </AdminRoute>
    ),
  },
  {
    path: '/battle',
    element: (
      <ProtectedRoute>
        <PageShell fullWidth>
          <Suspense fallback={
            <div className="min-h-screen bg-[#07090e] flex items-center justify-center text-xs font-bold text-gray-500">
              Loading Battle Lobby...
            </div>
          }>
            <BattleLobbyPage />
          </Suspense>
        </PageShell>
      </ProtectedRoute>
    ),
  },
  {
    path: '/battle/arena',
    element: (
      <ProtectedRoute>
        <XProvider>
          <Suspense fallback={
            <div className="min-h-screen bg-[#07090e] flex items-center justify-center text-xs font-bold text-gray-500">
              Loading Battle Arena...
            </div>
          }>
            <BattleArenaPage />
          </Suspense>
        </XProvider>
      </ProtectedRoute>
    ),
  },
  {
    path: '/battle/:battleId',
    element: (
      <ProtectedRoute>
        <XProvider>
          <Suspense fallback={
            <div className="min-h-screen bg-[#07090e] flex items-center justify-center text-xs font-bold text-gray-500">
              Loading Arena Match...
            </div>
          }>
            <BattleRoomPage />
          </Suspense>
        </XProvider>
      </ProtectedRoute>
    ),
  },
  // Phase 1 — Resume Preview (frontend-only, uses existing APIs)
  {
    path: '/resume',
    element: (
      <ProtectedRoute>
        <PageShell>
          <Suspense fallback={
            <div className="min-h-screen bg-[#07090e] flex items-center justify-center text-xs font-bold text-gray-500">
              Loading Resume...
            </div>
          }>
            <ResumePreviewPage />
          </Suspense>
        </PageShell>
      </ProtectedRoute>
    ),
  },
  // Phase 4 — Analytics Dashboard (frontend-only, uses existing APIs)
  {
    path: '/analytics',
    element: (
      <ProtectedRoute>
        <PageShell fullWidth>
          <Suspense fallback={
            <div className="min-h-screen bg-[#07090e] flex items-center justify-center text-xs font-bold text-gray-500">
              Loading Analytics...
            </div>
          }>
            <AnalyticsPage />
          </Suspense>
        </PageShell>
      </ProtectedRoute>
    ),
  },
  // Phase 1.5 — Public Profiles (accessible to everyone)
  {
    path: '/u/:username',
    element: (
      <PageShell fullWidth>
        <Suspense fallback={
          <div className="min-h-screen bg-[#07090e] flex items-center justify-center text-xs font-bold text-gray-500">
            Loading Profile...
          </div>
        }>
          <PublicProfilePage />
        </Suspense>
      </PageShell>
    ),
  },
  {
    path: '*',
    element: (
      <PageShell>
        <NotFoundPage />
      </PageShell>
    ),
  },
]);
