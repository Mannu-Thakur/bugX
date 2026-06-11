import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Award, BookOpen, Clock, Download, FileText, History, Swords, Trash2, Trophy, Upload } from 'lucide-react';
import { Button } from '../../shared/ui/button/Button';
import { useToast } from '../../shared/ui/toast/ToastProvider';
import { api } from '../../shared/lib/api';
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
  { key: 'dsa', label: 'DSA', hint: 'Patterns, formulas, edge cases' },
];

const SUBJECT_THEMES: Record<SubjectKey, { color: string; bg: string; border: string; glow: string }> = {
  dbms: { color: 'text-indigo-400', bg: 'bg-indigo-500/10', border: 'border-indigo-500/30', glow: 'shadow-[0_0_15px_rgba(99,102,241,0.06)]' },
  sql: { color: 'text-violet-400', bg: 'bg-violet-500/10', border: 'border-violet-500/30', glow: 'shadow-[0_0_15px_rgba(139,92,246,0.06)]' },
  os: { color: 'text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500/30', glow: 'shadow-[0_0_15px_rgba(59,130,246,0.06)]' },
  cn: { color: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/30', glow: 'shadow-[0_0_15px_rgba(245,158,11,0.06)]' },
  oop: { color: 'text-rose-400', bg: 'bg-rose-500/10', border: 'border-rose-500/30', glow: 'shadow-[0_0_15px_rgba(244,63,94,0.06)]' },
  dsa: { color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/30', glow: 'shadow-[0_0_15px_rgba(16,185,129,0.06)]' },
};

const PLAYER_COLORS = [
  { text: 'text-blue-400', bg: 'bg-blue-500', border: 'border-blue-500' },
  { text: 'text-rose-400', bg: 'bg-rose-500', border: 'border-rose-500' },
  { text: 'text-emerald-400', bg: 'bg-emerald-500', border: 'border-emerald-500' },
  { text: 'text-amber-400', bg: 'bg-amber-500', border: 'border-amber-500' },
  { text: 'text-purple-400', bg: 'bg-purple-500', border: 'border-purple-500' },
  { text: 'text-cyan-400', bg: 'bg-cyan-500', border: 'border-cyan-500' },
  { text: 'text-pink-400', bg: 'bg-pink-500', border: 'border-pink-500' },
  { text: 'text-orange-400', bg: 'bg-orange-500', border: 'border-orange-500' },
  { text: 'text-indigo-400', bg: 'bg-indigo-500', border: 'border-indigo-500' },
  { text: 'text-teal-400', bg: 'bg-teal-500', border: 'border-teal-500' },
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
  const [battleHistory, setBattleHistory] = useState<BattleHistoryItem[]>(() => {
    try {
      const parsed = JSON.parse(localStorage.getItem('battle_history') || '[]');
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  });

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
    localStorage.removeItem('battle_history');
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
    // Re-use the existing upload logic by creating a synthetic event-like object
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
    <div className="animate-fade-in space-y-6">
      {/* Title */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-emerald-600/10 border border-emerald-500/20 flex items-center justify-center">
          <BookOpen className="w-5 h-5 text-emerald-400" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-100 tracking-tight">Vault</h1>
          <p className="text-sm text-gray-500">Access and organize subject study materials and view dual archives</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-dark-border gap-6 select-none">
        <button
          type="button"
          onClick={() => setActiveTab('vault')}
          className={`pb-3 text-sm font-bold tracking-tight border-b-2 transition-all flex items-center gap-2 ${
            activeTab === 'vault'
              ? 'border-emerald-500 text-emerald-400 font-extrabold shadow-[inset_0_-2px_0_0_rgba(16,185,129,1)]'
              : 'border-transparent text-gray-400 hover:text-gray-200'
          }`}
        >
          <BookOpen className="w-4 h-4" />
          Subject Vault
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('battles')}
          className={`pb-3 text-sm font-bold tracking-tight border-b-2 transition-all flex items-center gap-2 ${
            activeTab === 'battles'
              ? 'border-orange-500 text-orange-400 font-extrabold shadow-[inset_0_-2px_0_0_rgba(249,115,22,1)]'
              : 'border-transparent text-gray-400 hover:text-gray-200'
          }`}
        >
          <History className="w-4 h-4" />
          Battle History
        </button>
      </div>

      {/* Tab Contents */}
      {activeTab === 'vault' ? (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
          {/* Left panel: Subjects List */}
          <div className="space-y-2 lg:col-span-1">
            <h3 className="text-xs font-extrabold uppercase text-gray-500 tracking-wider mb-2 select-none px-1">
              Study Subjects
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-1 gap-2">
              {SUBJECTS.map(subject => {
                const isActive = activeSubject === subject.key;
                const theme = SUBJECT_THEMES[subject.key];
                const count = studyFiles[subject.key]?.length || 0;
                return (
                  <button
                    key={subject.key}
                    type="button"
                    onClick={() => setActiveSubject(subject.key)}
                    className={`text-left border rounded-xl p-3.5 transition-all flex flex-col justify-between gap-1.5 ${
                      isActive
                        ? `${theme.bg} ${theme.border} ${theme.glow} ring-1 ring-emerald-500/10`
                        : 'bg-dark-panel border-dark-border hover:border-gray-500/50 hover:bg-dark-hover/30'
                    }`}
                  >
                    <div className="flex items-center justify-between w-full">
                      <span className={`text-xs font-black ${isActive ? theme.color : 'text-gray-300'}`}>
                        {subject.label}
                      </span>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded font-mono font-bold shrink-0 ${
                        isActive ? 'bg-emerald-500/20 text-emerald-400' : 'bg-dark-bg text-gray-500'
                      }`}>
                        {count} file{count === 1 ? '' : 's'}
                      </span>
                    </div>
                    <span className="text-[10px] text-gray-500 leading-snug line-clamp-1">
                      {subject.hint}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Right panel: Active Subject Workspace */}
          <div className="lg:col-span-3 bg-dark-panel border border-dark-border rounded-2xl p-5 md:p-6 space-y-6 shadow-xl">
            {/* Subject details header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-dark-border pb-4">
              <div>
                <h2 className="text-lg font-black text-gray-100 flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
                  {SUBJECTS.find(s => s.key === activeSubject)?.label} Study Vault
                </h2>
                <p className="text-xs text-gray-500 mt-1">
                  {SUBJECTS.find(s => s.key === activeSubject)?.hint}
                </p>
              </div>

              {/* Search input */}
              <div className="relative max-w-xs w-full">
                <input
                  type="text"
                  placeholder="Search files by name..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="w-full bg-dark-bg border border-dark-border rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-emerald-500/50 transition-all placeholder:text-gray-500"
                />
              </div>
            </div>

            {/* Upload Area */}
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
              className={`w-full border-2 border-dashed rounded-xl p-6 flex flex-col items-center justify-center gap-2 text-center transition-all duration-200 select-none disabled:opacity-60 disabled:cursor-not-allowed ${
                isDragging
                  ? 'border-emerald-400 bg-emerald-500/15 scale-[1.01] shadow-lg shadow-emerald-500/10'
                  : 'border-emerald-500/30 bg-emerald-500/5 hover:bg-emerald-500/10 hover:border-emerald-500/50'
              }`}
            >
              <Upload className={`w-6 h-6 transition-transform duration-200 ${isDragging ? 'text-emerald-300 scale-125' : 'text-emerald-400 animate-pulse'}`} />
              <span className="text-sm font-bold text-gray-100">
                {uploading ? 'Uploading...' : isDragging ? 'Drop files here!' : `Upload notes for ${SUBJECTS.find(s => s.key === activeSubject)?.label}`}
              </span>
              <span className="text-xs text-gray-500">
                {isDragging ? 'Release to upload' : 'Click to browse or drag & drop files here'}
              </span>
              {!isDragging && !uploading && (
                <span className="text-[10px] text-gray-600">Max 25 MB · PDF, Docs, Markdown, Images, Text</span>
              )}
            </button>

            {/* Files List Table */}
            <div className="space-y-2">
              <h3 className="text-xs font-bold uppercase text-gray-500 tracking-wider px-1">
                Uploaded Resources
              </h3>

              <div className="overflow-x-auto border border-dark-border rounded-xl bg-dark-bg/25 max-h-[360px] overflow-y-auto pr-1">
                {filesLoading ? (
                  <div className="p-8 text-center text-xs text-gray-500 animate-pulse">
                    Loading files...
                  </div>
                ) : activeFiles.length === 0 ? (
                  <div className="p-8 text-center text-xs text-gray-500 italic">
                    {searchQuery ? 'No matching files found.' : 'No files uploaded for this subject yet.'}
                  </div>
                ) : (
                  <table className="w-full text-left text-xs text-gray-300">
                    <thead className="bg-dark-hover/40 border-b border-dark-border font-bold uppercase tracking-wider text-[10px] text-gray-500 select-none">
                      <tr>
                        <th className="px-4 py-2.5">Name</th>
                        <th className="px-4 py-2.5">Size</th>
                        <th className="px-4 py-2.5">Date</th>
                        <th className="px-4 py-2.5 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-dark-border font-medium">
                      {activeFiles.map(file => {
                        const ext = file.name.split('.').pop()?.toLowerCase();
                        let iconColor = 'text-gray-400';
                        if (ext === 'pdf') iconColor = 'text-rose-400';
                        else if (ext === 'doc' || ext === 'docx') iconColor = 'text-blue-400';
                        else if (ext === 'txt' || ext === 'md') iconColor = 'text-emerald-400';
                        else if (['png', 'jpg', 'jpeg', 'webp'].includes(ext || '')) iconColor = 'text-purple-400';

                        return (
                          <tr key={file.id} className="hover:bg-dark-hover/20 transition-colors">
                            <td className="px-4 py-3 flex items-center gap-2 min-w-0">
                              <FileText className={`w-4 h-4 shrink-0 ${iconColor}`} />
                              <span className="font-bold text-gray-200 truncate max-w-[200px] md:max-w-xs" title={file.name}>
                                {file.name}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-gray-400 font-mono text-[10px] whitespace-nowrap">
                              {formatFileSize(file.size)}
                            </td>
                            <td className="px-4 py-3 text-gray-400 whitespace-nowrap">
                              {safeParseDate(file.uploadedAt).toLocaleDateString()}
                            </td>
                            <td className="px-4 py-3 text-right whitespace-nowrap">
                              <div className="inline-flex gap-2">
                                <button
                                  type="button"
                                  onClick={() => downloadStudyFile(file)}
                                  disabled={downloadingId === file.id}
                                  className="p-1.5 rounded-lg border border-dark-border text-gray-400 hover:text-emerald-400 hover:border-emerald-500/25 hover:bg-emerald-500/5 transition-all"
                                  title="Download File"
                                >
                                  <Download className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => removeStudyFile(file.id)}
                                  className="p-1.5 rounded-lg border border-dark-border text-gray-400 hover:text-rose-400 hover:border-rose-500/25 hover:bg-rose-500/5 transition-all"
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
                )}
              </div>
            </div>

            <p className="text-[10px] text-gray-600 italic">
              Resources are securely persisted on the server and synced across your active workspaces.
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Stats Bar */}
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-dark-panel border border-dark-border rounded-xl p-4 shadow-sm flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-orange-500/10 border border-orange-500/20 flex items-center justify-center text-orange-400 shrink-0">
                <Swords className="w-5 h-5" />
              </div>
              <div>
                <div className="text-2xl font-black text-gray-100 leading-none">{battleStats.total}</div>
                <div className="text-[10px] text-gray-500 font-bold uppercase tracking-wider mt-1">Total Battles</div>
              </div>
            </div>
            <div className="bg-dark-panel border border-dark-border rounded-xl p-4 shadow-sm flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0">
                <Award className="w-5 h-5" />
              </div>
              <div>
                <div className="text-2xl font-black text-gray-100 leading-none">{battleStats.solved}</div>
                <div className="text-[10px] text-gray-500 font-bold uppercase tracking-wider mt-1">Total Solves</div>
              </div>
            </div>
            <div className="bg-dark-panel border border-dark-border rounded-xl p-4 shadow-sm flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 shrink-0">
                <Trophy className="w-5 h-5" />
              </div>
              <div>
                <div className="text-2xl font-black text-gray-100 leading-none">{battleStats.ties}</div>
                <div className="text-[10px] text-gray-500 font-bold uppercase tracking-wider mt-1">Ties</div>
              </div>
            </div>
          </div>

          {/* List of Battles */}
          <div className="bg-dark-panel border border-dark-border rounded-2xl p-5 md:p-6 space-y-4 shadow-xl">
            <div className="flex items-center justify-between gap-3 border-b border-dark-border pb-3">
              <div>
                <h2 className="text-sm font-black text-gray-100 flex items-center gap-2">
                  <History className="w-4 h-4 text-orange-400" />
                  Duel Log Book
                </h2>
                <p className="text-xs text-gray-500">History of your recent split-screen or remote duels</p>
              </div>
              <Button variant="outline" size="sm" onClick={clearBattleHistory} disabled={battleHistory.length === 0}>
                Clear All Logs
              </Button>
            </div>

            <div className="space-y-3 max-h-[460px] overflow-y-auto pr-1">
              {battleHistory.length === 0 ? (
                <div className="border border-dashed border-dark-border rounded-xl p-8 text-center text-xs text-gray-500">
                  No matches recorded. Complete a 1v1 battle to see it here!
                </div>
              ) : (
                battleHistory.map(item => {
                  const playersList = getHistoryPlayers(item);
                  return (
                    <div key={item.id} className="bg-dark-bg/40 border border-dark-border rounded-xl p-4 hover:border-dark-border/80 transition-colors">
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div>
                          <div className="text-sm font-bold text-gray-100">{item.problemTitle || 'Battle Match'}</div>
                          <div className="text-[10px] text-gray-500 mt-1 font-medium">
                            {item.endedAt ? safeParseDate(item.endedAt).toLocaleString() : 'Unknown time'}
                          </div>
                        </div>
                        <div className="flex items-center gap-4 bg-dark-panel border border-dark-border/60 rounded-xl px-4 py-2 shrink-0">
                          <div className="text-left pr-4 border-r border-dark-border/60">
                            <div className="text-[9px] uppercase text-gray-500 font-bold">Winner</div>
                            <div className="text-xs text-amber-400 font-black">{item.winner || 'Pending'}</div>
                          </div>
                          <div className="text-left">
                            <div className="text-[9px] uppercase text-gray-500 font-bold">Duration</div>
                            <div className="text-xs text-gray-300 font-mono font-bold flex items-center gap-1">
                              <Clock className="w-3.5 h-3.5 text-gray-500" /> {formatDuration(item.timeUsedSeconds)}
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 mt-4">
                        {playersList.map((p, idx) => {
                          const colorTheme = PLAYER_COLORS[idx % PLAYER_COLORS.length] || PLAYER_COLORS[0];
                          return (
                            <div key={p.username} className={`border ${colorTheme.border}/10 ${colorTheme.bg}/5 rounded-xl p-3.5 flex flex-col justify-between gap-1`}>
                              <div className="flex justify-between items-center w-full gap-2">
                                <span className={`text-xs ${colorTheme.text} font-bold truncate`}>{p.username}</span>
                                <span className={`text-[9px] px-1.5 py-0.5 rounded font-black border uppercase shrink-0 ${
                                  p.solved ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-gray-500/10 border-gray-500/20 text-gray-400'
                                }`}>
                                  {p.solved ? 'Solved' : 'Failed'}
                                </span>
                              </div>
                              <div className="flex justify-between items-end mt-2">
                                <div className={`text-base font-mono font-black ${colorTheme.text}`}>{p.score ?? 0} <span className="text-[10px] text-gray-400 font-bold">pts</span></div>
                                <span className="text-[10px] text-gray-500">Attempts: {p.attempts ?? 0}</span>
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
  );
};
