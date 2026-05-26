import React, { useState, useEffect } from 'react';
import { Search, RotateCcw, WifiOff, Check, Shuffle } from 'lucide-react';
import { useSearchParams, Link, useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../../shared/lib/api';
import type { ProblemListItem } from '../../shared/lib/api';
import { MOCK_PROBLEMS, MOCK_TAGS } from '../../shared/lib/mockData';
import { useDebounce } from '../../shared/hooks/useDebounce';
import { DataTable } from '../../shared/ui/table/DataTable';
import type { Column } from '../../shared/ui/table/DataTable';
import { Badge } from '../../shared/ui/badge/Badge';
import { Input } from '../../shared/ui/input/Input';
import { Select } from '../../shared/ui/select/Select';
import { Button } from '../../shared/ui/button/Button';
import { Pagination } from '../../shared/ui/pagination/Pagination';
import { useToast } from '../../shared/ui/toast/ToastProvider';

export const ProblemListPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const toast = useToast();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // Importer states
  const [importInput, setImportInput] = useState('');
  const [importing, setImporting] = useState(false);
  const [importStep, setImportStep] = useState('');
  const [shuffling, setShuffling] = useState(false);

  const handleImport = async (e: React.FormEvent) => {
    e.preventDefault();
    const slugOrUrl = importInput.trim();
    if (!slugOrUrl) {
      toast.error("Please enter a Google coding question or keyword.");
      return;
    }

    setImporting(true);
    setImportStep("Searching Google interview question bank...");

    try {
      await new Promise(r => setTimeout(r, 600));
      setImportStep("Resolving question mapping & templates...");
      await new Promise(r => setTimeout(r, 600));
      setImportStep("Synthesizing test cases & validating workspace...");

      const payload = `google:${slugOrUrl}`;
      const problem = await api.problems.import(payload);

      setImportStep("Success! Synchronizing workspace...");
      await new Promise(r => setTimeout(r, 450));

      toast.success(`Successfully imported "${problem.title}" from Google Bank! Redirecting...`);
      queryClient.invalidateQueries({ queryKey: ['problems'] });
      navigate(`/problems/${problem.slug}`);
    } catch (err: any) {
      toast.error(err?.message || "Failed to import problem. Make sure the backend is active.");
    } finally {
      setImporting(false);
      setImportStep('');
    }
  };

  // Read URL parameters
  const page = parseInt(searchParams.get('page') || '1', 10);
  const limit = parseInt(searchParams.get('limit') || '20', 10);
  const difficulty = searchParams.get('difficulty') || 'ALL';
  const tag = searchParams.get('tag') || 'ALL';
  const searchParam = searchParams.get('search') || '';
  const sort = searchParams.get('sort') || 'newest';

  // Search input state
  const [searchInput, setSearchInput] = useState(searchParam);
  const debouncedSearch = useDebounce(searchInput, 300);

  // Sync search input with URL when URL changes directly (standard React sync-during-render pattern)
  const [prevSearchParam, setPrevSearchParam] = useState(searchParam);
  if (searchParam !== prevSearchParam) {
    setSearchInput(searchParam);
    setPrevSearchParam(searchParam);
  }

  // Update search param when debounced search changes
  useEffect(() => {
    if (debouncedSearch !== searchParam) {
      const newParams = new URLSearchParams(searchParams);
      if (debouncedSearch) {
        newParams.set('search', debouncedSearch);
      } else {
        newParams.delete('search');
      }
      // Always reset page on filter change
      newParams.delete('page');
      setSearchParams(newParams);
    }
  }, [debouncedSearch, searchParam, searchParams, setSearchParams]);

  // Helper to update individual filters in URL
  const updateFilter = (key: string, value: string) => {
    const newParams = new URLSearchParams(searchParams);
    if (value === 'ALL' || value === '') {
      newParams.delete(key);
    } else {
      newParams.set(key, value);
    }
    newParams.delete('page'); // Reset to page 1
    setSearchParams(newParams);
  };

  const handlePageChange = (newPage: number) => {
    const newParams = new URLSearchParams(searchParams);
    newParams.set('page', String(newPage));
    setSearchParams(newParams);
  };

  const handleResetFilters = () => {
    setSearchInput('');
    setSearchParams(new URLSearchParams());
    toast.info("All filters reset successfully.");
  };

  const handleRandomProblem = async () => {
    setShuffling(true);
    try {
      const filters: { difficulty?: string; tag?: string } = {};
      if (difficulty !== 'ALL') filters.difficulty = difficulty;
      if (tag !== 'ALL') filters.tag = tag;

      const problem = await api.problems.random(filters);
      toast.success(`Fetched random problem: ${problem.title}`);
      navigate(`/problems/${problem.slug}`);
    } catch (err: any) {
      // Offline fallback: select randomly from MOCK_PROBLEMS filtering by active filters
      const filteredMocks = MOCK_PROBLEMS.filter(p => {
        if (difficulty !== 'ALL' && p.difficulty !== difficulty) return false;
        if (tag !== 'ALL' && !p.tags.some(t => t.name === tag)) return false;
        return true;
      });

      if (filteredMocks.length > 0) {
        const randomMock = filteredMocks[Math.floor(Math.random() * filteredMocks.length)];
        toast.info(`Picked random problem: ${randomMock.title} (offline mode)`);
        navigate(`/problems/${randomMock.slug}`);
      } else {
        toast.error("No problems found matching active filters.");
      }
    } finally {
      setShuffling(false);
    }
  };

  // Queries
  const { data, isLoading } = useQuery({
    queryKey: ['problems', 'list', { page, limit, difficulty, tag, search: searchParam, sort }],
    queryFn: async () => {
      try {
        return await api.problems.list({
          page,
          limit,
          difficulty: difficulty === 'ALL' ? undefined : difficulty,
          tag: tag === 'ALL' ? undefined : tag,
          search: searchParam || undefined,
          sort: sort || undefined,
        });
      } catch {
        let filtered = [...MOCK_PROBLEMS];
        if (difficulty !== 'ALL') filtered = filtered.filter(p => p.difficulty === difficulty);
        if (tag !== 'ALL') filtered = filtered.filter(p => p.tags.some(t => t.name === tag));
        if (searchParam) {
          const q = searchParam.toLowerCase();
          filtered = filtered.filter(p => p.title.toLowerCase().includes(q) || p.slug.toLowerCase().includes(q));
        }
        return { items: filtered, total: filtered.length, page: 1, limit: 20, pages: Math.max(1, Math.ceil(filtered.length / 20)) };
      }
    },
    retry: 0,
  });

  const { data: tagsData } = useQuery({
    queryKey: ['tags', 'list'],
    queryFn: async () => {
      try {
        return await api.tags.list();
      } catch {
        return MOCK_TAGS;
      }
    },
    retry: 0,
  });

  const usingMockData = data ? data.items.some(p => p.id.startsWith('prob-')) : false;

  // Table columns definition
  const columns: Column<ProblemListItem>[] = [
    {
      key: 'title',
      header: 'Title',
      className: 'w-[40%]',
      render: (p) => (
        <div className="flex items-center gap-2">
          <Link 
            to={`/problems/${p.slug}`}
            className="text-gray-200 hover:text-blue-400 font-semibold cursor-pointer transition-colors hover:underline flex items-center gap-2 group-hover:text-blue-400"
          >
            {p.title}
          </Link>
          {p.user_status?.solved && (
            <span className="inline-flex items-center gap-0.5 text-[9px] font-black tracking-wider uppercase text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-1.5 py-0.5 rounded select-none shadow-sm animate-fade-in">
              <Check className="w-2.5 h-2.5" /> Solved
            </span>
          )}
        </div>
      )
    },
    {
      key: 'difficulty',
      header: 'Difficulty',
      className: 'w-[15%]',
      render: (p) => (
        <Badge variant={p.difficulty.toLowerCase() as 'easy' | 'medium' | 'hard'}>
          {p.difficulty}
        </Badge>
      )
    },
    {
      key: 'tags',
      header: 'Tags',
      className: 'w-[25%] hidden md:table-cell',
      render: (p) => (
        <div className="flex flex-wrap gap-1">
          {p.tags.map((t) => (
            <button
              key={t.id}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                updateFilter('tag', t.name);
              }}
              className="text-[10px] px-2 py-0.5 bg-dark-input hover:bg-dark-hover rounded border border-dark-border text-gray-400 hover:text-gray-200 transition-colors"
            >
              {t.name}
            </button>
          ))}
        </div>
      )
    },
    {
      key: 'acceptance_rate',
      header: 'Acceptance',
      className: 'w-[10%] text-right font-mono',
      render: (p) => (
        <span className="text-xs text-gray-400">
          {typeof p.acceptance_rate === 'number' ? p.acceptance_rate.toFixed(1) : '0.0'}%
        </span>
      )
    },
    {
      key: 'score_base',
      header: 'Points',
      className: 'w-[10%] text-right font-mono',
      render: (p) => (
        <span className="text-xs text-amber-400 font-semibold">
          {p.score_base} pts
        </span>
      )
    }
  ];

  // Map database categories to Select options
  const tagOptions = [
    { value: 'ALL', label: 'All Tags' },
    ...(tagsData || []).map((t) => ({ value: t.name, label: t.name }))
  ];

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      
      {/* Title Header with sleek stats */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center border-b border-dark-border pb-6 select-none gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-gray-100 tracking-tight bg-gradient-to-r from-gray-100 to-gray-400 bg-clip-text text-transparent">
            Problems Catalog
          </h1>
          <p className="text-sm text-gray-400 mt-1.5 max-w-2xl leading-relaxed">
            Enhance your programmatic skills, master algorithms, and prepare for high-performance assessments.
          </p>
        </div>
        {data && (
          <div className="flex gap-3 bg-dark-panel border border-dark-border px-4 py-2.5 rounded-lg shadow-sm">
            <div className="text-center px-3 border-r border-dark-border">
              <span className="block text-xs text-gray-500 uppercase font-semibold">Total</span>
              <span className="text-lg font-bold text-gray-200">{data.total}</span>
            </div>
            <div className="text-center px-3">
              <span className="block text-xs text-gray-500 uppercase font-semibold">Pages</span>
              <span className="text-lg font-bold text-gray-200">{data.pages}</span>
            </div>
          </div>
        )}
      </div>

      {/* Dynamic Google Problem Importer */}
      <div className="bg-gradient-to-r from-emerald-950/30 via-[#0a0c10] to-[#0c1017] border border-emerald-500/20 p-5 rounded-xl shadow-xl relative overflow-hidden select-none">
        <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-blue-500/5 rounded-full blur-3xl pointer-events-none" />
        
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <span className="flex h-2 w-2 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <h3 className="text-sm font-black text-gray-100 flex items-center gap-2 tracking-wide uppercase">
                Google Question Importer
              </h3>
              <span className="text-[9px] font-black uppercase text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded">
                Interview Prep
              </span>
            </div>
            
            <p className="text-xs text-gray-400 max-w-xl leading-relaxed">
              Search any <b>Google coding interview question</b> (e.g., <i>Fruit Into Baskets</i> or <i>Decompress String</i>). AlgoAxis will dynamically locate the problem, synthesize templates, load test cases, and ready your C++ sandbox environment!
            </p>
          </div>
          
          <form onSubmit={handleImport} className="flex-1 max-w-md w-full flex gap-2">
            <Input 
              placeholder="Search Google problem: e.g. Fruit Into Baskets" 
              value={importInput}
              onChange={(e) => setImportInput(e.target.value)}
              disabled={importing}
              className="flex-1 !bg-gray-950 !text-gray-100 placeholder:!text-gray-500 !caret-emerald-400 border-dark-border focus:!border-emerald-500/50 focus:!ring-emerald-500/20"
            />
            <Button 
              type="submit" 
              disabled={importing || !importInput.trim()}
              className="shrink-0 shadow-lg active:scale-95 transition-all text-xs font-bold px-4 h-9 flex items-center justify-center gap-1.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-emerald-500/10 border-0"
            >
              {importing ? (
                <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <Search className="w-3.5 h-3.5" />
              )}
              {importing ? 'Searching...' : 'Search & Solve'}
            </Button>
          </form>
        </div>

        {/* Step Loader Feedbacks */}
        {importing && (
          <div className="mt-4 pt-4 border-t border-dark-border/40 flex items-center justify-between text-xs animate-pulse">
            <div className="flex items-center gap-2 font-semibold text-emerald-400">
              <div className="w-3.5 h-3.5 border border-t-transparent rounded-full animate-spin border-emerald-400" />
              {importStep}
            </div>
            <span className="text-gray-500 font-medium">Readying Monaco workspace...</span>
          </div>
        )}
      </div>

      {/* Catalog Filters Bar */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-3 bg-dark-panel p-4 rounded-lg border border-dark-border select-none">
        
        {/* Search */}
        <div className="md:col-span-3">
          <Input 
            placeholder="Search title, slug..." 
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            icon={<Search className="w-4 h-4 text-gray-500" />}
            className="w-full"
          />
        </div>
        
        {/* Difficulty */}
        <div className="md:col-span-2">
          <Select 
            options={[
              { value: 'ALL', label: 'All Difficulties' },
              { value: 'EASY', label: 'Easy' },
              { value: 'MEDIUM', label: 'Medium' },
              { value: 'HARD', label: 'Hard' }
            ]}
            value={difficulty}
            onChange={(e) => updateFilter('difficulty', e.target.value)}
          />
        </div>

        {/* Tag */}
        <div className="md:col-span-3">
          <Select 
            options={tagOptions}
            value={tag}
            onChange={(e) => updateFilter('tag', e.target.value)}
          />
        </div>

        {/* Sort */}
        <div className="md:col-span-2">
          <Select 
            options={[
              { value: 'newest', label: 'Newest First' },
              { value: 'oldest', label: 'Oldest First' },
              { value: 'title_asc', label: 'Title (A-Z)' },
              { value: 'title_desc', label: 'Title (Z-A)' },
              { value: 'difficulty_asc', label: 'Easy to Hard' },
              { value: 'difficulty_desc', label: 'Hard to Easy' },
              { value: 'acceptance_asc', label: 'Acceptance (Low)' },
              { value: 'acceptance_desc', label: 'Acceptance (High)' }
            ]}
            value={sort}
            onChange={(e) => updateFilter('sort', e.target.value)}
          />
        </div>

        {/* Shuffle / Random */}
        <div className="md:col-span-1 flex items-end">
          <Button 
            variant="outline" 
            onClick={handleRandomProblem}
            loading={shuffling}
            className="w-full h-9 flex items-center justify-center shrink-0 border-dark-border hover:bg-dark-hover text-blue-400 hover:text-blue-300"
            title="Shuffle (Pick Random)"
          >
            {!shuffling && <Shuffle className="w-4 h-4" />}
          </Button>
        </div>

        {/* Reset */}
        <div className="md:col-span-1 flex items-end">
          <Button 
            variant="outline" 
            onClick={handleResetFilters}
            className="w-full h-9 flex items-center justify-center shrink-0 border-dark-border hover:bg-dark-hover"
            title="Reset Filters"
          >
            <RotateCcw className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Offline Mode Banner */}
      {usingMockData && (
        <div className="bg-amber-950/20 border border-amber-500/20 text-amber-200 p-3 rounded-lg flex items-center gap-3 text-sm">
          <WifiOff className="w-5 h-5 text-amber-400 shrink-0" />
          <div>
            <span className="font-semibold">Offline Mode</span> - Backend is unreachable. Showing sample demo data. Start the backend to see real problems.
          </div>
        </div>
      )}

      {/* Problems Data Table */}
      <DataTable 
        columns={columns} 
        data={data?.items || []} 
        loading={isLoading}
        emptyMessage="No problems found matching the filters."
      />

      {/* Pagination Controls */}
      {data && data.pages > 1 && (
        <div className="flex justify-between items-center bg-dark-panel p-4 rounded-lg border border-dark-border select-none">
          <div className="text-xs text-gray-500">
            Showing page {data.page} of {data.pages}
          </div>
          <Pagination 
            currentPage={data.page} 
            totalPages={data.pages} 
            onPageChange={handlePageChange} 
          />
        </div>
      )}

    </div>
  );
};
