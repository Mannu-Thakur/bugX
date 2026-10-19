/* eslint-disable react-refresh/only-export-components */
import { createBrowserRouter } from 'react-router-dom';
import { PageShell } from '../shared/ui/layout/PageShell';
import { XProvider } from '../features/x/XContext';
import { AnonymousRoute, ProtectedRoute, AdminRoute } from '../features/auth/ProtectedRoute';
import { lazy, Suspense, type ReactNode } from 'react';

const LandingPage = lazy(() => import('../pages/LandingPage').then(module => ({ default: module.LandingPage })));
const ProblemListPage = lazy(() => import('../features/problems/ProblemListPage').then(module => ({ default: module.ProblemListPage })));
const ProblemDetailPage = lazy(() => import('../features/problems/ProblemDetailPage').then(module => ({ default: module.ProblemDetailPage })));
const SubmissionResultPage = lazy(() => import('../features/problems/SubmissionResultPage').then(module => ({ default: module.SubmissionResultPage })));
const LeaderboardPage = lazy(() => import('../features/leaderboard/LeaderboardPage').then(module => ({ default: module.LeaderboardPage })));
const ProfilePage = lazy(() => import('../features/profile/ProfilePage').then(module => ({ default: module.ProfilePage })));
const SettingsPage = lazy(() => import('../features/settings/SettingsPage').then(module => ({ default: module.SettingsPage })));
const LoginPage = lazy(() => import('../features/auth/LoginPage').then(module => ({ default: module.LoginPage })));
const RegisterPage = lazy(() => import('../features/auth/RegisterPage').then(module => ({ default: module.RegisterPage })));
const ForgotPasswordPage = lazy(() => import('../features/auth/ForgotPasswordPage').then(module => ({ default: module.ForgotPasswordPage })));
const OAuthCallbackPage = lazy(() => import('../features/auth/OAuthCallbackPage').then(module => ({ default: module.OAuthCallbackPage })));
const NotFoundPage = lazy(() => import('../pages/NotFoundPage').then(module => ({ default: module.NotFoundPage })));
const PrivacyPage = lazy(() => import('../pages/PrivacyPage').then(module => ({ default: module.PrivacyPage })));
const CookiePage = lazy(() => import('../pages/CookiePage').then(module => ({ default: module.CookiePage })));
const TermsPage = lazy(() => import('../pages/TermsPage').then(module => ({ default: module.TermsPage })));
const VisualizerPage = lazy(() => import('../pages/VisualizerPage').then(module => ({ default: module.VisualizerPage })));
const AdminDashboardPage = lazy(() => import('../features/admin/AdminDashboardPage').then(module => ({ default: module.AdminDashboardPage })));
const AppearancePage = lazy(() => import('../features/appearance/AppearancePage').then(module => ({ default: module.AppearancePage })));

const routeContent = (children: ReactNode) => (
  <Suspense fallback={<div className="min-h-screen bg-[#07090e]" aria-label="Loading page" />}>
    {children}
  </Suspense>
);

const BattleLobbyPage = lazy(() => import('../features/battle/BattleLobbyPage').then(module => ({ default: module.BattleLobbyPage })));
const BattleArenaPage = lazy(() => import('../features/battle/pages/BattleArenaPage').then(module => ({ default: module.BattleArenaPage })));
const BattleRoomPage = lazy(() => import('../features/battle/pages/BattleRoomPage').then(module => ({ default: module.BattleRoomPage })));

// Phase 1 — Frontend-only features (lazy loaded, isolated)
const ResumePreviewPage = lazy(() => import('../features/resume/ResumePreviewPage').then(module => ({ default: module.ResumePreviewPage })));
const AnalyticsPage = lazy(() => import('../features/analytics/AnalyticsPage').then(module => ({ default: module.AnalyticsPage })));
const PublicProfilePage = lazy(() => import('../features/profile/PublicProfilePage').then(module => ({ default: module.PublicProfilePage })));
const InterviewDashboard = lazy(() => import('../features/interview/InterviewDashboard').then(module => ({ default: module.InterviewDashboard })));

export const router = createBrowserRouter([
  {
    path: '/',
    element: (
      <PageShell fullWidth>
        {routeContent(<LandingPage />)}
      </PageShell>
    ),
  },
  {
    path: '/problems',
    element: (
      <PageShell>
        {routeContent(<ProblemListPage />)}
      </PageShell>
    ),
  },
  {
    path: '/problems/:slug',
    element: (
      <PageShell fullWidth hideFooter>
        {routeContent(<ProblemDetailPage />)}
      </PageShell>
    ),
  },
  {
    path: '/problems/:slug/submissions/:id',
    element: (
      <PageShell>
        <XProvider>
          {routeContent(<SubmissionResultPage />)}
        </XProvider>
      </PageShell>
    ),
  },
  {
    path: '/leaderboard',
    element: (
      <PageShell fullWidth>
        {routeContent(<LeaderboardPage />)}
      </PageShell>
    ),
  },
  {
    path: '/visualizer',
    element: (
      <PageShell fullWidth>
        {routeContent(<VisualizerPage />)}
      </PageShell>
    ),
  },
  {
    path: '/profile',
    element: (
      <ProtectedRoute>
        <PageShell fullWidth>
          {routeContent(<ProfilePage />)}
        </PageShell>
      </ProtectedRoute>
    ),
  },
  {
    path: '/settings',
    element: (
      <PageShell fullWidth>
        {routeContent(<SettingsPage />)}
      </PageShell>
    ),
  },
  {
    path: '/appearance',
    element: (
      <ProtectedRoute>
        <PageShell fullWidth>
          {routeContent(<AppearancePage />)}
        </PageShell>
      </ProtectedRoute>
    ),
  },
  {
    path: '/login',
    element: (
      <AnonymousRoute>
        <PageShell>
          {routeContent(<LoginPage />)}
        </PageShell>
      </AnonymousRoute>
    ),
  },
  {
    path: '/register',
    element: (
      <AnonymousRoute>
        <PageShell>
          {routeContent(<RegisterPage />)}
        </PageShell>
      </AnonymousRoute>
    ),
  },
  {
    path: '/forgot-password',
    element: (
      <AnonymousRoute>
        <PageShell>
          {routeContent(<ForgotPasswordPage />)}
        </PageShell>
      </AnonymousRoute>
    ),
  },
  {
    path: '/auth/callback',
    element: routeContent(<OAuthCallbackPage />),
  },
  {
    path: '/privacy',
    element: (
      <PageShell>
        {routeContent(<PrivacyPage />)}
      </PageShell>
    ),
  },
  {
    path: '/cookies',
    element: (
      <PageShell>
        {routeContent(<CookiePage />)}
      </PageShell>
    ),
  },
  {
    path: '/terms',
    element: (
      <PageShell>
        {routeContent(<TermsPage />)}
      </PageShell>
    ),
  },
  // Phase 7: Admin Problem Management
  {
    path: '/admin/*',
    element: (
      <AdminRoute>
        <PageShell>
          {routeContent(<AdminDashboardPage />)}
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
  {
    path: '/interview',
    element: (
      <ProtectedRoute>
        <PageShell fullWidth>
          <Suspense fallback={
            <div className="min-h-screen bg-[#07090e] flex items-center justify-center text-xs font-bold text-gray-500">
              Loading Interview Dashboard...
            </div>
          }>
            <InterviewDashboard />
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
        {routeContent(<NotFoundPage />)}
      </PageShell>
    ),
  },
]);
