import { createBrowserRouter, Navigate } from 'react-router-dom';
import { PageShell } from '../shared/ui/layout/PageShell';
import { ProblemListPage } from '../features/problems/ProblemListPage';
import { ProblemDetailPage } from '../features/problems/ProblemDetailPage';
import { LeaderboardPage } from '../features/leaderboard/LeaderboardPage';
import { ProfilePage } from '../features/profile/ProfilePage';
import { LoginPage } from '../features/auth/LoginPage';
import { RegisterPage } from '../features/auth/RegisterPage';
import { NotFoundPage } from '../pages/NotFoundPage';
import { AnonymousRoute, ProtectedRoute, AdminRoute } from '../features/auth/ProtectedRoute';
import { AdminDashboardPage } from '../features/admin/AdminDashboardPage';

export const router = createBrowserRouter([
  {
    path: '/',
    element: (
      <PageShell>
        <Navigate to="/problems" replace />
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
      <PageShell>
        <ProblemDetailPage />
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
    path: '*',
    element: (
      <PageShell>
        <NotFoundPage />
      </PageShell>
    ),
  },
]);

