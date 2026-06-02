import React, { useState, useEffect } from 'react';
import { Search, RotateCcw, WifiOff, Check, Shuffle, ChevronRight } from 'lucide-react';
import { useSearchParams, Link, useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../../shared/lib/api';
import { MOCK_PROBLEMS, MOCK_TAGS } from '../../shared/lib/mockData';
import { useDebounce } from '../../shared/hooks/useDebounce';
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
      toast.error("Please enter a question name, URL, or keyword.");
      return;
    }

    const isGfg = slugOrUrl.toLowerCase().includes('geeksforgeeks') || slugOrUrl.toLowerCase().includes('gfg') || slugOrUrl.startsWith('gfg:');
    const isLeetcode = slugOrUrl.toLowerCase().includes('leetcode') || slugOrUrl.startsWith('leetcode:');
    const isGoogle = slugOrUrl.toLowerCase().includes('google') || slugOrUrl.startsWith('google:');

    let payload = slugOrUrl;
    let platformName = 'LeetCode';
    let stepTitle = 'online repository';

    if (isGfg) {
      platformName = 'GeeksforGeeks';
      stepTitle = 'GeeksforGeeks';
      if (!slugOrUrl.startsWith('gfg:')) {
        payload = `gfg:${slugOrUrl}`;
      }
    } else if (isGoogle) {
      platformName = 'Google interview bank';
      stepTitle = 'Google interview bank';
      if (!slugOrUrl.startsWith('google:')) {
        payload = `google:${slugOrUrl}`;
      }
    } else if (isLeetcode) {
      platformName = 'LeetCode';
      stepTitle = 'LeetCode';
      if (slugOrUrl.startsWith('leetcode:')) {
        payload = slugOrUrl.substring('leetcode:'.length);
      }
    } else {
      if (slugOrUrl.includes(' ')) {
        // Multi-word keyword search: map through the query resolver
        platformName = 'Online Index';
        stepTitle = 'online query index';
        payload = `google:${slugOrUrl}`;
      } else {
        // Standard single-word slug: default to LeetCode
        platformName = 'LeetCode';
        stepTitle = 'LeetCode';
      }
    }

    setImporting(true);
    setImportStep(`Connecting to ${stepTitle}...`);

    try {
      await new Promise(r => setTimeout(r, 600));
      setImportStep("Extracting problem statements & parsing metadata...");
      await new Promise(r => setTimeout(r, 600));
      setImportStep("Synthesizing template files & matching offline test cases...");

      const problem = await api.problems.import(payload);

      setImportStep("Success! Synchronizing workspace...");
      await new Promise(r => setTimeout(r, 450));

      toast.success(`Successfully imported "${problem.title}" from ${platformName}! Redirecting...`);
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

  // Map database categories to Select options

  // Map database categories to Select options
  const tagOptions = [
    { value: 'ALL', label: 'All Tags' },
    ...(tagsData || []).map((t) => ({ value: t.name, label: t.name }))
  ];

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      
      {/* Title Header with sleek stats */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center border-b border-white/[0.04] pb-6 select-none gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-gray-100 tracking-tight bg-gradient-to-r from-blue-400 via-indigo-400 to-gray-200 bg-clip-text text-transparent">
            Problems Catalog
          </h1>
          <p className="text-sm text-gray-400 mt-1.5 max-w-2xl leading-relaxed">
            Enhance your programmatic skills, master algorithms, and prepare for high-performance assessments.
          </p>
        </div>
      </div>

      {/* Dynamic Online Problem Importer */}
      <div className="bg-gradient-to-r from-emerald-950/20 via-[#0a0c10] to-[#0c1017] border border-emerald-500/15 p-3 rounded-lg shadow-lg relative overflow-hidden select-none">
        <div className="absolute top-0 right-0 w-48 h-48 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />
        
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 relative z-10 min-w-0">
          <div className="flex items-center gap-3 shrink-0 min-w-0 flex-wrap">
            <span className="flex h-2 w-2 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <h3 className="text-xs font-black text-gray-200 tracking-wider uppercase">
              Fetch Online
            </h3>
            <span className="text-[9px] font-black uppercase text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-1.5 py-0.5 rounded">
              LeetCode & GFG
            </span>
            <span className="text-[10px] text-gray-500 hidden xl:inline font-medium">
              Search keyword or paste URL. bugX auto-synthesizes clean templates and test cases!
            </span>
          </div>
          
          <form onSubmit={handleImport} className="flex flex-col sm:flex-row flex-1 lg:max-w-md w-full gap-2 lg:ml-auto min-w-0">
            <Input 
              placeholder="Search online (LeetCode, GFG, slug, url, or keyword)" 
              value={importInput}
              onChange={(e) => setImportInput(e.target.value)}
              disabled={importing}
              className="flex-1 min-w-0 !bg-gray-950/90 !text-gray-100 placeholder:!text-gray-500 !caret-emerald-400 focus:!border-emerald-500/50 focus:!ring-emerald-500/20 !h-9 text-xs"
            />
            <Button 
              type="submit" 
              disabled={importing || !importInput.trim()}
              className="w-full sm:w-auto shrink-0 shadow-lg active:scale-95 transition-all text-xs font-bold px-3.5 h-9 flex items-center justify-center gap-1.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-emerald-500/10 border-0"
            >
              {importing ? (
                <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <Search className="w-3.5 h-3.5" />
              )}
              {importing ? 'Searching...' : 'Search & Solve'}
            </Button>
          </form>
        </div>

        {/* Step Loader Feedbacks */}
        {importing && (
          <div className="mt-2.5 pt-2.5 border-t border-white/[0.04] flex items-center justify-between text-xs animate-pulse">
            <div className="flex items-center gap-2 font-semibold text-emerald-400">
              <div className="w-3 h-3 border border-t-transparent rounded-full animate-spin border-emerald-400" />
              {importStep}
            </div>
            <span className="text-gray-500 font-medium">Readying Monaco workspace...</span>
          </div>
        )}
      </div>

      {/* Catalog Filters Bar */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-3 bg-dark-panel/50 p-3 rounded-xl border border-white/[0.04] select-none shadow-md">
        
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
            className="w-full h-9 flex items-center justify-center shrink-0 border-white/[0.08] hover:bg-dark-hover text-blue-400 hover:text-blue-300"
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
            className="w-full h-9 flex items-center justify-center shrink-0 border-white/[0.08] hover:bg-dark-hover"
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

      {/* Problems List Catalog */}
      {isLoading ? (
        <div className="space-y-3 select-none">
          {[...Array(6)].map((_, idx) => (
            <div key={idx} className="h-16 w-full bg-[#0b0d13] border border-white/[0.04] rounded-xl animate-pulse" />
          ))}
        </div>
      ) : (data?.items || []).length === 0 ? (
        <div className="text-center py-12 bg-dark-panel rounded-xl border border-white/[0.08] select-none">
          <p className="text-gray-500 text-sm">No problems found matching the filters.</p>
        </div>
      ) : (
        <div className="space-y-2.5 select-none">
          {(data?.items || []).map((p, idx) => {
            const isSolved = p.user_status?.solved;
            const diffText = p.difficulty === 'MEDIUM' ? 'Med.' : p.difficulty === 'EASY' ? 'Easy' : 'Hard';
            const diffColorClass = 
              p.difficulty === 'HARD' 
                ? 'text-rose-500 font-extrabold' 
                : p.difficulty === 'MEDIUM' 
                ? 'text-amber-500 font-extrabold' 
                : 'text-teal-400 font-extrabold';
            
            const displayIndex = (page - 1) * limit + idx + 1;

            const borderAccent =
              p.difficulty === 'HARD'
                ? 'border-l-rose-500'
                : p.difficulty === 'MEDIUM'
                ? 'border-l-amber-500'
                : 'border-l-teal-400';

            return (
              <div 
                key={p.id}
                className={`flex items-center justify-between px-5 py-3.5 rounded-xl border border-l-2 transition-all duration-300 group hover:-translate-y-0.5 ${borderAccent} ${
                  isSolved 
                    ? 'bg-[#0f141d]/40 border-emerald-500/10 hover:border-emerald-500/25 hover:bg-[#121924]/60' 
                    : 'bg-[#0b0d13] border-white/[0.04] hover:border-blue-500/15 hover:bg-[#0e111a]'
                }`}
              >
                {/* Left side: checkmark & title */}
                <div className="flex items-center gap-4 min-w-0">
                  <div className="w-5 h-5 flex items-center justify-center shrink-0">
                    {isSolved ? (
                      <div className="w-5 h-5 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                        <Check className="w-3.5 h-3.5 text-emerald-400 stroke-[3]" />
                      </div>
                    ) : (
                      <div className="w-1.5 h-1.5 rounded-full bg-gray-700/60" />
                    )}
                  </div>

                  <span className="text-xs font-mono text-gray-600 w-8 text-right shrink-0">{displayIndex}</span>

                  <div className="min-w-0">
                    <div className="flex items-center gap-3">
                      <Link 
                        to={`/problems/${p.slug}`}
                        className="text-sm font-semibold text-gray-200 hover:text-blue-400 transition-colors truncate block group-hover:text-blue-400 cursor-pointer"
                      >
                        {p.title}
                      </Link>
                    </div>

                    <div className="flex items-center gap-3 mt-1 text-[10px] text-gray-500 font-medium">
                      <span className="font-mono">{typeof p.acceptance_rate === 'number' ? p.acceptance_rate.toFixed(1) : '0.0'}% Acceptance</span>
                      <span className="text-gray-700 select-none">•</span>
                      <span className="text-amber-500/90 font-semibold font-mono">{p.score_base} pts</span>
                      {p.tags && p.tags.length > 0 && (
                        <>
                          <span className="text-gray-700 select-none">•</span>
                          <div className="hidden sm:flex items-center gap-1.5">
                            {p.tags.slice(0, 2).map(t => (
                              <button 
                                key={t.id}
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  updateFilter('tag', t.name);
                                }}
                                className="px-1.5 py-0.5 rounded bg-dark-bg/60 border border-white/[0.04] text-[9px] text-gray-400 hover:text-gray-200 hover:bg-dark-hover transition-colors font-semibold"
                              >
                                {t.name}
                              </button>
                            ))}
                            {p.tags.length > 2 && (
                              <span className="text-[9px] text-gray-500">+{p.tags.length - 2} tags</span>
                            )}
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* Right side: difficulty badge & enter button */}
                <div className="flex items-center gap-4 shrink-0">
                  <span className={`text-xs uppercase tracking-wider font-bold select-none ${diffColorClass}`}>
                    {diffText}
                  </span>
                  
                  <Link to={`/problems/${p.slug}`} className="hidden sm:inline-flex items-center justify-center w-8 h-8 rounded-lg bg-dark-bg group-hover:bg-blue-600/10 border border-white/[0.08] group-hover:border-blue-500/25 transition-all text-gray-500 group-hover:text-blue-400">
                    <ChevronRight className="w-4.5 h-4.5" />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Pagination Controls */}
      {data && data.pages > 1 && (
        <div className="flex justify-between items-center bg-dark-panel p-4 rounded-lg border border-white/[0.08] select-none">
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
