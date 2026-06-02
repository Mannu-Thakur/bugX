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
import { NotFoundPage } from '../pages/NotFoundPage';
import { LandingPage } from '../pages/LandingPage';
import { AnonymousRoute, ProtectedRoute, AdminRoute } from '../features/auth/ProtectedRoute';
import { AdminDashboardPage } from '../features/admin/AdminDashboardPage';
import { BattleLobbyPage } from '../features/battle/BattleLobbyPage';
import { BattleArenaPage } from '../features/battle/BattleArenaPage';

export const router = createBrowserRouter([
  {
    path: '/',
    element: (
      <PageShell>
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
      <PageShell fullWidth>
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
      <PageShell>
        <LeaderboardPage />
      </PageShell>
    ),
  },
  {
    path: '/profile',
    element: (
      <ProtectedRoute>
        <PageShell>
          <ProfilePage />
        </PageShell>
      </ProtectedRoute>
    ),
  },
  {
    path: '/settings',
    element: (
      <PageShell>
        <SettingsPage />
      </PageShell>
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
      <PageShell fullWidth>
        <BattleLobbyPage />
      </PageShell>
    ),
  },
  {
    path: '/battle/arena',
    element: (
      <BattleArenaPage />
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

