import React, { useState, useEffect } from 'react';
import {
  Search,
  RotateCcw,
  WifiOff,
  Check,
  Shuffle,
  AlertTriangle,
  XCircle,
  X,
  Plus,
  Code,
} from 'lucide-react';
import { useSearchParams, Link, useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../../shared/lib/api';
import { MOCK_PROBLEMS, MOCK_TAGS } from '../../shared/lib/mockData';
import { useDebounce } from '../../shared/hooks/useDebounce';
import { Input } from '../../shared/ui/input/Input';
import { Select } from '../../shared/ui/select/Select';
import { Button } from '../../shared/ui/button/Button';
import { useToast } from '../../shared/ui/toast/ToastProvider';
import { useUserStats } from '../profile/hooks';
import { cn } from '../../shared/lib/cn';


// Custom icons
const ChevronLeft: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="m15 18-6-6 6-6" />
  </svg>
);

const ChevronRightIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="m9 18 6-6-6-6" />
  </svg>
);

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
  const [isImporterOpen, setIsImporterOpen] = useState(false);

  // Import error state
  type ImportError =
    | { type: 'validation'; bullets: string[] }
    | { type: 'not_found'; message: string }
    | { type: 'provider_unavailable'; message: string }
    | { type: 'import_failed'; message: string }
    | { type: 'network'; message: string }
    | { type: 'generic'; message: string };
  const [importError, setImportError] = useState<ImportError | null>(null);

  interface Candidate {
    title: string;
    slug: string;
    platform: string;
    score: number;
  }
  const [ambiguousCandidates, setAmbiguousCandidates] = useState<Candidate[]>([]);
  const [showAmbiguousModal, setShowAmbiguousModal] = useState(false);

  const parseValidationMessage = (raw: string): string[] => {
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
      const code: string = err?.code || '';
      const rawMessage: string = err?.message || '';

      if (code === 'AMBIGUOUS_MATCH') {
        const candidates = err?.detail?.candidates || [];
        setAmbiguousCandidates(candidates);
        setShowAmbiguousModal(true);
      } else if (status === 0) {
        setImportError({ type: 'network', message: 'Cannot reach the backend. Please make sure the server is running.' });
      } else if (code === 'NOT_FOUND') {
        setImportError({ type: 'not_found', message: rawMessage });
      } else if (code === 'PROVIDER_UNAVAILABLE') {
        setImportError({ type: 'provider_unavailable', message: rawMessage });
      } else if (code === 'IMPORT_FAILED') {
        setImportError({ type: 'import_failed', message: rawMessage });
      } else if (status === 422) {
        const bullets = parseValidationMessage(rawMessage);
        setImportError({ type: 'validation', bullets: bullets.length > 0 ? bullets : [rawMessage] });
      } else if (status === 404) {
        setImportError({
          type: 'not_found',
          message: rawMessage || `"${slugOrUrl}" was not found on ${platformName}. Check the spelling or try a direct URL.`,
        });
      } else {
        setImportError({ type: 'generic', message: rawMessage || 'Import failed due to an unexpected error.' });
      }
    } finally {
      setImporting(false);
      setImportStep('');
    }
  };

  const handleImportSelected = async (slug: string) => {
    setShowAmbiguousModal(false);
    setAmbiguousCandidates([]);
    setImportError(null);
    setImporting(true);
    setImportStep("Connecting to GeeksforGeeks...");
    try {
      await new Promise(r => setTimeout(r, 600));
      setImportStep("Extracting problem statements & parsing metadata...");
      await new Promise(r => setTimeout(r, 600));
      setImportStep("Synthesizing template files & matching offline test cases...");

      const payload = slug.startsWith('gfg:') ? slug : `gfg:${slug}`;
      const problem = await api.problems.import(payload);

      setImportStep("Success! Synchronizing workspace...");
      await new Promise(r => setTimeout(r, 450));

      toast.success(`Successfully imported "${problem.title}"! Redirecting...`);
      queryClient.invalidateQueries({ queryKey: ['problems'] });
      navigate(`/problems/${problem.slug}`);
    } catch (err: any) {
      const status: number = err?.status ?? 0;
      const code: string = err?.code || '';
      const rawMessage: string = err?.message || '';

      if (status === 0) {
        setImportError({ type: 'network', message: 'Cannot reach the backend. Please make sure the server is running.' });
      } else if (code === 'NOT_FOUND') {
        setImportError({ type: 'not_found', message: rawMessage });
      } else if (code === 'PROVIDER_UNAVAILABLE') {
        setImportError({ type: 'provider_unavailable', message: rawMessage });
      } else if (code === 'IMPORT_FAILED') {
        setImportError({ type: 'import_failed', message: rawMessage });
      } else if (status === 422) {
        const bullets = parseValidationMessage(rawMessage);
        setImportError({ type: 'validation', bullets: bullets.length > 0 ? bullets : [rawMessage] });
      } else {
        setImportError({ type: 'generic', message: rawMessage || 'Import failed due to an unexpected error.' });
      }
    } finally {
      setImporting(false);
      setImportStep('');
    }
  };

  // Read URL params
  const page = parseInt(searchParams.get('page') || '1', 10);
  const limit = parseInt(searchParams.get('limit') || '20', 10);
  const difficulty = searchParams.get('difficulty') || 'ALL';
  const tag = searchParams.get('tag') || 'ALL';
  const company = searchParams.get('company') || 'ALL';
  const topic = searchParams.get('topic') || 'ALL';
  const searchParam = searchParams.get('search') || '';
  const sort = searchParams.get('sort') || 'newest';

  // Search input state
  const [searchInput, setSearchInput] = useState(searchParam);
  const debouncedSearch = useDebounce(searchInput, 300);

  // Sync search input with URL
  const [prevSearchParam, setPrevSearchParam] = useState(searchParam);
  if (searchParam !== prevSearchParam) {
    setSearchInput(searchParam);
    setPrevSearchParam(searchParam);
  }

  // Update URL search parameters
  useEffect(() => {
    if (debouncedSearch !== searchParam) {
      const newParams = new URLSearchParams(searchParams);
      if (debouncedSearch) {
        newParams.set('search', debouncedSearch);
      } else {
        newParams.delete('search');
      }
      newParams.delete('page');
      setSearchParams(newParams);
    }
  }, [debouncedSearch, searchParam, searchParams, setSearchParams]);

  const updateFilter = (key: string, value: string) => {
    const newParams = new URLSearchParams(searchParams);
    if (value === 'ALL' || value === '') {
      newParams.delete(key);
    } else {
      newParams.set(key, value);
    }
    newParams.delete('page');
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
      const filters: { difficulty?: string; tag?: string; company?: string; topic?: string } = {};
      if (difficulty !== 'ALL') filters.difficulty = difficulty;
      if (tag !== 'ALL') filters.tag = tag;
      if (company !== 'ALL') filters.company = company;
      if (topic !== 'ALL') filters.topic = topic;

      const problem = await api.problems.random(filters);
      toast.success(`Fetched random problem: ${problem.title}`);
      navigate(`/problems/${problem.slug}`);
    } catch (err: any) {
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
  // Helper: deduplicate problems by normalised title.
  // Problems imported from multiple sources (LeetCode + GFG) share the same
  // title but have different ids/slugs — so we key on title, not id.
  const deduplicateByTitle = <T extends { title: string }>(arr: T[]): T[] => {
    const seen = new Set<string>();
    return arr.filter(item => {
      const key = item.title.trim().toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  };

  const { data, isLoading } = useQuery({
    queryKey: ['problems', 'list', { page, limit, difficulty, tag, company, topic, search: searchParam, sort }],
    queryFn: async () => {
      try {
        const result = await api.problems.list({
          page,
          limit,
          difficulty: difficulty === 'ALL' ? undefined : difficulty,
          tag: tag === 'ALL' ? undefined : tag,
          company: company === 'ALL' ? undefined : company,
          topic: topic === 'ALL' ? undefined : topic,
          search: searchParam || undefined,
          sort: sort || undefined,
        });
        // Deduplicate in case the API returns the same problem more than once
        return { ...result, items: deduplicateByTitle(result.items) };
      } catch {
        let filtered = [...MOCK_PROBLEMS];
        if (difficulty !== 'ALL') filtered = filtered.filter(p => p.difficulty === difficulty);
        if (tag !== 'ALL') filtered = filtered.filter(p => p.tags.some(t => t.name === tag));
        if (searchParam) {
          const q = searchParam.toLowerCase();
          filtered = filtered.filter(p => p.title.toLowerCase().includes(q) || p.slug.toLowerCase().includes(q));
        }
        const unique = deduplicateByTitle(filtered);
        return {
          items: unique,
          total: unique.length,
          page: 1,
          limit: 20,
          pages: Math.max(1, Math.ceil(unique.length / 20))
        };
      }
    },
    retry: 0,
  });

  const { data: companiesData } = useQuery({
    queryKey: ['companies', 'list'],
    queryFn: async () => {
      try {
        return await api.companies.list();
      } catch {
        return [];
      }
    },
    retry: 0,
  });

  const { data: topicsData } = useQuery({
    queryKey: ['topics', 'list'],
    queryFn: async () => {
      try {
        return await api.topics.list();
      } catch {
        return [];
      }
    },
    retry: 0,
  });

  const { data: activeCompanyData } = useQuery({
    queryKey: ['company', 'detail', company],
    queryFn: async () => {
      if (company === 'ALL') return null;
      return await api.companies.get(company);
    },
    enabled: company !== 'ALL',
    retry: 0,
  });

  const { data: activeTopicData } = useQuery({
    queryKey: ['topic', 'detail', topic],
    queryFn: async () => {
      if (topic === 'ALL') return null;
      return await api.topics.get(topic);
    },
    enabled: topic !== 'ALL',
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

  // Query for total problem count (without active filters)
  const { data: totalProblemsData } = useQuery({
    queryKey: ['problems', 'total-count'],
    queryFn: async () => {
      try {
        return await api.problems.list({ page: 1, limit: 1 });
      } catch {
        return { total: MOCK_PROBLEMS.length };
      }
    },
    staleTime: 60_000,
  });

  const { data: stats } = useUserStats();

  const usingMockData = data ? data.items.some(p => p.id.startsWith('prob-')) : false;

  const tagOptions = [
    { value: 'ALL', label: 'All Tags' },
    ...(tagsData || []).map((t) => ({ value: t.name, label: t.name }))
  ];

  const companyOptions = [
    { value: 'ALL', label: 'All Companies' },
    ...(companiesData || []).map((c) => ({ value: c.slug, label: c.name }))
  ];

  const topicOptions = [
    { value: 'ALL', label: 'All Topics' },
    ...(topicsData || []).map((t) => ({ value: t.slug, label: t.name }))
  ];

  // Dynamic statistics
  const totalCount = totalProblemsData?.total ?? 0;
  const solvedCount = stats?.total_solved ?? 0;
  const remainingCount = Math.max(0, totalCount - solvedCount);

  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-16 select-none">

      {/* ════════════════════════ PROBLEMS HERO ════════════════════════ */}
      <section className="relative flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        {/* Decorative backdrop gradients */}
        <div className="absolute -top-12 -left-12 w-48 h-48 bg-[#4F7DFF]/[0.03] rounded-full blur-[80px] pointer-events-none" />

        <div className="space-y-1.5 relative">
          <h1 className="text-xl font-bold text-gray-100 tracking-tight leading-tight">Problems</h1>
          <p className="text-sm text-gray-400 leading-relaxed max-w-xl">
            Discover challenges, sharpen pattern recognition, and build competitive problem-solving skills.
          </p>

          {/* Stats Metadata Strip */}
          {totalCount > 0 && (
            <div className="flex items-center gap-4 pt-1.5 text-[11px] font-bold text-gray-500 font-mono">
              <span className="flex items-center gap-1">
                Total: <strong className="text-gray-300 font-medium">{totalCount}</strong>
              </span>
              <span className="text-gray-700 select-none">·</span>
              <span className="flex items-center gap-1">
                Solved: <strong className="text-emerald-400 font-medium">{solvedCount}</strong>
              </span>
              <span className="text-gray-700 select-none">·</span>
              <span className="flex items-center gap-1">
                Remaining: <strong className="text-gray-300 font-medium">{remainingCount}</strong>
              </span>
            </div>
          )}
        </div>

        {/* Fetch Online & Visualizer Toggle Triggers */}
        <div className="shrink-0 flex items-center gap-2 relative">
          <Link
            to="/visualizer"
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-purple-400 hover:text-purple-300 border border-purple-500/20 hover:border-purple-500/40 rounded-lg transition-all duration-200 bg-purple-500/5 hover:bg-purple-500/10 cursor-pointer"
          >
            <Code className="w-3.5 h-3.5 text-purple-400" />
            Visualizer Playground
          </Link>

          <button
            type="button"
            onClick={() => setIsImporterOpen(!isImporterOpen)}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-gray-400 hover:text-gray-200 border border-white/[0.06] hover:border-white/[0.12] rounded-lg transition-all duration-200 bg-white/[0.02] hover:bg-white/[0.04] cursor-pointer"
          >
            <Plus className={cn("w-3.5 h-3.5 transition-transform duration-200 text-gray-500", isImporterOpen && "rotate-45 text-gray-300")} />
            Fetch Online
          </button>
        </div>
      </section>

      {/* ════════════════════════ FETCH ONLINE IMPORTER ════════════════════════ */}
      {isImporterOpen && (
        <section className="bg-[#0A0D14] border border-white/[0.04] p-4 rounded-2xl select-none animate-in slide-in-from-top-3 duration-250">
          <form onSubmit={handleImport} className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
            <div className="flex items-center gap-2 shrink-0">
              <span className="flex h-1.5 w-1.5 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-60"></span>
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
              </span>
              <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Repository</span>
            </div>
            <Input
              placeholder="Search LeetCode / GFG (slug, url, or keyword)"
              value={importInput}
              onChange={(e) => { setImportInput(e.target.value); if (importError) setImportError(null); }}
              disabled={importing}
              className="flex-1 !h-8 !py-1 text-xs border-white/[0.04] bg-[#05070A]"
            />
            <Button
              type="submit"
              disabled={importing || !importInput.trim()}
              className="shrink-0 text-xs font-medium px-4 h-8 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 rounded-lg transition-all duration-200"
            >
              {importing ? (
                <div className="w-3.5 h-3.5 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin" />
              ) : (
                'Import'
              )}
            </Button>
          </form>

          {/* Progress Tracker */}
          {importing && (
            <div className="mt-2.5 pt-2.5 border-t border-white/[0.02] flex items-center gap-2 text-xs text-emerald-400/90 font-medium">
              <div className="w-3.5 h-3.5 border-2 border-t-transparent rounded-full animate-spin border-emerald-400" />
              {importStep}
            </div>
          )}

          {/* Importer Error State */}
          {!importing && importError && (
            <div
              className={cn(
                'mt-3 rounded-xl border text-xs overflow-hidden',
                importError.type === 'validation' || importError.type === 'import_failed'
                  ? 'bg-rose-950/15 border-rose-500/20'
                  : importError.type === 'not_found'
                  ? 'bg-amber-950/15 border-amber-500/20'
                  : importError.type === 'provider_unavailable'
                  ? 'bg-orange-950/15 border-orange-500/20'
                  : 'bg-red-950/20 border-red-500/20'
              )}
            >
              <div className="flex items-center justify-between px-3.5 py-2.5 gap-2 border-b border-white/[0.02]">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                  <span className="font-bold text-gray-200">
                    {importError.type === 'validation'
                      ? 'Validation Errors'
                      : importError.type === 'not_found'
                      ? 'Challenge Not Found'
                      : importError.type === 'provider_unavailable'
                      ? 'Service Unavailable'
                      : importError.type === 'import_failed'
                      ? 'Import Blocked'
                      : importError.type === 'network'
                      ? 'Connection Failed'
                      : 'Failure'}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setImportError(null)}
                  className="p-1 text-gray-500 hover:text-gray-300 transition-colors rounded-lg cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="px-3.5 py-3">
                {importError.type === 'validation' ? (
                  <div className="space-y-2">
                    <p className="text-gray-400 text-[11px]">
                      No database record was created. Fix the following validation issues:
                    </p>
                    <ul className="space-y-1">
                      {importError.bullets.map((bullet, i) => (
                        <li key={i} className="flex items-start gap-2 text-rose-300/80">
                          <span className="text-rose-500 shrink-0">•</span>
                          {bullet}
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : (
                  <p className="text-gray-300 leading-relaxed text-[11px]">
                    {importError.message}
                  </p>
                )}
              </div>
            </div>
          )}
        </section>
      )}

      {/* ════════════════════════ CATEGORY STATS BANNER ════════════════════════ */}
      {(company !== 'ALL' || topic !== 'ALL') && (
        <div className="relative overflow-hidden rounded-2xl border border-white/[0.06] bg-[#090d14]/40 backdrop-blur-md p-6 select-none animate-in fade-in slide-in-from-top-3 duration-300">
          {/* Subtle brand color glow if company is selected */}
          {company !== 'ALL' && activeCompanyData?.company?.brand_color && (
            <div
              className="absolute -right-24 -top-24 w-48 h-48 rounded-full blur-[80px] pointer-events-none opacity-20 transition-all duration-500"
              style={{ backgroundColor: activeCompanyData.company.brand_color }}
            />
          )}

          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
            <div className="space-y-2">
              <div className="flex items-center gap-3 flex-wrap">
                {company !== 'ALL' && activeCompanyData?.company && (
                  <div className="flex items-center gap-2">
                    {activeCompanyData.company.logo_dark ? (
                      <img
                        src={activeCompanyData.company.logo_dark}
                        alt={activeCompanyData.company.name}
                        className="h-6 object-contain"
                      />
                    ) : (
                      <h2 className="text-lg font-bold text-white">{activeCompanyData.company.name}</h2>
                    )}
                    <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-white/[0.04] text-gray-400 border border-white/[0.06]">
                      Company Focus
                    </span>
                    <button
                      onClick={() => updateFilter('company', 'ALL')}
                      className="p-1 hover:bg-white/5 rounded-lg text-gray-500 hover:text-gray-300 transition-all cursor-pointer"
                      title="Clear Company Filter"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
                {company !== 'ALL' && topic !== 'ALL' && <span className="text-gray-600 font-mono text-sm">+</span>}
                {topic !== 'ALL' && activeTopicData?.topic && (
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg font-bold text-white">{activeTopicData.topic.name}</h2>
                    <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-[#4F7DFF]/10 text-[#4F7DFF] border border-[#4F7DFF]/20">
                      Topic Focus
                    </span>
                    <button
                      onClick={() => updateFilter('topic', 'ALL')}
                      className="p-1 hover:bg-white/5 rounded-lg text-gray-500 hover:text-gray-300 transition-all cursor-pointer"
                      title="Clear Topic Filter"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>
              <p className="text-xs text-gray-400">
                {company !== 'ALL' && topic !== 'ALL'
                  ? `Showing ${activeTopicData?.topic?.name} problems frequently asked in ${activeCompanyData?.company?.name} interviews.`
                  : company !== 'ALL'
                  ? `Showing problems frequently asked in ${activeCompanyData?.company?.name} interviews.`
                  : `Showing problems categorized under the ${activeTopicData?.topic?.name} algorithmic tag.`}
              </p>
            </div>

            {/* Stats Breakdown Card */}
            {(company !== 'ALL' ? activeCompanyData?.stats : activeTopicData?.stats) && (
              <div className="flex flex-col sm:flex-row sm:items-center gap-6 bg-white/[0.01] border border-white/[0.03] rounded-xl p-4 min-w-[280px]">
                <div className="text-center sm:text-left shrink-0">
                  <p className="text-[10px] text-gray-500 font-mono font-bold uppercase">Total Category Problems</p>
                  <p className="text-2xl font-bold text-white font-mono mt-1">
                    {company !== 'ALL' ? activeCompanyData?.stats?.totalProblems : activeTopicData?.stats?.totalProblems}
                  </p>
                </div>
                
                <div className="h-px sm:h-8 w-full sm:w-px bg-white/[0.04]" />

                <div className="flex-1 space-y-2">
                  {[
                    { label: 'Easy', count: company !== 'ALL' ? activeCompanyData?.stats?.easyCount : activeTopicData?.stats?.easyCount, color: 'bg-emerald-400' },
                    { label: 'Medium', count: company !== 'ALL' ? activeCompanyData?.stats?.mediumCount : activeTopicData?.stats?.mediumCount, color: 'bg-amber-400' },
                    { label: 'Hard', count: company !== 'ALL' ? activeCompanyData?.stats?.hardCount : activeTopicData?.stats?.hardCount, color: 'bg-rose-400' },
                  ].map((d) => {
                    const total = (company !== 'ALL' ? activeCompanyData?.stats?.totalProblems : activeTopicData?.stats?.totalProblems) || 1;
                    const pct = Math.round(((d.count || 0) / total) * 100);
                    return (
                      <div key={d.label} className="flex items-center gap-3 text-[10px] font-semibold text-gray-400">
                        <span className="w-12">{d.label}</span>
                        <div className="h-1.5 w-24 bg-white/[0.04] rounded-full overflow-hidden shrink-0">
                          <div className={cn("h-full rounded-full", d.color)} style={{ width: `${pct}%` }} />
                        </div>
                        <span className="w-8 text-right font-mono">{d.count || 0}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
          
          {/* Top Topics List (for Company Focus) */}
          {company !== 'ALL' && activeCompanyData?.stats?.topics && activeCompanyData.stats.topics.length > 0 && (
            <div className="mt-4 pt-4 border-t border-white/[0.03] flex items-center gap-2 flex-wrap">
              <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider font-mono">Frequent Topics:</span>
              {activeCompanyData.stats.topics.slice(0, 5).map((t) => (
                <button
                  key={t.slug}
                  onClick={() => {
                    updateFilter('topic', t.slug);
                  }}
                  className="px-2.5 py-0.5 rounded bg-white/[0.02] hover:bg-white/[0.04] border border-white/[0.04] text-[10px] text-gray-400 hover:text-[#4F7DFF] transition-all font-medium cursor-pointer"
                >
                  {t.name} ({t.count})
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ════════════════════════ DISCOVERY TOOLBAR ════════════════════════ */}
      <section className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-12 gap-2 bg-[#0A0D14] p-2 rounded-2xl border border-white/[0.04] select-none">
        
        {/* Search */}
        <div className="md:col-span-4">
          <Input
            placeholder="Search problems by title, slug..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            icon={<Search className="w-3.5 h-3.5 text-gray-500" />}
            className="w-full !h-8 !py-1 text-xs border-white/[0.04] bg-[#05070A]"
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
            className="!h-8 !py-1 text-xs border-white/[0.04] bg-[#05070A]"
          />
        </div>

        {/* Tag */}
        <div className="md:col-span-2">
          <Select
            options={tagOptions}
            value={tag}
            onChange={(e) => updateFilter('tag', e.target.value)}
            className="!h-8 !py-1 text-xs border-white/[0.04] bg-[#05070A]"
          />
        </div>

        {/* Company */}
        <div className="md:col-span-2">
          <Select
            options={companyOptions}
            value={company}
            onChange={(e) => updateFilter('company', e.target.value)}
            className="!h-8 !py-1 text-xs border-white/[0.04] bg-[#05070A]"
          />
        </div>

        {/* Topic */}
        <div className="md:col-span-2">
          <Select
            options={topicOptions}
            value={topic}
            onChange={(e) => updateFilter('topic', e.target.value)}
            className="!h-8 !py-1 text-xs border-white/[0.04] bg-[#05070A]"
          />
        </div>

        {/* Sort */}
        <div className="md:col-span-4">
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
            className="!h-8 !py-1 text-xs border-white/[0.04] bg-[#05070A]"
          />
        </div>

        <div className="md:col-span-6"></div>

        {/* Shuffle */}
        <div className="md:col-span-1 flex items-end">
          <Button
            variant="outline"
            onClick={handleRandomProblem}
            loading={shuffling}
            className="w-full h-8 flex items-center justify-center shrink-0 border-white/[0.04] bg-[#05070A] hover:bg-white/[0.02] text-[#ffa116] hover:text-[#ffb340] cursor-pointer"
            title="Pick Random"
          >
            {!shuffling && <Shuffle className="w-3.5 h-3.5" />}
          </Button>
        </div>

        {/* Reset */}
        <div className="md:col-span-1 flex items-end">
          <Button
            variant="outline"
            onClick={handleResetFilters}
            className="w-full h-8 flex items-center justify-center shrink-0 border-white/[0.04] bg-[#05070A] hover:bg-white/[0.02] text-gray-400 hover:text-gray-200 cursor-pointer"
            title="Reset Filters"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </Button>
        </div>
      </section>

      {/* Offline Banner */}
      {usingMockData && (
        <div className="bg-amber-950/15 border border-amber-500/20 text-amber-200 p-3.5 rounded-2xl flex items-center gap-3 text-xs shrink-0 select-none">
          <WifiOff className="w-4.5 h-4.5 text-amber-400 shrink-0" />
          <div>
            <span className="font-bold">Offline Mode</span> - Local sandbox is active. Showing demo statistics catalog.
          </div>
        </div>
      )}

      {/* ════════════════════════ PROBLEM CATALOG ════════════════════════ */}
      <section className="space-y-3">
        {isLoading ? (
          // Loading Skeletons - exact match to structural feed spacing
          <div className="space-y-3 select-none">
            {[...Array(6)].map((_, idx) => (
              <div
                key={idx}
                className="bg-[#0A0D14] border border-white/[0.04] rounded-2xl p-5 space-y-3 animate-pulse"
              >
                <div className="h-4 bg-white/[0.03] rounded w-2/5" />
                <div className="flex gap-2 items-center">
                  <div className="h-3.5 bg-white/[0.03] rounded w-12" />
                  <div className="h-3.5 bg-white/[0.03] rounded w-16" />
                  <div className="h-3.5 bg-white/[0.03] rounded w-14" />
                </div>
                <div className="h-3 bg-white/[0.02] rounded w-1/4" />
              </div>
            ))}
          </div>
        ) : (data?.items || []).length === 0 ? (
          // Empty State
          <div className="text-center py-16 bg-[#0A0D14] rounded-2xl border border-white/[0.04] select-none space-y-2">
            <XCircle className="w-8 h-8 text-gray-600 mx-auto" />
            <h3 className="text-sm font-bold text-gray-300">No problems found</h3>
            <p className="text-xs text-gray-500 max-w-xs mx-auto">
              Try adjusting your filters or search criteria.
            </p>
          </div>
        ) : (
          // Problem Rows Feed
          <div className="space-y-3 select-none">
            {deduplicateByTitle(data?.items || []).map((p) => {
              const isSolved = p.user_status?.solved;
              const diffText = p.difficulty === 'MEDIUM' ? 'Medium' : p.difficulty === 'EASY' ? 'Easy' : 'Hard';
              
              const diffClass =
                p.difficulty === 'HARD'
                  ? 'difficulty-badge-hard'
                  : p.difficulty === 'MEDIUM'
                  ? 'difficulty-badge-medium'
                  : 'difficulty-badge-easy';

              return (
                <div
                  key={p.id}
                  style={{
                    background: 'rgba(255,255,255,0.025)',
                    border: 'none',
                    borderRadius: '18px',
                    boxShadow: '0 1px 2px rgba(0,0,0,.2), 0 12px 40px rgba(0,0,0,.25)'
                  }}
                  className={cn(
                    "relative hover:bg-white/[0.04] p-5 flex items-start justify-between gap-4 transition-all duration-200 hover:-translate-y-[1px] group",
                    isSolved && "bg-emerald-950/5"
                  )}
                >
                  <div className="flex-1 min-w-0 space-y-2.5">
                    {/* Level 1: Primary - Title */}
                    <div className="flex items-center min-w-0">
                      <Link
                        to={`/problems/${p.slug}`}
                        className="text-sm font-semibold text-gray-200 hover:text-[#4F7DFF] group-hover:text-gray-100 transition-colors truncate block cursor-pointer"
                      >
                        {p.title}
                      </Link>
                    </div>

                    {/* Level 2: Secondary - Difficulty, Points, Tags (horizontally scrollable if necessary) */}
                    <div className="flex items-center flex-wrap gap-2.5 max-w-full">
                      <span className={cn("difficulty-badge", diffClass)}>
                        {diffText}
                      </span>

                      <span
                        style={{ background: 'rgba(79,70,229,.18)', color: '#a5b4fc' }}
                        className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider scale-90 select-none shrink-0 border-none"
                      >
                        {p.score_base} {p.score_base === 1 ? 'PT' : 'PTS'}
                      </span>

                      {p.tags && p.tags.length > 0 && (
                        <>
                          <span className="text-gray-700 select-none text-xs shrink-0">·</span>
                          <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none max-w-full whitespace-nowrap">
                            {p.tags.map(t => (
                              <button
                                key={t.id}
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  updateFilter('tag', t.name);
                                }}
                                className="px-2 py-0.5 rounded-md bg-white/[0.02] border border-white/[0.04] text-[10px] text-gray-400 hover:text-[#4F7DFF] hover:border-[#4F7DFF]/20 transition-all font-medium cursor-pointer shrink-0"
                              >
                                {t.name}
                              </button>
                            ))}
                          </div>
                        </>
                      )}
                    </div>

                    {/* Level 3: Metadata - Solved status, Acceptance rate, and Date added */}
                    <div className="flex items-center gap-2.5 text-[10px] text-gray-500 font-mono font-medium flex-wrap">
                      {isSolved && (
                        <span className="inline-flex items-center gap-1 text-emerald-400 font-semibold shrink-0">
                          <Check className="w-3 h-3 text-emerald-400 stroke-[3]" />
                          Solved
                        </span>
                      )}
                      {isSolved && <span className="text-gray-700 select-none shrink-0">·</span>}
                      <span className="shrink-0">{typeof p.acceptance_rate === 'number' ? p.acceptance_rate.toFixed(1) : '0.0'}% Acceptance</span>
                      {p.created_at && (
                        <>
                          <span className="text-gray-700 select-none shrink-0">·</span>
                          <span className="shrink-0">Added {new Date(p.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Right hand navigation arrow link */}
                  <div className="shrink-0 self-center">
                    <Link
                      to={`/problems/${p.slug}`}
                      className="inline-flex items-center justify-center w-8 h-8 rounded-lg border border-white/[0.04] bg-[#05070A] hover:bg-[#0A0D14] text-gray-500 hover:text-gray-300 transition-colors group-hover:border-white/[0.08]"
                    >
                      <ChevronRightIcon className="w-4 h-4" />
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* ════════════════════════ PAGINATION ════════════════════════ */}
      {data && data.pages > 1 && (
        <section className="flex items-center justify-between select-none pt-4 border-t border-white/[0.04]">
          <button
            id="problems-subs-prev"
            disabled={page <= 1}
            onClick={() => handlePageChange(Math.max(1, page - 1))}
            className={cn(
              'flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-medium rounded-lg border transition-colors duration-200 cursor-pointer',
              page <= 1
                ? 'border-white/[0.04] text-gray-700 cursor-not-allowed'
                : 'border-white/[0.06] text-gray-400 hover:text-gray-200 hover:border-white/[0.12] hover:bg-white/[0.02]',
            )}
          >
            <ChevronLeft className="w-3.5 h-3.5" /> Prev
          </button>

          <span className="text-xs text-gray-600 font-mono">
            {page} / {data.pages}
          </span>

          <button
            id="problems-subs-next"
            disabled={page >= data.pages}
            onClick={() => handlePageChange(Math.min(data.pages, page + 1))}
            className={cn(
              'flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-medium rounded-lg border transition-colors duration-200 cursor-pointer',
              page >= data.pages
                ? 'border-white/[0.04] text-gray-700 cursor-not-allowed'
                : 'border-white/[0.06] text-gray-400 hover:text-gray-200 hover:border-white/[0.12] hover:bg-white/[0.02]',
            )}
          >
            Next <ChevronRightIcon className="w-3.5 h-3.5" />
          </button>
        </section>
      )}

      {/* Ambiguous Match Selection Modal */}
      {showAmbiguousModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm select-none">
          <div className="relative w-full max-w-md overflow-hidden rounded-2xl border border-white/[0.08] bg-[#0A0D14] shadow-2xl animate-in fade-in zoom-in duration-200">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.04]">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-400" />
                <h3 className="text-xs font-bold text-gray-200 uppercase tracking-wider">Resolve Ambiguous Match</h3>
              </div>
              <button
                type="button"
                onClick={() => { setShowAmbiguousModal(false); setAmbiguousCandidates([]); }}
                className="p-1 text-gray-500 hover:text-gray-300 transition-colors rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Body */}
            <div className="p-4 max-h-[350px] overflow-y-auto space-y-3">
              <p className="text-xs text-gray-400 leading-normal">
                Multiple potential matches were found. Select the correct problem:
              </p>
              <div className="space-y-2">
                {ambiguousCandidates.map((cand, idx) => (
                  <div
                    key={idx}
                    onClick={() => handleImportSelected(cand.slug)}
                    className="group flex items-center justify-between p-3 rounded-xl border border-white/[0.04] bg-white/[0.01] hover:bg-white/[0.03] hover:border-emerald-500/20 transition-all cursor-pointer"
                  >
                    <div className="flex flex-col gap-1 pr-4">
                      <span className="text-xs font-semibold text-gray-200 group-hover:text-[#4F7DFF] transition-colors">
                        {cand.title}
                      </span>
                      <span className="text-[10px] font-mono text-gray-500">
                        {cand.slug}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        {Math.round(cand.score * 100)}%
                      </span>
                      <span className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded bg-white/[0.04] text-gray-400 border border-white/[0.06]">
                        {cand.platform.toUpperCase()}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Footer */}
            <div className="flex justify-end gap-2 px-4 py-3 bg-white/[0.01] border-t border-white/[0.04]">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => { setShowAmbiguousModal(false); setAmbiguousCandidates([]); }}
                className="h-8 text-xs font-medium px-4 bg-white/[0.04] hover:bg-white/[0.08] text-white border-0 cursor-pointer"
              >
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
