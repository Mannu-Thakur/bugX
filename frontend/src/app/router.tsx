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
  // Example admin placeholder structure for Phase 7
  {
    path: '/admin/*',
    element: (
      <AdminRoute>
        <PageShell>
          <div className="flex flex-col gap-4 p-6 bg-dark-panel border border-dark-border rounded-lg shadow">
            <h1 className="text-xl font-bold text-amber-400">Admin Control Panel</h1>
            <p className="text-sm text-gray-400">Welcome to the administration page. Problem creation & management will be implemented in Phase 7.</p>
          </div>
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
