import React, { useState, useEffect } from 'react';
import { Search, RotateCcw, WifiOff, Check, Shuffle, ChevronRight, AlertTriangle, XCircle, X } from 'lucide-react';
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

  // Import error state — persists until next import attempt or dismiss
  type ImportError = { type: 'validation'; bullets: string[] } | { type: 'not_found'; message: string } | { type: 'network'; message: string } | { type: 'generic'; message: string };
  const [importError, setImportError] = useState<ImportError | null>(null);

  /** Parse the backend's pipe-delimited validation message into bullet points */
  const parseValidationMessage = (raw: string): string[] => {
    // Strip leading prefix like "Import validation failed: "
    const stripped = raw.replace(/^Import validation failed:\s*/i, '');
    return stripped.split('|').map(s => s.trim()).filter(Boolean);
  };

  const handleImport = async (e: React.FormEvent) => {
    e.preventDefault();
    const slugOrUrl = importInput.trim();
    if (!slugOrUrl) {
      toast.error("Please enter a question name, URL, or keyword.");
      return;
    }

    // Clear previous error on each new attempt
    setImportError(null);

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
        platformName = 'Online Index';
        stepTitle = 'online query index';
        payload = `google:${slugOrUrl}`;
      } else {
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
      const status: number = err?.status ?? 0;
      const rawMessage: string = err?.message || '';

      if (status === 0) {
        // Network / backend offline
        setImportError({ type: 'network', message: 'Cannot reach the backend. Please make sure the server is running.' });
      } else if (status === 422) {
        // Validation failure from our pipeline
        const bullets = parseValidationMessage(rawMessage);
        setImportError({ type: 'validation', bullets: bullets.length > 0 ? bullets : [rawMessage] });
      } else if (status === 404) {
        // Problem genuinely not found on the remote platform
        setImportError({
          type: 'not_found',
          message: rawMessage || `"${slugOrUrl}" was not found on ${platformName}. Check the spelling or try a direct URL.`,
        });
      } else {
        // Unexpected error
        setImportError({ type: 'generic', message: rawMessage || 'Import failed due to an unexpected error.' });
      }
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
    <div className="flex flex-col gap-3 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 h-[calc(100vh-64px)] overflow-hidden">

      {/* Online Problem Importer */}
      <div className="bg-[#ffffff08] border border-[#ffffff14] p-2 rounded-lg select-none shrink-0">
        <form onSubmit={handleImport} className="flex items-center gap-2">
          <span className="flex h-2 w-2 relative shrink-0">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>
          <span className="text-[11px] font-semibold text-[#eff1f6bf] shrink-0">Fetch Online</span>
          <Input
            placeholder="Search LeetCode / GFG (slug, url, or keyword)"
            value={importInput}
            onChange={(e) => { setImportInput(e.target.value); if (importError) setImportError(null); }}
            disabled={importing}
            className="flex-1 min-w-0 !bg-[#ffffff08] text-[#eff1f6bf] placeholder:text-[#eff1f640] h-8 text-xs border border-[#ffffff14]"
          />
          <Button
            type="submit"
            disabled={importing || !importInput.trim()}
            className="shrink-0 text-xs font-medium px-3 h-8 bg-[#2cbb5d] hover:bg-[#36d068] text-white border-0"
          >
            {importing ? (
              <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <Search className="w-3.5 h-3.5" />
            )}
            {importing ? 'Searching...' : 'Fetch'}
          </Button>
        </form>

        {/* Progress indicator */}
        {importing && (
          <div className="mt-1.5 pt-1.5 border-t border-[#ffffff08] flex items-center gap-2 text-xs text-emerald-400 animate-pulse">
            <div className="w-3 h-3 border border-t-transparent rounded-full animate-spin border-emerald-400" />
            {importStep}
          </div>
        )}

        {/* Import Error Panel — shown inline below the bar, persists until dismissed */}
        {!importing && importError && (
          <div
            className={`mt-2 rounded-md border text-xs animate-fade-in ${
              importError.type === 'validation'
                ? 'bg-rose-950/25 border-rose-500/25'
                : importError.type === 'not_found'
                ? 'bg-amber-950/25 border-amber-500/25'
                : 'bg-red-950/30 border-red-500/25'
            }`}
          >
            {/* Header row */}
            <div className="flex items-center justify-between px-3 py-2 gap-2">
              <div className="flex items-center gap-1.5">
                {importError.type === 'validation' ? (
                  <AlertTriangle className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                ) : importError.type === 'not_found' ? (
                  <XCircle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                ) : (
                  <WifiOff className="w-3.5 h-3.5 text-red-400 shrink-0" />
                )}
                <span
                  className={`font-semibold ${
                    importError.type === 'validation'
                      ? 'text-rose-300'
                      : importError.type === 'not_found'
                      ? 'text-amber-300'
                      : 'text-red-300'
                  }`}
                >
                  {importError.type === 'validation'
                    ? 'Import blocked — validation errors'
                    : importError.type === 'not_found'
                    ? 'Problem not found'
                    : importError.type === 'network'
                    ? 'Backend unreachable'
                    : 'Import failed'}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setImportError(null)}
                className="p-0.5 text-gray-500 hover:text-gray-300 transition-colors rounded"
                title="Dismiss"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Body */}
            <div className={`px-3 pb-2.5 border-t ${
              importError.type === 'validation' ? 'border-rose-500/10' :
              importError.type === 'not_found' ? 'border-amber-500/10' : 'border-red-500/10'
            }`}>
              {importError.type === 'validation' ? (
                <>
                  <p className="text-gray-400 mt-2 mb-1.5 text-[11px]">
                    No database record was created. Fix the following issues and try a different problem:
                  </p>
                  <ul className="space-y-1">
                    {importError.bullets.map((bullet, i) => (
                      <li key={i} className="flex items-start gap-1.5 text-rose-300/90">
                        <span className="text-rose-500 mt-0.5 shrink-0">•</span>
                        {bullet}
                      </li>
                    ))}
                  </ul>
                  <p className="text-gray-500 mt-2 text-[10px] italic">
                    Note: Premium LeetCode problems cannot be imported — their description and templates are locked.
                  </p>
                </>
              ) : (
                <p className={`mt-2 ${
                  importError.type === 'not_found' ? 'text-amber-300/80' : 'text-red-300/80'
                }`}>
                  {importError.type === 'not_found'
                    ? (importError as any).message
                    : (importError as any).message}
                </p>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Catalog Filters Bar -- stays pinned */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-1.5 bg-[#ffffff08] p-1.5 rounded-lg border border-[#ffffff0a] select-none shrink-0">

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
            className="w-full h-9 flex items-center justify-center shrink-0 border-white/[0.08] hover:bg-[#ffffff14] text-[#ffa116] hover:text-[#ffb340]"
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
        <div className="bg-amber-950/20 border border-amber-500/20 text-amber-200 p-3 rounded-lg flex items-center gap-3 text-sm shrink-0">
          <WifiOff className="w-5 h-5 text-amber-400 shrink-0" />
          <div>
            <span className="font-semibold">Offline Mode</span> - Backend is unreachable. Showing sample demo data. Start the backend to see real problems.
          </div>
        </div>
      )}

      {/* Scrollable problems list area */}
      <div className="flex-1 min-h-0 overflow-y-auto">

      {/* Problems List Catalog */}
      {isLoading ? (
        <div className="space-y-3 select-none">
          {[...Array(6)].map((_, idx) => (
            <div key={idx} className="h-16 w-full bg-dark-panel border border-dark-border/40 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : (data?.items || []).length === 0 ? (
        <div className="text-center py-12 bg-dark-panel rounded-xl border border-dark-border select-none">
          <p className="text-gray-500 text-sm">No problems found matching the filters.</p>
        </div>
      ) : (
        <div className="space-y-0 divide-y divide-[#ffffff0a] select-none">
          {(data?.items || []).map((p, idx) => {
            const isSolved = p.user_status?.solved;
            const diffText = p.difficulty === 'MEDIUM' ? 'Med.' : p.difficulty === 'EASY' ? 'Easy' : 'Hard';
            const diffColorClass =
              p.difficulty === 'HARD'
                ? 'text-[#ef4743] font-extrabold'
                : p.difficulty === 'MEDIUM'
                ? 'text-[#ffc01e] font-extrabold'
                : 'text-[#00b8a3] font-extrabold';

            const displayIndex = (page - 1) * limit + idx + 1;

            return (
              <div
                key={p.id}
                className={`flex items-center justify-between px-4 py-2.5 transition-all group hover:bg-[#ffffff08] ${isSolved ? 'bg-[#2cbb5d08]' : ''}`}
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
                        className="text-sm font-semibold text-gray-200 hover:text-[#ffa116] transition-colors truncate block group-hover:text-[#ffa116] cursor-pointer"
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

                  <Link to={`/problems/${p.slug}`} className="hidden sm:inline-flex items-center justify-center w-8 h-8 rounded-lg bg-[#ffffff08] hover:bg-[#ffffff14] border border-[#ffffff14] transition-all text-[#eff1f680] hover:text-white">
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

      </div>{/* end scrollable area */}
    </div>
  );
};
