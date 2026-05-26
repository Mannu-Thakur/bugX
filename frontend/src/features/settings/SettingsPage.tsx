import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Award, BookOpen, Clock, Download, FileText, History, StickyNote, Swords, Trash2, Trophy, Upload } from 'lucide-react';
import { Button } from '../../shared/ui/button/Button';
import { useToast } from '../../shared/ui/toast/ToastProvider';
import { api } from '../../shared/lib/api';
import type { ApiError, StudyFileItem } from '../../shared/lib/api';

interface BattleHistoryItem {
  id: string;
  problemTitle?: string;
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

  const [activeSubject, setActiveSubject] = useState<SubjectKey>('dbms');
  const [studyFiles, setStudyFiles] = useState<Record<SubjectKey, StudyFile[]>>(createEmptyStudyFiles);
  const [filesLoading, setFilesLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
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
    const solved = battleHistory.reduce((sum, item) => sum + (item.p1Solved ? 1 : 0) + (item.p2Solved ? 1 : 0), 0);
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

  const activeFiles = studyFiles[activeSubject] || [];

  return (
    <div className="animate-fade-in space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-blue-600/10 border border-blue-500/20 flex items-center justify-center">
          <StickyNote className="w-5 h-5 text-blue-400" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-100 tracking-tight">Vault</h1>
          <p className="text-sm text-gray-500">Subject files and battle history</p>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <section className="xl:col-span-2 bg-dark-panel border border-dark-border rounded-lg p-5">
          <div className="flex items-center justify-between gap-3 mb-5">
            <div className="flex items-center gap-2.5">
              <History className="w-5 h-5 text-orange-400" />
              <div>
                <h2 className="text-base font-semibold text-gray-100">Battle History</h2>
                <p className="text-xs text-gray-500">Last 50 local 1v1 matches</p>
              </div>
            </div>
            <Button variant="outline" size="sm" onClick={clearBattleHistory} disabled={battleHistory.length === 0}>
              Clear
            </Button>
          </div>

          <div className="grid grid-cols-3 gap-3 mb-5">
            <div className="bg-dark-bg border border-dark-border rounded-lg p-3">
              <Swords className="w-4 h-4 text-orange-400 mb-2" />
              <div className="text-xl font-black text-gray-100">{battleStats.total}</div>
              <div className="text-[11px] text-gray-500 uppercase font-bold">Battles</div>
            </div>
            <div className="bg-dark-bg border border-dark-border rounded-lg p-3">
              <Award className="w-4 h-4 text-emerald-400 mb-2" />
              <div className="text-xl font-black text-gray-100">{battleStats.solved}</div>
              <div className="text-[11px] text-gray-500 uppercase font-bold">Solves</div>
            </div>
            <div className="bg-dark-bg border border-dark-border rounded-lg p-3">
              <Trophy className="w-4 h-4 text-amber-400 mb-2" />
              <div className="text-xl font-black text-gray-100">{battleStats.ties}</div>
              <div className="text-[11px] text-gray-500 uppercase font-bold">Ties</div>
            </div>
          </div>

          <div className="space-y-3 max-h-[420px] overflow-y-auto pr-1">
            {battleHistory.length === 0 ? (
              <div className="border border-dashed border-dark-border rounded-lg p-8 text-center text-sm text-gray-500">
                No battles recorded yet. Finish a 1v1 match and it will appear here.
              </div>
            ) : (
              battleHistory.map(item => (
                <div key={item.id} className="bg-dark-bg border border-dark-border rounded-lg p-4">
                  <div className="flex flex-col md:flex-row md:items-start justify-between gap-3">
                    <div>
                      <div className="text-sm font-bold text-gray-100">{item.problemTitle || 'Battle Match'}</div>
                      <div className="text-xs text-gray-500 mt-1">
                        {item.endedAt ? new Date(item.endedAt).toLocaleString() : 'Unknown time'}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-[10px] uppercase text-gray-500 font-bold">Winner</div>
                      <div className="text-sm text-amber-400 font-black">{item.winner || 'Pending'}</div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-4">
                    <div className="border border-blue-500/20 bg-blue-500/5 rounded-lg p-3">
                      <div className="text-xs text-blue-400 font-bold">{item.player1 || 'Participant 1'}</div>
                      <div className="text-lg font-mono font-black text-blue-200">{item.p1Score ?? 0} pts</div>
                      <div className="text-[11px] text-gray-500">Attempts {item.p1Attempts ?? 0} - {item.p1Solved ? 'Solved' : 'Incomplete'}</div>
                    </div>
                    <div className="border border-rose-500/20 bg-rose-500/5 rounded-lg p-3">
                      <div className="text-xs text-rose-400 font-bold">{item.player2 || 'Participant 2'}</div>
                      <div className="text-lg font-mono font-black text-rose-200">{item.p2Score ?? 0} pts</div>
                      <div className="text-[11px] text-gray-500">Attempts {item.p2Attempts ?? 0} - {item.p2Solved ? 'Solved' : 'Incomplete'}</div>
                    </div>
                  </div>

                  <div className="mt-3 flex flex-wrap items-center gap-2 text-[11px] text-gray-500">
                    <span className="inline-flex items-center gap-1"><Clock className="w-3 h-3" /> {formatDuration(item.timeUsedSeconds)}</span>
                    <span>Limit {item.timeLimitMinutes ?? '-'} min</span>
                    {item.endedByTimeout && <span className="text-amber-400">Timeout finish</span>}
                  </div>
                </div>
              ))
            )}
          </div>
        </section>

        <section className="bg-dark-panel border border-dark-border rounded-lg p-5">
          <div className="flex items-center gap-2.5 mb-5">
            <BookOpen className="w-5 h-5 text-emerald-400" />
            <div>
              <h2 className="text-base font-semibold text-gray-100">Subject File Vault</h2>
              <p className="text-xs text-gray-500">Upload PDFs, images, docs, markdown, or text notes</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 mb-4">
            {SUBJECTS.map(subject => (
              <button
                key={subject.key}
                type="button"
                onClick={() => setActiveSubject(subject.key)}
                className={`text-left border rounded-lg p-3 transition-colors ${
                  activeSubject === subject.key
                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                    : 'bg-dark-bg border-dark-border text-gray-300 hover:border-gray-600'
                }`}
              >
                <div className="text-xs font-black">{subject.label}</div>
                <div className="text-[10px] text-gray-500 mt-1 leading-snug">{subject.hint}</div>
              </button>
            ))}
          </div>

          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept=".pdf,.doc,.docx,.txt,.md,.png,.jpg,.jpeg,.webp"
            className="hidden"
            onChange={handleFileUpload}
          />

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="w-full border border-dashed border-emerald-500/30 bg-emerald-500/5 hover:bg-emerald-500/10 disabled:opacity-60 disabled:cursor-not-allowed rounded-lg p-5 flex flex-col items-center justify-center gap-2 text-center transition-colors"
          >
            <Upload className="w-6 h-6 text-emerald-400" />
            <span className="text-sm font-bold text-gray-100">
              {uploading ? 'Uploading...' : `Upload notes for ${SUBJECTS.find(s => s.key === activeSubject)?.label}`}
            </span>
            <span className="text-xs text-gray-500">Stored on the backend. Max file size: 25 MB.</span>
          </button>

          <div className="mt-4 space-y-2 max-h-[340px] overflow-y-auto pr-1">
            {filesLoading ? (
              <div className="border border-dark-border rounded-lg p-5 text-center text-sm text-gray-500">
                Loading files...
              </div>
            ) : activeFiles.length === 0 ? (
              <div className="border border-dark-border rounded-lg p-5 text-center text-sm text-gray-500">
                No files uploaded for this subject yet.
              </div>
            ) : (
              activeFiles.map(file => (
                <div key={file.id} className="bg-dark-bg border border-dark-border rounded-lg p-3 flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shrink-0">
                    <FileText className="w-4 h-4 text-emerald-400" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-bold text-gray-200 truncate">{file.name}</div>
                    <div className="text-[11px] text-gray-500">
                      {formatFileSize(file.size)} - {new Date(file.uploadedAt).toLocaleDateString()}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => downloadStudyFile(file)}
                    disabled={downloadingId === file.id}
                    className="p-2 rounded-lg border border-dark-border text-gray-400 hover:text-gray-200 hover:bg-dark-hover transition-colors"
                    title="Download file"
                  >
                    <Download className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => removeStudyFile(file.id)}
                    className="p-2 rounded-lg border border-rose-500/20 text-rose-400 hover:bg-rose-500/10 transition-colors"
                    title="Remove file"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))
            )}
          </div>
          <p className="text-[11px] text-gray-600 mt-2">Files are saved through the backend and can be downloaded from this vault.</p>
        </section>
      </div>

    </div>
  );
};
