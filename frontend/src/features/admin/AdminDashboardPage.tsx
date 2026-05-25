import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ShieldAlert, Plus, Edit3, Eye, EyeOff, ArrowLeft,
  Layers, Tag as TagIcon, FileText, CheckCircle2, Clock, Hash
} from 'lucide-react';
import { api } from '../../shared/lib/api';
import type { ProblemListItem, ProblemDetail, Tag, ApiError } from '../../shared/lib/api';
import { Button } from '../../shared/ui/button/Button';
import { Badge } from '../../shared/ui/badge/Badge';
import { Tabs } from '../../shared/ui/tabs/Tabs';
import { DataTable, type Column } from '../../shared/ui/table/DataTable';
import { Modal } from '../../shared/ui/modal/Modal';
import { useToast } from '../../shared/ui/toast/ToastProvider';
import { ProblemForm } from './components/ProblemForm';

// ── Types ────────────────────────────────────────────────────────────────────

type AdminView = 'dashboard' | 'create' | 'edit';

// ── Component ────────────────────────────────────────────────────────────────

export const AdminDashboardPage: React.FC = () => {
  const toast = useToast();
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState('problems');
  const [view, setView] = useState<AdminView>('dashboard');
  const [editingProblem, setEditingProblem] = useState<ProblemDetail | null>(null);
  const [unpublishTarget, setUnpublishTarget] = useState<ProblemListItem | null>(null);
  const [tagInput, setTagInput] = useState('');

  // ── Queries ──

  // Fetch ALL problems (admin sees drafts too). Use a large limit.
  const {
    data: problemsData,
    isLoading: problemsLoading,
    isError: problemsError,
  } = useQuery({
    queryKey: ['problems', 'admin-list', { limit: 200 }],
    queryFn: () => api.problems.list({ limit: 200 }),
  });

  const { data: tags = [], isLoading: tagsLoading } = useQuery<Tag[]>({
    queryKey: ['tags', 'list'],
    queryFn: () => api.tags.list(),
  });

  // ── Mutations ──

  const togglePublishMutation = useMutation({
    mutationFn: ({ slug, publish }: { slug: string; publish: boolean }) =>
      api.problems.update(slug, { is_published: publish }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['problems'] });
      toast.success(variables.publish ? 'Problem published!' : 'Problem unpublished.');
      setUnpublishTarget(null);
    },
    onError: (err: ApiError) => {
      toast.error(err?.message || 'Failed to toggle publish status');
    },
  });

  const createTagMutation = useMutation({
    mutationFn: (name: string) => api.tags.create(name),
    onSuccess: (newTag) => {
      queryClient.invalidateQueries({ queryKey: ['tags'] });
      toast.success(`Tag "${newTag.name}" created!`);
      setTagInput('');
    },
    onError: (err: ApiError) => {
      toast.error(err?.message || 'Failed to create tag');
    },
  });

  // ── Derived data ──

  const problems = problemsData?.items || [];
  const published = problems.filter((p) => p.is_published);
  const drafts = problems.filter((p) => !p.is_published);

  // ── Handle edit ──

  const handleEdit = async (problem: ProblemListItem) => {
    try {
      const detail = await api.problems.get(problem.slug);
      setEditingProblem(detail);
      setView('edit');
    } catch {
      toast.error('Failed to load problem details for editing.');
    }
  };

  // ── Problem table columns ──

  const problemColumns: Column<ProblemListItem>[] = [
    {
      key: 'title',
      header: 'Problem',
      className: 'w-[35%]',
      render: (p) => (
        <div className="flex flex-col gap-0.5">
          <span className="text-sm font-semibold text-gray-200">{p.title}</span>
          <span className="text-[11px] text-gray-500 font-mono">{p.slug}</span>
        </div>
      ),
    },
    {
      key: 'difficulty',
      header: 'Difficulty',
      className: 'w-[12%]',
      render: (p) => (
        <Badge variant={p.difficulty.toLowerCase() as 'easy' | 'medium' | 'hard'}>
          {p.difficulty}
        </Badge>
      ),
    },
    {
      key: 'is_published',
      header: 'Status',
      className: 'w-[12%]',
      render: (p) => (
        <Badge variant={p.is_published ? 'success' : 'warning'} className="text-[10px]">
          {p.is_published ? 'Published' : 'Draft'}
        </Badge>
      ),
    },
    {
      key: 'tags',
      header: 'Tags',
      className: 'w-[20%] hidden lg:table-cell',
      render: (p) => (
        <div className="flex flex-wrap gap-1">
          {p.tags.slice(0, 3).map((t) => (
            <span key={t.id} className="text-[10px] px-1.5 py-0.5 bg-dark-input rounded border border-dark-border text-gray-400">
              {t.name}
            </span>
          ))}
          {p.tags.length > 3 && (
            <span className="text-[10px] text-gray-500">+{p.tags.length - 3}</span>
          )}
        </div>
      ),
    },
    {
      key: 'score_base',
      header: 'Points',
      className: 'w-[8%] text-right',
      render: (p) => (
        <span className="text-xs text-amber-400 font-semibold font-mono">{p.score_base}</span>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      className: 'w-[13%]',
      render: (p) => (
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => handleEdit(p)}
            className="p-1.5 text-gray-500 hover:text-blue-400 hover:bg-blue-500/10 rounded transition-colors"
            title="Edit"
          >
            <Edit3 className="w-3.5 h-3.5" />
          </button>
          {p.is_published ? (
            <button
              type="button"
              onClick={() => setUnpublishTarget(p)}
              className="p-1.5 text-gray-500 hover:text-amber-400 hover:bg-amber-500/10 rounded transition-colors"
              title="Unpublish"
            >
              <EyeOff className="w-3.5 h-3.5" />
            </button>
          ) : (
            <button
              type="button"
              onClick={() => togglePublishMutation.mutate({ slug: p.slug, publish: true })}
              className="p-1.5 text-gray-500 hover:text-emerald-400 hover:bg-emerald-500/10 rounded transition-colors"
              title="Publish"
            >
              <Eye className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      ),
    },
  ];

  // ── Render: Create/Edit views ──

  if (view === 'create') {
    return (
      <div className="space-y-6 max-w-5xl mx-auto">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => setView('dashboard')} className="gap-1.5">
            <ArrowLeft className="w-4 h-4" />
            Back
          </Button>
          <h1 className="text-xl font-bold text-gray-100">Create New Problem</h1>
        </div>
        <ProblemForm
          mode="create"
          onSuccess={() => setView('dashboard')}
          onCancel={() => setView('dashboard')}
        />
      </div>
    );
  }

  if (view === 'edit' && editingProblem) {
    return (
      <div className="space-y-6 max-w-5xl mx-auto">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => { setView('dashboard'); setEditingProblem(null); }} className="gap-1.5">
            <ArrowLeft className="w-4 h-4" />
            Back
          </Button>
          <h1 className="text-xl font-bold text-gray-100">
            Edit: <span className="text-blue-400 font-mono">{editingProblem.slug}</span>
          </h1>
        </div>
        <ProblemForm
          mode="edit"
          initialData={editingProblem}
          onSuccess={() => { setView('dashboard'); setEditingProblem(null); }}
          onCancel={() => { setView('dashboard'); setEditingProblem(null); }}
        />
      </div>
    );
  }

  // ── Render: Dashboard ──

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-dark-border pb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
            <ShieldAlert className="w-5 h-5 text-amber-400" />
          </div>
          <div>
            <h1 className="text-2xl font-extrabold text-gray-100 tracking-tight">Admin Control Panel</h1>
            <p className="text-sm text-gray-500">Manage problems, tags, and platform content.</p>
          </div>
        </div>
        <Button onClick={() => setView('create')} className="gap-2">
          <Plus className="w-4 h-4" />
          Create Problem
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard icon={<Layers className="w-5 h-5 text-blue-400" />} label="Total Problems" value={problems.length} color="blue" />
        <StatCard icon={<CheckCircle2 className="w-5 h-5 text-emerald-400" />} label="Published" value={published.length} color="emerald" />
        <StatCard icon={<Clock className="w-5 h-5 text-amber-400" />} label="Drafts" value={drafts.length} color="amber" />
        <StatCard icon={<TagIcon className="w-5 h-5 text-purple-400" />} label="Tags" value={tags.length} color="purple" />
      </div>

      {/* Tab Content */}
      <Tabs
        tabs={[
          { id: 'problems', label: <span className="flex items-center gap-1.5"><FileText className="w-3.5 h-3.5" />Problems</span> },
          { id: 'tags', label: <span className="flex items-center gap-1.5"><TagIcon className="w-3.5 h-3.5" />Manage Tags</span> },
        ]}
        activeTab={activeTab}
        onChange={setActiveTab}
      />

      {/* Problems Tab */}
      {activeTab === 'problems' && (
        <div className="space-y-4">
          {problemsError ? (
            <div className="bg-red-950/20 border border-red-500/20 text-red-200 p-6 rounded-lg text-center">
              <p className="text-sm">Failed to load problems. Please check your connection and admin privileges.</p>
            </div>
          ) : (
            <DataTable
              columns={problemColumns}
              data={problems}
              loading={problemsLoading}
              emptyMessage="No problems found. Create your first problem to get started."
            />
          )}
        </div>
      )}

      {/* Tags Tab */}
      {activeTab === 'tags' && (
        <div className="space-y-4">
          {/* Create tag form */}
          <div className="bg-dark-panel border border-dark-border rounded-lg p-5">
            <h3 className="text-sm font-semibold text-gray-200 mb-3 flex items-center gap-2">
              <Plus className="w-4 h-4 text-emerald-400" />
              Create New Tag
            </h3>
            <div className="flex gap-3">
              <input
                type="text"
                placeholder="Tag name (e.g. Dynamic Programming)"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && tagInput.trim()) {
                    e.preventDefault();
                    createTagMutation.mutate(tagInput.trim());
                  }
                }}
                className="flex-1 h-9 px-3 text-sm bg-dark-input border border-dark-border rounded-md text-gray-200 placeholder-gray-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/30 transition-all"
              />
              <Button
                size="sm"
                onClick={() => {
                  if (tagInput.trim()) createTagMutation.mutate(tagInput.trim());
                }}
                loading={createTagMutation.isPending}
                disabled={!tagInput.trim()}
                className="gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" />
                Add Tag
              </Button>
            </div>
          </div>

          {/* Tags list */}
          <div className="bg-dark-panel border border-dark-border rounded-lg p-5">
            <h3 className="text-sm font-semibold text-gray-200 mb-4 flex items-center gap-2">
              <Hash className="w-4 h-4 text-purple-400" />
              All Tags ({tags.length})
            </h3>
            {tagsLoading ? (
              <div className="flex flex-wrap gap-2">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="h-7 w-24 bg-dark-hover rounded animate-pulse" />
                ))}
              </div>
            ) : tags.length === 0 ? (
              <p className="text-sm text-gray-500 py-4 text-center">No tags yet. Create your first tag above.</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {tags.map((tag) => (
                  <div
                    key={tag.id}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-dark-bg border border-dark-border rounded-md hover:border-purple-500/30 hover:bg-purple-500/5 transition-colors group"
                  >
                    <TagIcon className="w-3 h-3 text-purple-400/60 group-hover:text-purple-400 transition-colors" />
                    <span className="text-sm text-gray-300">{tag.name}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Unpublish Confirmation Modal */}
      <Modal
        isOpen={!!unpublishTarget}
        onClose={() => setUnpublishTarget(null)}
        title="Confirm Unpublish"
        size="sm"
        footer={
          <>
            <Button variant="ghost" onClick={() => setUnpublishTarget(null)}>Cancel</Button>
            <Button
              variant="danger"
              loading={togglePublishMutation.isPending}
              onClick={() => {
                if (unpublishTarget) {
                  togglePublishMutation.mutate({ slug: unpublishTarget.slug, publish: false });
                }
              }}
              className="gap-1.5"
            >
              <EyeOff className="w-4 h-4" />
              Unpublish
            </Button>
          </>
        }
      >
        <div className="space-y-3">
          <p className="text-gray-300">
            Are you sure you want to unpublish <strong className="text-white">{unpublishTarget?.title}</strong>?
          </p>
          <p className="text-xs text-gray-500">
            This will remove the problem from the public catalog. Users will no longer be able to access or submit solutions to it.
          </p>
        </div>
      </Modal>
    </div>
  );
};

// ── Stat Card sub-component ──────────────────────────────────────────────────

interface StatCardProps {
  icon: React.ReactNode;
  label: string;
  value: number;
  color: 'blue' | 'emerald' | 'amber' | 'purple';
}

const colorMap = {
  blue: 'border-blue-500/15 bg-blue-500/[0.03]',
  emerald: 'border-emerald-500/15 bg-emerald-500/[0.03]',
  amber: 'border-amber-500/15 bg-amber-500/[0.03]',
  purple: 'border-purple-500/15 bg-purple-500/[0.03]',
};

const StatCard: React.FC<StatCardProps> = ({ icon, label, value, color }) => (
  <div className={`flex items-center gap-3.5 p-4 rounded-lg border ${colorMap[color]} select-none transition-colors hover:opacity-90`}>
    <div className="flex-shrink-0">{icon}</div>
    <div>
      <p className="text-[11px] text-gray-500 uppercase font-semibold tracking-wider">{label}</p>
      <p className="text-2xl font-bold text-gray-100 tabular-nums">{value}</p>
    </div>
  </div>
);
