import { createBrowserRouter } from 'react-router-dom';
import { PageShell } from '../shared/ui/layout/PageShell';
import { ProblemListPage } from '../features/problems/ProblemListPage';
import { ProblemDetailPage } from '../features/problems/ProblemDetailPage';
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
import { AdminDashboardPage } from '../features/admin/AdminDashboardPage';
import { BattleLobbyPage } from '../features/battle/BattleLobbyPage';
import { BattleArenaPage } from '../features/battle/BattleArenaPage';
import { AppearancePage } from '../features/appearance/AppearancePage';

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
        <SubmissionResultPage />
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
          <BattleLobbyPage />
        </PageShell>
      </ProtectedRoute>
    ),
  },
  {
    path: '/battle/arena',
    element: (
      <ProtectedRoute>
        <BattleArenaPage />
      </ProtectedRoute>
    ),
  },
  {
    path: '/battle/:battleId',
    element: (
      <ProtectedRoute>
        <BattleArenaPage />
      </ProtectedRoute>
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
