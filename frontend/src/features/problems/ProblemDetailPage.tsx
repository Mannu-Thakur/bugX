import React from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, Clock, Shield, Database, Award, Code, CheckCircle, Tag as TagIcon } from 'lucide-react';
import { api } from '../../shared/lib/api';
import { Badge } from '../../shared/ui/badge/Badge';
import { Button } from '../../shared/ui/button/Button';

export const ProblemDetailPage: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();

  const { data: problem, isLoading, isError, error } = useQuery({
    queryKey: ['problems', 'detail', slug],
    queryFn: () => api.problems.get(slug || ''),
    enabled: !!slug,
  });

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-12 space-y-8 animate-pulse">
        <div className="h-6 w-24 bg-dark-hover rounded" />
        <div className="space-y-4">
          <div className="h-10 w-3/4 bg-dark-hover rounded" />
          <div className="flex gap-2">
            <div className="h-5 w-16 bg-dark-hover rounded" />
            <div className="h-5 w-24 bg-dark-hover rounded" />
          </div>
        </div>
        <div className="space-y-2">
          <div className="h-4 w-full bg-dark-hover rounded" />
          <div className="h-4 w-full bg-dark-hover rounded" />
          <div className="h-4 w-5/6 bg-dark-hover rounded" />
        </div>
      </div>
    );
  }

  if (isError || !problem) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-12 text-center space-y-4">
        <span className="text-4xl">🔍</span>
        <h2 className="text-2xl font-bold text-gray-200">Problem Not Found</h2>
        <p className="text-gray-500 text-sm max-w-md mx-auto">
          {error instanceof Error ? error.message : "The problem could not be found or has not been published yet."}
        </p>
        <Link to="/problems">
          <Button variant="outline" className="mt-4">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Catalog
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 select-text">
      
      {/* Back button */}
      <div>
        <Link to="/problems" className="inline-flex items-center text-xs text-gray-500 hover:text-gray-300 font-medium transition-colors">
          <ArrowLeft className="w-3.5 h-3.5 mr-1.5" />
          Back to Catalog
        </Link>
      </div>

      {/* Header Info */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 pb-6 border-b border-dark-border select-none">
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-2.5">
            <Badge variant={problem.difficulty.toLowerCase() as 'easy' | 'medium' | 'hard'}>
              {problem.difficulty}
            </Badge>
            <span className="text-xs text-gray-500 font-mono flex items-center gap-1">
              <CheckCircle className="w-3 h-3 text-emerald-500" />
              {problem.acceptance_rate.toFixed(1)}% Acceptance
            </span>
          </div>
          <h1 className="text-3xl font-extrabold text-gray-100 tracking-tight">
            {problem.title}
          </h1>
        </div>

        <div className="flex flex-wrap gap-3">
          <div className="bg-dark-panel border border-dark-border px-4 py-2 rounded-lg flex items-center gap-2">
            <Award className="w-4 h-4 text-amber-400" />
            <div className="text-left">
              <span className="block text-[10px] text-gray-500 uppercase font-semibold">Base Score</span>
              <span className="text-sm font-bold text-amber-400 font-mono">{problem.score_base} pts</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left column: Statement & Details */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Statement */}
          <div className="bg-dark-panel border border-dark-border rounded-xl p-6 shadow-sm space-y-4">
            <h2 className="text-lg font-bold text-gray-200 border-b border-dark-border pb-2.5 select-none">Description</h2>
            <div className="text-gray-300 text-sm leading-relaxed whitespace-pre-wrap font-sans">
              {problem.description}
            </div>
            
            {problem.constraints && (
              <div className="mt-6 pt-4 border-t border-dark-border">
                <h3 className="text-sm font-bold text-gray-300 mb-2 select-none">Constraints</h3>
                <div className="text-gray-400 text-xs font-mono bg-dark-bg p-3 rounded-lg border border-dark-border leading-normal">
                  {problem.constraints}
                </div>
              </div>
            )}
          </div>

          {/* Code Templates / Workspace Teaser */}
          <div className="bg-dark-panel border border-dark-border rounded-xl p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-dark-border pb-2.5 select-none">
              <div className="flex items-center gap-2">
                <Code className="w-4 h-4 text-blue-400" />
                <h2 className="text-lg font-bold text-gray-200">Solve Workspace</h2>
              </div>
              <span className="text-[10px] uppercase font-bold tracking-widest text-blue-400 bg-blue-500/10 border border-blue-500/20 px-2 py-0.5 rounded">
                Phase 4 Coming Soon
              </span>
            </div>
            
            <p className="text-gray-400 text-xs leading-relaxed">
              The full LeetCode-style code editor with Monaco editor support, language selector (Python / JavaScript), test suite runs, and live Judge0 submission execution is launching in Phase 4.
            </p>

            {/* Template previews */}
            {problem.templates && problem.templates.length > 0 && (
              <div className="space-y-4 mt-2">
                {problem.templates.map((tpl) => (
                  <div key={tpl.language} className="space-y-1">
                    <div className="text-[10px] text-gray-500 uppercase font-semibold font-sans flex items-center gap-1.5 select-none">
                      <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                      {tpl.language === 'python' ? 'Python 3 Template' : 'JavaScript Template'}
                    </div>
                    <pre className="text-xs font-mono bg-dark-bg p-3 rounded-lg border border-dark-border overflow-x-auto text-gray-400 select-text max-h-48">
                      {tpl.source_code}
                    </pre>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>

        {/* Right column: Specs, tags and limits */}
        <div className="space-y-6 select-none">
          
          {/* Metadata Card */}
          <div className="bg-dark-panel border border-dark-border rounded-xl p-5 shadow-sm space-y-4">
            <h2 className="text-sm font-bold text-gray-300 border-b border-dark-border pb-2">Execution Specs</h2>
            
            <div className="space-y-3">
              <div className="flex justify-between items-center text-xs">
                <span className="text-gray-500 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5" />
                  Time Limit
                </span>
                <span className="text-gray-300 font-mono font-medium">{problem.time_limit_ms} ms</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-gray-500 flex items-center gap-1.5">
                  <Database className="w-3.5 h-3.5" />
                  Memory Limit
                </span>
                <span className="text-gray-300 font-mono font-medium">{(problem.memory_limit_kb / 1024).toFixed(0)} MB</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-gray-500 flex items-center gap-1.5">
                  <Shield className="w-3.5 h-3.5" />
                  Visibility
                </span>
                <span className="text-emerald-400 font-medium font-sans">Public (Published)</span>
              </div>
            </div>
          </div>

          {/* Tags list */}
          {problem.tags && problem.tags.length > 0 && (
            <div className="bg-dark-panel border border-dark-border rounded-xl p-5 shadow-sm space-y-3">
              <div className="text-sm font-bold text-gray-300 border-b border-dark-border pb-2 flex items-center gap-1.5">
                <TagIcon className="w-3.5 h-3.5 text-gray-400" />
                Problem Tags
              </div>
              
              <div className="flex flex-wrap gap-1.5">
                {problem.tags.map((t) => (
                  <Link
                    key={t.id}
                    to={`/problems?tag=${encodeURIComponent(t.name)}`}
                    className="text-[10px] px-2.5 py-1 bg-dark-bg hover:bg-dark-hover rounded-md border border-dark-border text-gray-400 hover:text-gray-200 transition-colors font-medium"
                  >
                    {t.name}
                  </Link>
                ))}
              </div>
            </div>
          )}

        </div>

      </div>

    </div>
  );
};
