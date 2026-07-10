import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Clock, Download, FileText, History, Swords, Trash2, Upload } from 'lucide-react';
import { useToast } from '../../shared/ui/toast/ToastProvider';
import { api } from '../../shared/lib/api';
import { useAuth } from '../auth/useAuth';
import { userStorage } from '../../shared/lib/userState';
import type { ApiError, StudyFileItem } from '../../shared/lib/api';
import { safeParseDate } from '../../shared/lib/date';

interface BattleHistoryPlayerItem {
  username: string;
  score: number;
  solved: boolean;
  attempts: number;
}

interface BattleHistoryItem {
  id: string;
  problemTitle?: string;
  players?: BattleHistoryPlayerItem[];
  player1?: string;
  player2?: string;
  p1Score?: number;
  p2Score?: number;
  p1Solved?: boolean;
  p2Solved?: boolean;
  p1Attempts?: number;
  p2Attempts?: number;
  winner?: string;
  timeLimitMinutes?: number;
  timeUsedSeconds?: number;
  endedByTimeout?: boolean;
  endedAt?: string;
}

type SubjectKey = 'dbms' | 'sql' | 'os' | 'cn' | 'oop' | 'dsa';

type StudyFile = StudyFileItem;

const SUBJECTS: { key: SubjectKey; label: string; hint: string }[] = [
  { key: 'dbms', label: 'DBMS', hint: 'ER models, normalization, indexing' },
  { key: 'sql', label: 'SQL', hint: 'Queries, joins, transactions' },
  { key: 'os', label: 'OS', hint: 'Processes, memory, scheduling' },
  { key: 'cn', label: 'CN', hint: 'TCP/IP, routing, protocols' },
  { key: 'oop', label: 'OOP', hint: 'Design principles and patterns' },
  { key: 'dsa', label: 'General', hint: 'Patterns, formulas, edge cases' },
];


const getHistoryPlayers = (item: BattleHistoryItem): BattleHistoryPlayerItem[] => {
  if (item.players && Array.isArray(item.players)) {
    return item.players;
  }
  const players: BattleHistoryPlayerItem[] = [];
  if (item.player1) {
    players.push({
      username: item.player1,
      score: item.p1Score ?? 0,
      solved: !!item.p1Solved,
      attempts: item.p1Attempts ?? 0,
    });
  }
  if (item.player2) {
    players.push({
      username: item.player2,
      score: item.p2Score ?? 0,
      solved: !!item.p2Solved,
      attempts: item.p2Attempts ?? 0,
    });
  }
  return players;
};

const createEmptyStudyFiles = (): Record<SubjectKey, StudyFile[]> => ({
  dbms: [],
  sql: [],
  os: [],
  cn: [],
  oop: [],
  dsa: [],
});

const groupStudyFiles = (files: StudyFile[]): Record<SubjectKey, StudyFile[]> => {
  const grouped = createEmptyStudyFiles();
  files.forEach((file) => {
    if (file.subject in grouped) {
      grouped[file.subject as SubjectKey].push(file);
    }
  });
  return grouped;
};

const formatDuration = (seconds = 0) => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}m ${secs.toString().padStart(2, '0')}s`;
};

const formatFileSize = (bytes: number) => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

export const SettingsPage: React.FC = () => {
  const { error, success } = useToast();
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const dropZoneRef = useRef<HTMLButtonElement | null>(null);

  const [activeTab, setActiveTab] = useState<'vault' | 'battles'>('vault');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeSubject, setActiveSubject] = useState<SubjectKey>('dbms');
  const [studyFiles, setStudyFiles] = useState<Record<SubjectKey, StudyFile[]>>(createEmptyStudyFiles);
  const [filesLoading, setFilesLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [battleHistory, setBattleHistory] = useState<BattleHistoryItem[]>([]);

  useEffect(() => {
    if (user) {
      api.battle.getHistory()
        .then(setBattleHistory)
        .catch(err => {
          console.error("Failed to load battle history:", err);
          setBattleHistory([]);
        });
    } else {
      try {
        const parsed = JSON.parse(localStorage.getItem('battle_history') || '[]');
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setBattleHistory(Array.isArray(parsed) ? parsed : []);
      } catch {
        setBattleHistory([]);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const loadStudyFiles = useCallback(async () => {
    setFilesLoading(true);
    try {
      const files = await api.files.list();
      setStudyFiles(groupStudyFiles(files));
    } catch (err) {
      const apiErr = err as ApiError;
      error(apiErr.message || 'Failed to load saved files from the backend.');
    } finally {
      setFilesLoading(false);
    }
  }, [error]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadStudyFiles();
  }, [loadStudyFiles]);

  const battleStats = useMemo(() => {
    const total = battleHistory.length;
    const solved = battleHistory.reduce((sum, item) => {
      if (item.players && Array.isArray(item.players)) {
        return sum + item.players.filter(p => p.solved).length;
      }
      return sum + (item.p1Solved ? 1 : 0) + (item.p2Solved ? 1 : 0);
    }, 0);
    const ties = battleHistory.filter(item => item.winner === 'Tie Match').length;
    return { total, solved, ties };
  }, [battleHistory]);

  const clearBattleHistory = () => {
    if (!window.confirm('Clear all local battle history?')) return;
    if (user) {
      userStorage.clearBattleHistory(user.id);
    } else {
      localStorage.removeItem('battle_history');
    }
    setBattleHistory([]);
    success('Battle history cleared.');
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    if (!files.length) return;

    const uploadedFiles: StudyFile[] = [];
    setUploading(true);

    try {
      for (const file of files) {
        uploadedFiles.push(await api.files.upload(activeSubject, file));
      }

      setStudyFiles(prev => ({
        ...prev,
        [activeSubject]: [...uploadedFiles, ...(prev[activeSubject] || [])],
      }));
      success(`${uploadedFiles.length} file${uploadedFiles.length === 1 ? '' : 's'} added to ${SUBJECTS.find(s => s.key === activeSubject)?.label}.`);
    } catch (err) {
      const apiErr = err as ApiError;
      error(apiErr.message || 'Upload failed. Please try a smaller file or confirm the backend is running.');
      await loadStudyFiles();
    } finally {
      setUploading(false);
      event.target.value = '';
    }
  };

  const removeStudyFile = async (fileId: string) => {
    try {
      await api.files.delete(fileId);
      setStudyFiles(prev => ({
        ...prev,
        [activeSubject]: prev[activeSubject].filter(file => file.id !== fileId),
      }));
      success('Study file removed.');
    } catch (err) {
      const apiErr = err as ApiError;
      error(apiErr.message || 'Failed to remove file.');
    }
  };

  const downloadStudyFile = async (file: StudyFile) => {
    setDownloadingId(file.id);
    try {
      const { blob, filename } = await api.files.download(file.id);
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename || file.name;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 0);
    } catch (err) {
      const apiErr = err as ApiError;
      error(apiErr.message || 'Failed to download file.');
    } finally {
      setDownloadingId(null);
    }
  };

  const activeFiles = useMemo(() => {
    const rawFiles = studyFiles[activeSubject] || [];
    if (!searchQuery.trim()) return rawFiles;
    return rawFiles.filter(file => file.name.toLowerCase().includes(searchQuery.toLowerCase()));
  }, [studyFiles, activeSubject, searchQuery]);

  // ─── Drag-and-drop handlers ────────────────────────────────────────────────
  const handleDragOver = useCallback((e: React.DragEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(async (e: React.DragEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (uploading) return;
    const files = Array.from(e.dataTransfer.files);
    if (!files.length) return;
    const uploadedFiles: StudyFile[] = [];
    setUploading(true);
    try {
      for (const file of files) {
        uploadedFiles.push(await api.files.upload(activeSubject, file));
      }
      setStudyFiles(prev => ({
        ...prev,
        [activeSubject]: [...uploadedFiles, ...(prev[activeSubject] || [])],
      }));
      success(`${uploadedFiles.length} file${uploadedFiles.length === 1 ? '' : 's'} dropped into ${SUBJECTS.find(s => s.key === activeSubject)?.label}.`);
    } catch (err) {
      const apiErr = err as ApiError;
      error(apiErr.message || 'Upload failed. Please try a smaller file or confirm the backend is running.');
      await loadStudyFiles();
    } finally {
      setUploading(false);
    }
  }, [uploading, activeSubject, loadStudyFiles, error, success]);

  return (
    <div className="w-full text-gray-200 font-sans select-none pb-16">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-10 space-y-8 animate-fade-in">

        {/* ── VAULT HERO ──────────────────────────────────── */}
        <div className="relative rounded-2xl border border-white/[0.06] bg-white/[0.02] p-6 sm:p-8 overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-teal-400 via-[#4F7DFF] to-[#7A5FFF] opacity-60 rounded-t-2xl" />
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6 select-none">
          <div className="space-y-2">
            <p className="text-[10px] font-semibold uppercase tracking-[0.25em] text-[#9CA3AF]/50">
              Study Archive
            </p>
            <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight text-white mt-1">
              Vault
            </h1>
            <p className="text-sm text-[#9CA3AF]/70 max-w-md leading-relaxed">
              Compile notes, organize study resources, and review competitive duel history.
            </p>
          </div>

          {/* tab segmented controller switcher */}
          <div className="flex bg-white/[0.03] p-0.5 rounded-lg border border-white/[0.04] self-start md:self-auto select-none">
            <button
              onClick={() => setActiveTab('vault')}
              className={`px-4 py-1.5 rounded-md text-xs font-semibold tracking-wide transition-all duration-200 ${
                activeTab === 'vault'
                  ? 'bg-[#4F7DFF] text-white shadow-[0_2px_10px_rgba(79,125,255,0.2)]'
                  : 'text-[#9CA3AF]/60 hover:text-white'
              }`}
            >
              Subject Vault
            </button>
            <button
              onClick={() => setActiveTab('battles')}
              className={`px-4 py-1.5 rounded-md text-xs font-semibold tracking-wide transition-all duration-200 ${
                activeTab === 'battles'
                  ? 'bg-[#4F7DFF] text-white shadow-[0_2px_10px_rgba(79,125,255,0.2)]'
                  : 'text-[#9CA3AF]/60 hover:text-white'
              }`}
            >
              Battle History
            </button>
          </div>
          </div>
        </div>

        {/* ── TAB CONTENT: VAULT ──────────────────────────── */}
        {activeTab === 'vault' && (
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 items-start">
            
            {/* Left Subject Switcher */}
            <div className="space-y-3 lg:col-span-1">
              <h3 className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[#9CA3AF]/40 px-1 select-none">
                Archives Index
              </h3>
              <div className="flex flex-col gap-2">
                {SUBJECTS.map(subject => {
                  const isActive = activeSubject === subject.key;
                  const count = studyFiles[subject.key]?.length || 0;
                  return (
                    <button
                      key={subject.key}
                      type="button"
                      onClick={() => {
                        setActiveSubject(subject.key);
                        setSearchQuery('');
                      }}
                      className={`text-left rounded-xl p-4 transition-all duration-200 flex flex-col gap-1 border border-white/[0.04] ${
                        isActive
                          ? 'bg-[#4F7DFF]/5 border-l-2 border-l-[#4F7DFF] border-white/[0.08]'
                          : 'bg-white/[0.015] border-l-2 border-l-transparent hover:border-white/10 hover:bg-white/[0.03]'
                      }`}
                    >
                      <div className="flex items-center justify-between w-full">
                        <span className={`text-xs font-semibold tracking-wide ${isActive ? 'text-[#4F7DFF]' : 'text-white/90'}`}>
                          {subject.label}
                        </span>
                        <span className="text-[9px] font-mono font-medium text-[#9CA3AF]/40 bg-white/[0.02] border border-white/[0.04] px-1.5 py-0.5 rounded">
                          {count} {count === 1 ? 'file' : 'files'}
                        </span>
                      </div>
                      <span className="text-[10.5px] text-[#9CA3AF]/50 leading-normal font-normal mt-0.5 line-clamp-1">
                        {subject.hint}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Right Subject Workspace */}
            <div className="lg:col-span-3 space-y-6">
              
              {/* Workspace Header & Search */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/[0.04] pb-4 select-none">
                <div>
                  <h2 className="text-lg font-semibold text-white tracking-tight flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-teal-400" />
                    {SUBJECTS.find(s => s.key === activeSubject)?.label} Archive
                  </h2>
                  <p className="text-xs text-[#9CA3AF]/50 mt-0.5">
                    {SUBJECTS.find(s => s.key === activeSubject)?.hint}
                  </p>
                </div>

                {/* Linear-style search */}
                <input
                  type="text"
                  placeholder="Search files by name..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="w-full sm:max-w-xs bg-white/[0.03] border border-white/[0.06] rounded-lg px-3 py-1.5 text-xs text-white placeholder:text-[#9CA3AF]/30 focus:outline-none focus:border-[#4F7DFF]/40 focus:ring-1 focus:ring-[#4F7DFF]/20 transition-all duration-200"
                />
              </div>

              {/* Upload Dropzone */}
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept=".pdf,.doc,.docx,.txt,.md,.png,.jpg,.jpeg,.webp"
                className="hidden"
                onChange={handleFileUpload}
              />
              <button
                ref={dropZoneRef}
                type="button"
                onClick={() => fileInputRef.current?.click()}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                disabled={uploading}
                className={`w-full border border-dashed rounded-xl p-8 flex flex-col items-center justify-center gap-2 text-center transition-all duration-200 select-none disabled:opacity-50 disabled:cursor-not-allowed ${
                  isDragging
                    ? 'border-[#4F7DFF] bg-[#4F7DFF]/5'
                    : 'border-white/[0.08] bg-white/[0.01] hover:bg-white/[0.03] hover:border-white/[0.15]'
                }`}
              >
                <Upload className="w-5 h-5 text-[#9CA3AF]/40 mb-1" />
                <span className="text-xs font-semibold text-white/95">
                  {uploading ? 'Adding files to archive...' : isDragging ? 'Release to upload' : `Add resource to ${SUBJECTS.find(s => s.key === activeSubject)?.label}`}
                </span>
                <span className="text-[11px] text-[#9CA3AF]/40">
                  Click to select file or drag & drop here
                </span>
                {!uploading && (
                  <span className="text-[9px] text-[#9CA3AF]/20 tracking-wider uppercase mt-1">PDF, Markdown, Images, Text · Max 25MB</span>
                )}
              </button>

              {/* Uploaded Resources List */}
              <div className="space-y-3">
                <h3 className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[#9CA3AF]/40 px-1 select-none">
                  Archived Resources
                </h3>

                <div className="w-full border border-white/[0.06] bg-white/[0.02] rounded-xl overflow-hidden shadow-sm">
                  {filesLoading ? (
                    <div className="p-12 text-center text-xs text-[#9CA3AF]/50 animate-pulse">
                      Syncing with secure archive...
                    </div>
                  ) : activeFiles.length === 0 ? (
                    <div className="p-12 text-center text-xs text-[#9CA3AF]/40 italic select-none flex flex-col items-center justify-center gap-2">
                      <FileText className="w-5 h-5 text-gray-700" />
                      <span>{searchQuery ? 'No matching resources found' : 'No resources in this subject vault'}</span>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full border-collapse text-left text-xs">
                        <thead className="bg-white/[0.02] border-b border-white/[0.04] text-[10px] font-semibold uppercase tracking-[0.12em] text-[#9CA3AF]/40 select-none">
                          <tr>
                            <th className="px-6 py-3">Resource Name</th>
                            <th className="px-6 py-3">Size</th>
                            <th className="px-6 py-3">Archived Date</th>
                            <th className="px-6 py-3 text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="text-gray-300 divide-y divide-white/[0.03]">
                          {activeFiles.map(file => {
                            const ext = file.name.split('.').pop()?.toLowerCase();
                            let iconColor = 'text-[#9CA3AF]/50';
                            if (ext === 'pdf') iconColor = 'text-rose-400/80';
                            else if (ext === 'doc' || ext === 'docx') iconColor = 'text-blue-400/80';
                            else if (ext === 'txt' || ext === 'md') iconColor = 'text-emerald-400/80';
                            else if (['png', 'jpg', 'jpeg', 'webp'].includes(ext || '')) iconColor = 'text-purple-400/80';

                            return (
                              <tr key={file.id} className="hover:bg-white/[0.01] transition-colors duration-200">
                                <td className="px-6 py-3.5 font-medium text-white/95">
                                  <div className="flex items-center gap-2.5 min-w-0">
                                    <FileText className={`w-4 h-4 shrink-0 ${iconColor}`} />
                                    <span className="truncate max-w-[180px] sm:max-w-xs md:max-w-md" title={file.name}>
                                      {file.name}
                                    </span>
                                  </div>
                                </td>
                                <td className="px-6 py-3.5 text-[#9CA3AF]/60 font-mono text-[10px]">
                                  {formatFileSize(file.size)}
                                </td>
                                <td className="px-6 py-3.5 text-[#9CA3AF]/50">
                                  {safeParseDate(file.uploadedAt).toLocaleDateString()}
                                </td>
                                <td className="px-6 py-3.5 text-right">
                                  <div className="inline-flex gap-2">
                                    <button
                                      type="button"
                                      onClick={() => downloadStudyFile(file)}
                                      disabled={downloadingId === file.id}
                                      className="p-1.5 rounded-md border border-white/[0.04] bg-white/[0.01] text-[#9CA3AF]/50 hover:text-white hover:border-white/20 transition-all duration-200"
                                      title="Download File"
                                    >
                                      <Download className="w-3.5 h-3.5" />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => removeStudyFile(file.id)}
                                      className="p-1.5 rounded-md border border-white/[0.04] bg-white/[0.01] text-[#9CA3AF]/50 hover:text-rose-400 hover:border-rose-500/20 transition-all duration-200"
                                      title="Delete File"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            </div>

          </div>
        )}

        {/* ── TAB CONTENT: BATTLE HISTORY ────────────────── */}
        {activeTab === 'battles' && (
          <div className="space-y-8 animate-fade-in">
            
            {/* Stats Bar */}
            <div className="grid grid-cols-3 gap-6 bg-white/[0.02] border border-white/[0.06] rounded-xl p-5 select-none">
              <div className="space-y-1">
                <p className="text-[10px] uppercase tracking-wider text-[#9CA3AF]/40 font-semibold">Total Duels</p>
                <p className="text-2xl font-bold text-white tracking-tight">{battleStats.total}</p>
              </div>
              <div className="space-y-1">
                <p className="text-[10px] uppercase tracking-wider text-[#9CA3AF]/40 font-semibold">Total Solves</p>
                <p className="text-2xl font-bold text-[#4F7DFF] tracking-tight">{battleStats.solved}</p>
              </div>
              <div className="space-y-1">
                <p className="text-[10px] uppercase tracking-wider text-[#9CA3AF]/40 font-semibold">Ties Secured</p>
                <p className="text-2xl font-bold text-white/80 tracking-tight">{battleStats.ties}</p>
              </div>
            </div>

            {/* Battle Log Index */}
            <div className="space-y-4">
              <div className="flex items-center justify-between gap-4 border-b border-white/[0.04] pb-4 select-none">
                <div>
                  <h2 className="text-lg font-semibold text-white tracking-tight flex items-center gap-2">
                    <History className="w-4 h-4 text-[#7A5FFF]" />
                    Duel Log Book
                  </h2>
                  <p className="text-xs text-[#9CA3AF]/50 mt-0.5">
                    Chronicle of split-screen and remote combat sessions.
                  </p>
                </div>
                <button
                  onClick={clearBattleHistory}
                  disabled={battleHistory.length === 0}
                  className="px-3 py-1.5 border border-white/[0.08] hover:border-rose-500/20 bg-white/[0.01] hover:bg-rose-500/5 text-xs font-semibold text-[#9CA3AF]/60 hover:text-rose-400 rounded-md transition duration-300 disabled:opacity-30 disabled:cursor-not-allowed select-none"
                >
                  Clear Duel Logs
                </button>
              </div>

              {/* Logs List */}
              <div className="space-y-3 max-h-[480px] overflow-y-auto pr-1">
                {battleHistory.length === 0 ? (
                  <div className="border border-dashed border-white/[0.04] bg-white/[0.01] rounded-xl p-12 text-center select-none flex flex-col items-center justify-center gap-2">
                    <Swords className="w-5 h-5 text-gray-700" />
                    <span className="text-xs font-semibold text-white/70">No duels logged</span>
                    <span className="text-[11px] text-[#9CA3AF]/40">Complete a 1v1 battle to index the results.</span>
                  </div>
                ) : (
                  battleHistory.map(item => {
                    const playersList = getHistoryPlayers(item);
                    
                    // Determine outcome badge (Victory, Defeat, Tie)
                    let outcomeLabel = 'Duel Complete';
                    let outcomeStyle = 'bg-white/[0.04] border-white/[0.06] text-[#9CA3AF]/80';
                    if (item.winner === 'Tie Match') {
                      outcomeLabel = 'Tie Match';
                      outcomeStyle = 'bg-amber-500/10 border-amber-500/20 text-amber-400';
                    } else if (user && item.winner) {
                      if (item.winner === user.username) {
                        outcomeLabel = 'Victory';
                        outcomeStyle = 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400';
                      } else {
                        outcomeLabel = 'Defeat';
                        outcomeStyle = 'bg-rose-500/10 border-rose-500/20 text-rose-400';
                      }
                    } else if (item.winner) {
                      outcomeLabel = `Winner: ${item.winner}`;
                    }

                    return (
                      <div key={item.id} className="bg-white/[0.02] border border-white/[0.04] rounded-xl p-4 flex flex-col gap-4 hover:border-white/[0.06] hover:bg-white/[0.03] transition-all duration-200">
                        {/* Header Details */}
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 select-none">
                          <div className="flex items-center gap-3">
                            <span className={`text-[10px] font-semibold uppercase tracking-wide border px-2 py-0.5 rounded ${outcomeStyle}`}>
                              {outcomeLabel}
                            </span>
                            <span className="text-sm font-semibold text-white tracking-tight">
                              {item.problemTitle || 'Arena Duel'}
                            </span>
                          </div>
                          
                          <div className="flex items-center gap-4 text-[11px] text-[#9CA3AF]/50 font-medium">
                            <span className="flex items-center gap-1">
                              <Clock className="w-3.5 h-3.5 text-gray-600" /> {formatDuration(item.timeUsedSeconds)}
                            </span>
                            <span>
                              {item.endedAt ? safeParseDate(item.endedAt).toLocaleDateString() : 'Unknown date'}
                            </span>
                          </div>
                        </div>

                        {/* Competitors List */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                          {playersList.map((p) => {
                            return (
                              <div key={p.username} className={`border border-white/[0.04] bg-white/[0.02] rounded-lg p-3.5 flex flex-col justify-between gap-2.5`}>
                                <div className="flex justify-between items-center gap-2">
                                  <span className="text-xs font-semibold text-white/95 truncate">{p.username}</span>
                                  <span className={`text-[9px] font-mono font-medium px-1.5 py-0.5 rounded border uppercase shrink-0 ${
                                    p.solved ? 'bg-emerald-500/5 border-emerald-500/15 text-emerald-400/90' : 'bg-white/[0.02] border-white/[0.04] text-gray-500'
                                  }`}>
                                    {p.solved ? 'Solved' : 'Failed'}
                                  </span>
                                </div>
                                <div className="flex justify-between items-end">
                                  <div className="text-sm font-mono font-semibold text-white">
                                    {p.score ?? 0} <span className="text-[10px] text-gray-500 font-normal">pts</span>
                                  </div>
                                  <span className="text-[10px] text-[#9CA3AF]/40">
                                    {p.attempts ?? 0} {p.attempts === 1 ? 'attempt' : 'attempts'}
                                  </span>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

          </div>
        )}

      </div>
    </div>
  );
};
