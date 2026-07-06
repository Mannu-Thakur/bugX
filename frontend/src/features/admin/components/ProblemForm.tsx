import React, { useState, useCallback } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Save, Plus, Trash2, AlertTriangle, ChevronDown, ChevronUp, Code2, FileJson, Eye, EyeOff } from 'lucide-react';
import { api } from '../../../shared/lib/api';
import type { ProblemCreatePayload, ProblemUpdatePayload, ProblemDetail, Difficulty, ApiError } from '../../../shared/lib/api';
import { Button } from '../../../shared/ui/button/Button';
import { Input } from '../../../shared/ui/input/Input';
import { Select } from '../../../shared/ui/select/Select';
import { Badge } from '../../../shared/ui/badge/Badge';
import { useToast } from '../../../shared/ui/toast/ToastProvider';
import { TagPicker } from './TagPicker';

// ── Types ────────────────────────────────────────────────────────────────────

interface TemplateState {
  language: string;
  template_code: string;
  function_name: string;
  arg_style: string;
}

interface TestCaseState {
  input: string;
  expected_output: string;
  is_sample: boolean;
  order_index: number;
  weight: number;
}

interface ProblemFormProps {
  mode: 'create' | 'edit';
  initialData?: ProblemDetail;
  onSuccess?: () => void;
  onCancel?: () => void;
}

// ── Validation ───────────────────────────────────────────────────────────────

interface ValidationErrors {
  [key: string]: string;
}

function validateCreate(
  slug: string,
  title: string,
  description: string,
  difficulty: string,
  templates: TemplateState[],
  testCases: TestCaseState[],
): ValidationErrors {
  const errors: ValidationErrors = {};

  if (!slug.trim()) errors.slug = 'Slug is required';
  else if (!/^[a-z0-9-]+$/.test(slug)) errors.slug = 'Slug must only contain lowercase letters, digits, and hyphens';

  if (!title.trim()) errors.title = 'Title is required';
  if (!description.trim()) errors.description = 'Description is required';
  if (!difficulty) errors.difficulty = 'Difficulty is required';

  // Template validation
  if (templates.length === 0) {
    errors.templates = 'At least one template is required';
  } else {
    templates.forEach((t, i) => {
      if (!t.template_code.trim()) errors[`template_${i}_code`] = `Template ${i + 1}: code is required`;
      if (!t.function_name.trim()) errors[`template_${i}_fn`] = `Template ${i + 1}: function name is required`;
      else if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(t.function_name))
        errors[`template_${i}_fn`] = `Template ${i + 1}: invalid function name`;
      if (t.language === 'javascript' && t.arg_style === 'kwargs')
        errors[`template_${i}_kwargs`] = `Template ${i + 1}: JavaScript cannot use kwargs arg_style`;
    });
  }

  // Test case validation
  const samples = testCases.filter((tc) => tc.is_sample);
  const hidden = testCases.filter((tc) => !tc.is_sample);
  if (samples.length < 1) errors.test_cases_samples = 'At least 1 sample test case is required';
  if (hidden.length < 3) errors.test_cases_hidden = `At least 3 hidden test cases required (have ${hidden.length})`;

  // Unique order_index
  const indices = testCases.map((tc) => tc.order_index);
  if (new Set(indices).size !== indices.length) errors.test_cases_order = 'Order indices must be unique';

  // Validate JSON-parseable inputs/outputs
  testCases.forEach((tc, i) => {
    if (!tc.input.trim()) errors[`tc_${i}_input`] = `Test case ${i + 1}: input is required`;
    if (!tc.expected_output.trim()) errors[`tc_${i}_output`] = `Test case ${i + 1}: expected output is required`;
  });

  return errors;
}

function validateUpdate(title: string, description: string): ValidationErrors {
  const errors: ValidationErrors = {};
  if (title !== undefined && !title.trim()) errors.title = 'Title cannot be empty';
  if (description !== undefined && !description.trim()) errors.description = 'Description cannot be empty';
  return errors;
}

// ── Component ────────────────────────────────────────────────────────────────

export const ProblemForm: React.FC<ProblemFormProps> = ({ mode, initialData, onSuccess, onCancel }) => {
  const toast = useToast();
  const queryClient = useQueryClient();

  // ── Metadata state ──
  const [slug, setSlug] = useState(initialData?.slug || '');
  const [title, setTitle] = useState(initialData?.title || '');
  const [description, setDescription] = useState(initialData?.description || '');
  const [difficulty, setDifficulty] = useState<string>(initialData?.difficulty || 'EASY');
  const [timeLimitMs, setTimeLimitMs] = useState(initialData?.time_limit_ms ?? 2000);
  const [memoryLimitKb, setMemoryLimitKb] = useState(initialData?.memory_limit_kb ?? 262144);
  const [scoreBase, setScoreBase] = useState(initialData?.score_base ?? 1);
  const handleDifficultyChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    setDifficulty(val);
    if (val === 'EASY') setScoreBase(1);
    else if (val === 'MEDIUM') setScoreBase(3);
    else if (val === 'HARD') setScoreBase(6);
  }, []);
  const [runtimeBonusMax, setRuntimeBonusMax] = useState(20);
  const [expectedComplexity, setExpectedComplexity] = useState('');
  const [tagIds, setTagIds] = useState<string[]>(initialData?.tags?.map((t) => t.id) || []);

  // ── Templates state (create only) ──
  const [templates, setTemplates] = useState<TemplateState[]>(
    initialData?.templates?.map((t) => {
      const rec = t as unknown as Record<string, string>;
      return {
        language: t.language,
        template_code: rec.source_code || rec.template_code || '',
        function_name: rec.function_name || 'solve',
        arg_style: rec.arg_style || 'positional',
      };
    }) || [
      { language: 'python', template_code: 'def solve():\n    pass\n', function_name: 'solve', arg_style: 'positional' },
    ]
  );

  // ── Test cases state (create only) ──
  const [testCases, setTestCases] = useState<TestCaseState[]>([
    { input: '', expected_output: '', is_sample: true, order_index: 0, weight: 1 },
    { input: '', expected_output: '', is_sample: false, order_index: 1, weight: 1 },
    { input: '', expected_output: '', is_sample: false, order_index: 2, weight: 1 },
    { input: '', expected_output: '', is_sample: false, order_index: 3, weight: 1 },
  ]);

  // ── UI state ──
  const [errors, setErrors] = useState<ValidationErrors>({});
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    metadata: true,
    templates: true,
    testcases: true,
  });

  const toggleSection = (section: string) => {
    setExpandedSections((prev) => ({ ...prev, [section]: !prev[section] }));
  };

  // ── Mutations ──
  const createMutation = useMutation({
    mutationFn: (body: ProblemCreatePayload) => api.problems.create(body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['problems'] });
      toast.success('Problem created successfully!');
      onSuccess?.();
    },
    onError: (err: ApiError) => {
      toast.error(err?.message || 'Failed to create problem');
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ slug, body }: { slug: string; body: ProblemUpdatePayload }) => api.problems.update(slug, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['problems'] });
      toast.success('Problem updated successfully!');
      onSuccess?.();
    },
    onError: (err: ApiError) => {
      toast.error(err?.message || 'Failed to update problem');
    },
  });

  // ── Template helpers ──
  const addTemplate = useCallback(() => {
    const existingLangs = templates.map((t) => t.language);
    const nextLang = !existingLangs.includes('python')
      ? 'python'
      : !existingLangs.includes('javascript')
        ? 'javascript'
        : 'python';
    setTemplates((prev) => [
      ...prev,
      {
        language: nextLang,
        template_code: nextLang === 'python' ? 'def solve():\n    pass\n' : 'function solve() {\n  \n}\n',
        function_name: 'solve',
        arg_style: 'positional',
      },
    ]);
  }, [templates]);

  const removeTemplate = useCallback((index: number) => {
    setTemplates((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const updateTemplate = useCallback((index: number, field: keyof TemplateState, value: string) => {
    setTemplates((prev) => prev.map((t, i) => (i === index ? { ...t, [field]: value } : t)));
  }, []);

  // ── Test case helpers ──
  const addTestCase = useCallback(() => {
    const maxIdx = testCases.length > 0 ? Math.max(...testCases.map((tc) => tc.order_index)) + 1 : 0;
    setTestCases((prev) => [
      ...prev,
      { input: '', expected_output: '', is_sample: false, order_index: maxIdx, weight: 1 },
    ]);
  }, [testCases]);

  const removeTestCase = useCallback((index: number) => {
    setTestCases((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const updateTestCase = useCallback((index: number, field: keyof TestCaseState, value: string | number | boolean) => {
    setTestCases((prev) => prev.map((tc, i) => (i === index ? { ...tc, [field]: value } : tc)));
  }, []);

  // ── Submit handler ──
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (mode === 'create') {
      const validationErrors = validateCreate(slug, title, description, difficulty, templates, testCases);
      if (Object.keys(validationErrors).length > 0) {
        setErrors(validationErrors);
        toast.error(`${Object.keys(validationErrors).length} validation error(s) — please fix them before submitting.`);
        return;
      }
      setErrors({});

      const payload: ProblemCreatePayload = {
        slug,
        title,
        description,
        difficulty: difficulty as Difficulty,
        time_limit_ms: timeLimitMs,
        memory_limit_kb: memoryLimitKb,
        score_base: scoreBase,
        runtime_bonus_max: runtimeBonusMax,
        expected_complexity: expectedComplexity || null,
        tag_ids: tagIds,
        templates: templates.map((t) => ({
          language: t.language,
          template_code: t.template_code,
          function_name: t.function_name,
          arg_style: t.arg_style,
        })),
        test_cases: testCases.map((tc) => ({
          input: tc.input,
          expected_output: tc.expected_output,
          is_sample: tc.is_sample,
          order_index: tc.order_index,
          weight: tc.weight,
        })),
      };
      createMutation.mutate(payload);
    } else {
      const validationErrors = validateUpdate(title, description);
      if (Object.keys(validationErrors).length > 0) {
        setErrors(validationErrors);
        return;
      }
      setErrors({});

      const payload: ProblemUpdatePayload = {
        title: title || undefined,
        description: description || undefined,
        difficulty: difficulty as Difficulty,
        time_limit_ms: timeLimitMs,
        memory_limit_kb: memoryLimitKb,
        score_base: scoreBase,
        runtime_bonus_max: runtimeBonusMax,
        expected_complexity: expectedComplexity || null,
        tag_ids: tagIds,
      };
      updateMutation.mutate({ slug: initialData!.slug, body: payload });
    }
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  // ── Validation Summary ──
  const errorKeys = Object.keys(errors);

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Validation Summary */}
      {errorKeys.length > 0 && (
        <div className="bg-rose-950/20 border border-rose-500/20 rounded-lg p-4 animate-fade-in">
          <div className="flex items-center gap-2 text-rose-400 mb-2">
            <AlertTriangle className="w-4 h-4 flex-shrink-0" />
            <h3 className="text-sm font-semibold">Validation Errors ({errorKeys.length})</h3>
          </div>
          <ul className="space-y-1">
            {errorKeys.map((key) => (
              <li key={key} className="text-xs text-rose-300/80 flex items-start gap-1.5">
                <span className="text-rose-500 mt-0.5">•</span>
                {errors[key]}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* ─── Section: Metadata ─── */}
      <div className="bg-dark-panel border border-dark-border rounded-lg overflow-hidden">
        <button
          type="button"
          onClick={() => toggleSection('metadata')}
          className="w-full flex items-center justify-between px-5 py-3.5 bg-dark-bg/50 hover:bg-dark-hover/30 transition-colors select-none"
        >
          <span className="text-sm font-semibold text-gray-200 flex items-center gap-2">
            <Code2 className="w-4 h-4 text-blue-400" />
            Problem Metadata
          </span>
          {expandedSections.metadata ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
        </button>

        {expandedSections.metadata && (
          <div className="p-5 space-y-4 border-t border-dark-border/50">
            {/* Row 1: Slug & Title */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {mode === 'create' ? (
                <Input
                  label="Slug"
                  placeholder="e.g. two-sum"
                  value={slug}
                  onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                  error={errors.slug}
                />
              ) : (
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-medium text-gray-400 select-none">Slug</label>
                  <div className="w-full bg-dark-bg border border-dark-border text-sm text-gray-500 rounded-md py-2 px-3 italic cursor-not-allowed">
                    {initialData?.slug}
                  </div>
                </div>
              )}
              <Input
                label="Title"
                placeholder="Two Sum"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                error={errors.title}
              />
            </div>

            {/* Row 2: Description */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-gray-400 select-none">Description (Markdown)</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Write the problem description in markdown..."
                rows={8}
                className={`w-full bg-dark-input border ${errors.description ? 'border-rose-500/50' : 'border-dark-border'} text-sm text-gray-200 rounded-md py-2.5 px-3 transition-colors placeholder-gray-600 focus:border-blue-500/80 focus:ring-1 focus:ring-blue-500/80 resize-y font-mono leading-relaxed`}
              />
              {errors.description && <span className="text-xs text-rose-400 mt-0.5 select-none">{errors.description}</span>}
            </div>

            {/* Row 3: Difficulty, Score, Limits */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Select
                label="Difficulty"
                options={[
                  { value: 'EASY', label: 'Easy' },
                  { value: 'MEDIUM', label: 'Medium' },
                  { value: 'HARD', label: 'Hard' },
                ]}
                value={difficulty}
                onChange={handleDifficultyChange}
                error={errors.difficulty}
              />
              <Input
                label="Score Base"
                type="number"
                value={String(scoreBase)}
                onChange={(e) => setScoreBase(Math.max(1, parseInt(e.target.value) || 1))}
              />
              <Input
                label="Time Limit (ms)"
                type="number"
                value={String(timeLimitMs)}
                onChange={(e) => setTimeLimitMs(Math.max(1, parseInt(e.target.value) || 1))}
              />
              <Input
                label="Memory Limit (KB)"
                type="number"
                value={String(memoryLimitKb)}
                onChange={(e) => setMemoryLimitKb(Math.max(1, parseInt(e.target.value) || 1))}
              />
            </div>

            {/* Row 4: Bonus & Complexity */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Input
                label="Runtime Bonus Max"
                type="number"
                value={String(runtimeBonusMax)}
                onChange={(e) => setRuntimeBonusMax(Math.max(0, parseInt(e.target.value) || 0))}
              />
              <Input
                label="Expected Complexity"
                placeholder="O(n log n)"
                value={expectedComplexity}
                onChange={(e) => setExpectedComplexity(e.target.value)}
              />
            </div>

            {/* Tags */}
            <TagPicker selectedTagIds={tagIds} onChange={setTagIds} />
          </div>
        )}
      </div>

      {/* ─── Section: Templates (create only) ─── */}
      {mode === 'create' && (
        <div className="bg-dark-panel border border-dark-border rounded-lg overflow-hidden">
          <button
            type="button"
            onClick={() => toggleSection('templates')}
            className="w-full flex items-center justify-between px-5 py-3.5 bg-dark-bg/50 hover:bg-dark-hover/30 transition-colors select-none"
          >
            <span className="text-sm font-semibold text-gray-200 flex items-center gap-2">
              <Code2 className="w-4 h-4 text-emerald-400" />
              Code Templates
              <Badge variant="info" className="text-[10px] py-0">{templates.length}</Badge>
            </span>
            {expandedSections.templates ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
          </button>

          {expandedSections.templates && (
            <div className="p-5 space-y-4 border-t border-dark-border/50">
              {errors.templates && (
                <p className="text-xs text-rose-400 select-none">{errors.templates}</p>
              )}

              {templates.map((template, idx) => (
                <div key={idx} className="border border-dark-border/60 rounded-lg p-4 space-y-3 bg-dark-bg/30 relative group">
                  {/* Remove button */}
                  {templates.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeTemplate(idx)}
                      className="absolute top-3 right-3 p-1 text-gray-500 hover:text-rose-400 hover:bg-rose-500/10 rounded transition-colors opacity-0 group-hover:opacity-100"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <Select
                      label="Language"
                      options={[
                        { value: 'python', label: 'Python' },
                        { value: 'javascript', label: 'JavaScript' },
                      ]}
                      value={template.language}
                      onChange={(e) => updateTemplate(idx, 'language', e.target.value)}
                    />
                    <Input
                      label="Function Name"
                      placeholder="solve"
                      value={template.function_name}
                      onChange={(e) => updateTemplate(idx, 'function_name', e.target.value)}
                      error={errors[`template_${idx}_fn`]}
                    />
                    <Select
                      label="Arg Style"
                      options={[
                        { value: 'positional', label: 'Positional' },
                        { value: 'single', label: 'Single' },
                        { value: 'kwargs', label: 'Kwargs' },
                      ]}
                      value={template.arg_style}
                      onChange={(e) => updateTemplate(idx, 'arg_style', e.target.value)}
                      error={errors[`template_${idx}_kwargs`]}
                    />
                  </div>

                  {errors[`template_${idx}_kwargs`] && (
                    <p className="text-xs text-rose-400 flex items-center gap-1.5">
                      <AlertTriangle className="w-3 h-3" />
                      {errors[`template_${idx}_kwargs`]}
                    </p>
                  )}

                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-medium text-gray-400 select-none">Template Code</label>
                    <textarea
                      value={template.template_code}
                      onChange={(e) => updateTemplate(idx, 'template_code', e.target.value)}
                      rows={6}
                      className={`w-full bg-[#0d0d10] border ${errors[`template_${idx}_code`] ? 'border-rose-500/50' : 'border-dark-border'} text-sm text-gray-200 rounded-md py-2.5 px-3 font-mono transition-colors placeholder-gray-600 focus:border-blue-500/80 focus:ring-1 focus:ring-blue-500/80 resize-y leading-relaxed`}
                    />
                    {errors[`template_${idx}_code`] && (
                      <span className="text-xs text-rose-400 mt-0.5 select-none">{errors[`template_${idx}_code`]}</span>
                    )}
                  </div>
                </div>
              ))}

              <Button type="button" variant="outline" size="sm" onClick={addTemplate} className="gap-1.5">
                <Plus className="w-3.5 h-3.5" />
                Add Template
              </Button>
            </div>
          )}
        </div>
      )}

      {/* ─── Section: Test Cases (create only) ─── */}
      {mode === 'create' && (
        <div className="bg-dark-panel border border-dark-border rounded-lg overflow-hidden">
          <button
            type="button"
            onClick={() => toggleSection('testcases')}
            className="w-full flex items-center justify-between px-5 py-3.5 bg-dark-bg/50 hover:bg-dark-hover/30 transition-colors select-none"
          >
            <span className="text-sm font-semibold text-gray-200 flex items-center gap-2">
              <FileJson className="w-4 h-4 text-amber-400" />
              Test Cases
              <Badge variant="info" className="text-[10px] py-0">{testCases.length}</Badge>
              {testCases.filter((tc) => tc.is_sample).length > 0 && (
                <Badge variant="success" className="text-[10px] py-0">{testCases.filter((tc) => tc.is_sample).length} sample</Badge>
              )}
              {testCases.filter((tc) => !tc.is_sample).length > 0 && (
                <Badge variant="default" className="text-[10px] py-0">{testCases.filter((tc) => !tc.is_sample).length} hidden</Badge>
              )}
            </span>
            {expandedSections.testcases ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
          </button>

          {expandedSections.testcases && (
            <div className="p-5 space-y-4 border-t border-dark-border/50">
              {/* Validation badges */}
              {(errors.test_cases_samples || errors.test_cases_hidden || errors.test_cases_order) && (
                <div className="space-y-1">
                  {errors.test_cases_samples && <p className="text-xs text-rose-400">{errors.test_cases_samples}</p>}
                  {errors.test_cases_hidden && <p className="text-xs text-rose-400">{errors.test_cases_hidden}</p>}
                  {errors.test_cases_order && <p className="text-xs text-rose-400">{errors.test_cases_order}</p>}
                </div>
              )}

              {testCases.map((tc, idx) => (
                <div key={idx} className={`border rounded-lg p-4 space-y-3 relative group transition-colors ${tc.is_sample ? 'border-emerald-500/20 bg-emerald-950/5' : 'border-dark-border/60 bg-dark-bg/30'}`}>
                  {/* Header row */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-gray-400 select-none">#{idx + 1}</span>
                      <Badge variant={tc.is_sample ? 'success' : 'default'} className="text-[10px] py-0">
                        {tc.is_sample ? 'Sample' : 'Hidden'}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => updateTestCase(idx, 'is_sample', !tc.is_sample)}
                        className="p-1 text-gray-500 hover:text-amber-400 hover:bg-amber-500/10 rounded transition-colors"
                        title={tc.is_sample ? 'Make hidden' : 'Make sample'}
                      >
                        {tc.is_sample ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      </button>
                      {testCases.length > 4 && (
                        <button
                          type="button"
                          onClick={() => removeTestCase(idx)}
                          className="p-1 text-gray-500 hover:text-rose-400 hover:bg-rose-500/10 rounded transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Row: order + weight */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <Input
                      label="Order Index"
                      type="number"
                      value={String(tc.order_index)}
                      onChange={(e) => updateTestCase(idx, 'order_index', parseInt(e.target.value) || 0)}
                    />
                    <Input
                      label="Weight"
                      type="number"
                      value={String(tc.weight)}
                      onChange={(e) => updateTestCase(idx, 'weight', Math.max(1, parseInt(e.target.value) || 1))}
                    />
                  </div>

                  {/* Input / Expected output */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-medium text-gray-400 select-none">Input</label>
                      <textarea
                        value={tc.input}
                        onChange={(e) => updateTestCase(idx, 'input', e.target.value)}
                        placeholder='e.g. [2, 7, 11, 15]\n9'
                        rows={3}
                        className={`w-full bg-[#0d0d10] border ${errors[`tc_${idx}_input`] ? 'border-rose-500/50' : 'border-dark-border'} text-xs text-gray-200 rounded-md py-2 px-3 font-mono transition-colors placeholder-gray-600 focus:border-blue-500/80 focus:ring-1 focus:ring-blue-500/80 resize-y`}
                      />
                      {errors[`tc_${idx}_input`] && <span className="text-xs text-rose-400">{errors[`tc_${idx}_input`]}</span>}
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-medium text-gray-400 select-none">Expected Output</label>
                      <textarea
                        value={tc.expected_output}
                        onChange={(e) => updateTestCase(idx, 'expected_output', e.target.value)}
                        placeholder='e.g. [0, 1]'
                        rows={3}
                        className={`w-full bg-[#0d0d10] border ${errors[`tc_${idx}_output`] ? 'border-rose-500/50' : 'border-dark-border'} text-xs text-gray-200 rounded-md py-2 px-3 font-mono transition-colors placeholder-gray-600 focus:border-blue-500/80 focus:ring-1 focus:ring-blue-500/80 resize-y`}
                      />
                      {errors[`tc_${idx}_output`] && <span className="text-xs text-rose-400">{errors[`tc_${idx}_output`]}</span>}
                    </div>
                  </div>
                </div>
              ))}

              <Button type="button" variant="outline" size="sm" onClick={addTestCase} className="gap-1.5">
                <Plus className="w-3.5 h-3.5" />
                Add Test Case
              </Button>
            </div>
          )}
        </div>
      )}

      {/* ─── Section: Edit-mode notice ─── */}
      {mode === 'edit' && (
        <div className="bg-amber-950/10 border border-amber-500/20 rounded-lg p-4">
          <p className="text-xs text-amber-400 flex items-center gap-2">
            <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
            Templates and test cases cannot be modified after creation. Only metadata fields (title, description, difficulty, limits, tags) can be updated.
          </p>
        </div>
      )}

      {/* ─── Actions ─── */}
      <div className="flex items-center justify-between bg-dark-panel border border-dark-border rounded-lg px-5 py-4">
        <div className="text-xs text-gray-500 select-none">
          {mode === 'create' ? 'Problem will be created as an unpublished draft.' : `Editing: ${initialData?.slug}`}
        </div>
        <div className="flex items-center gap-3">
          {onCancel && (
            <Button type="button" variant="ghost" onClick={onCancel}>
              Cancel
            </Button>
          )}
          <Button type="submit" loading={isPending} className="gap-2">
            <Save className="w-4 h-4" />
            {mode === 'create' ? 'Create Problem' : 'Save Changes'}
          </Button>
        </div>
      </div>
    </form>
  );
};
