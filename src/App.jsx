import React, { useState, useEffect, useId } from 'react';
import { PRESETS } from './lib/presets';
import { analyzePromptAgainstDiff } from './lib/receiptEngine';
import { generateHunkImpactAndRestore, getActiveApiKey } from './lib/liveModel';
import {
  AlertTriangle,
  CheckCircle2,
  Copy,
  Check,
  Sparkles,
  RefreshCw,
  FileCode2,
  Terminal,
  ShieldCheck,
  KeyRound,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Receipt
} from 'lucide-react';

export default function App() {
  const [selectedPresetId, setSelectedPresetId] = useState('preset-1');
  const [promptInput, setPromptInput] = useState(PRESETS[0].prompt);
  const [diffInput, setDiffInput] = useState(PRESETS[0].diff);
  const [analysis, setAnalysis] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [copiedHunkId, setCopiedHunkId] = useState(null);
  const [showKeyModal, setShowKeyModal] = useState(false);
  const [customApiKey, setCustomApiKey] = useState('');
  const [expandedHunks, setExpandedHunks] = useState({});

  // Active API key resolution
  const activeKey = getActiveApiKey(customApiKey);
  const isKeyPresent = Boolean(activeKey);

  // Initialize with Preset 1 on initial render
  useEffect(() => {
    handleRunAnalysis(PRESETS[0].prompt, PRESETS[0].diff);
  }, []);

  const handleSelectPreset = (preset) => {
    setSelectedPresetId(preset.id);
    setPromptInput(preset.prompt);
    setDiffInput(preset.diff);
    handleRunAnalysis(preset.prompt, preset.diff);
  };

  const handleClear = () => {
    setSelectedPresetId(null);
    setPromptInput('');
    setDiffInput('');
    setAnalysis(null);
  };

  const handleRunAnalysis = async (promptToUse = promptInput, diffToUse = diffInput) => {
    setIsProcessing(true);

    // Step 1: 100% Deterministic token matching and hunk classification
    const engineResult = analyzePromptAgainstDiff(promptToUse, diffToUse);

    if (!engineResult.isValid) {
      setAnalysis(engineResult);
      setIsProcessing(false);
      return;
    }

    // Initialize hunks in state with deterministic data immediately
    const initialHunks = engineResult.hunks.map((hunk) => ({
      ...hunk,
      aiLoading: hunk.status === 'NOT_MENTIONED_IN_PROMPT',
    }));

    setAnalysis({
      ...engineResult,
      hunks: initialHunks,
    });

    // Expand all unmentioned hunks by default
    const expandedMap = {};
    initialHunks.forEach((h) => {
      expandedMap[h.id] = true;
    });
    setExpandedHunks(expandedMap);

    setIsProcessing(false);

    // Step 2: Bounded Live Model call strictly for NOT_MENTIONED_IN_PROMPT hunks
    const unmentionedHunks = initialHunks.filter(
      (h) => h.status === 'NOT_MENTIONED_IN_PROMPT'
    );

    if (unmentionedHunks.length === 0) {
      // Nothing outside prompt; no LLM call needed
      return;
    }

    // Call live model for each unmentioned hunk asynchronously
    for (const hunk of unmentionedHunks) {
      const aiResponse = await generateHunkImpactAndRestore(
        promptToUse,
        hunk,
        activeKey
      );

      setAnalysis((prev) => {
        if (!prev) return prev;
        const updatedHunks = prev.hunks.map((h) => {
          if (h.id !== hunk.id) return h;
          if (aiResponse.success) {
            return {
              ...h,
              impactSummary: aiResponse.impactSummary,
              restorePrompt: aiResponse.restorePrompt,
              modelUsed: aiResponse.modelUsed,
              aiLoading: false,
              aiError: null,
            };
          } else {
            return {
              ...h,
              aiLoading: false,
              aiError: aiResponse.error,
              impactSummary: null,
              restorePrompt: null,
            };
          }
        });
        return { ...prev, hunks: updatedHunks };
      });
    }
  };

  const handleCopyPrompt = (hunkId, promptText) => {
    if (!promptText) return;
    navigator.clipboard.writeText(promptText);
    setCopiedHunkId(hunkId);
    setTimeout(() => {
      setCopiedHunkId((curr) => (curr === hunkId ? null : curr));
    }, 2400);
  };

  const toggleHunkExpand = (hunkId) => {
    setExpandedHunks((prev) => ({
      ...prev,
      [hunkId]: !prev[hunkId],
    }));
  };

  return (
    <div className="min-h-screen bg-canvas text-ink flex flex-col font-sans">
      {/* Top Engineering Audit Ribbon */}
      <header className="border-b border-surface-border bg-surface px-4 py-3 sm:px-6 shadow-sm sticky top-0 z-30">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-md bg-ink text-surface flex items-center justify-center font-mono font-bold shadow-sm">
              <Receipt className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-bold tracking-tight text-ink">DiffStory</h1>
                <span className="text-[11px] font-mono font-semibold px-2 py-0.5 rounded bg-surface-muted text-ink-muted border border-surface-border">
                  POST-PROMPT RECEIPT
                </span>
              </div>
              <p className="text-xs text-ink-muted">
                Deterministic token matcher &middot; Bounded live LLM impact receipts
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden md:flex items-center gap-2 text-xs text-ink-muted bg-canvas px-3 py-1.5 rounded-md border border-surface-border font-mono">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>Verifiable Zero-Hallucination Classification</span>
            </div>

            <button
              onClick={() => setShowKeyModal(true)}
              className="flex items-center gap-1.5 text-xs font-mono font-medium px-3 py-1.5 rounded-md border border-surface-border bg-surface hover:bg-canvas transition-colors"
              title="Configure or inspect Gemini API key"
            >
              <KeyRound className={`w-3.5 h-3.5 ${isKeyPresent ? 'text-emerald-600' : 'text-amber-600'}`} />
              <span>{isKeyPresent ? 'Gemini 3.5 Active' : 'Configure API Key'}</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Workbench Body */}
      <main className="max-w-7xl mx-auto w-full px-4 sm:px-6 py-6 flex-1 flex flex-col lg:flex-row gap-6">
        {/* ========================================================================= */}
        {/* ZONE A: Left Input Workbench */}
        {/* ========================================================================= */}
        <section className="lg:w-5/12 flex flex-col gap-4">
          <div className="bg-surface rounded-lg border border-surface-border p-5 shadow-card flex flex-col gap-4">
            {/* Preset Selector */}
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold tracking-wider uppercase text-ink-muted font-mono">
                  Test Scenarios (Real Coding Diffs)
                </span>
                {promptInput && (
                  <button
                    onClick={handleClear}
                    className="text-xs text-ink-subtle hover:text-ink transition-colors font-mono"
                  >
                    Clear inputs
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 gap-2">
                {PRESETS.map((p) => {
                  const isSelected = selectedPresetId === p.id;
                  return (
                    <button
                      key={p.id}
                      onClick={() => handleSelectPreset(p)}
                      className={`text-left p-2.5 rounded-md border text-xs transition-all flex flex-col gap-1 ${
                        isSelected
                          ? 'border-amber-600/60 bg-amber-50/60 ring-1 ring-amber-500/30'
                          : 'border-surface-border hover:border-ink-subtle bg-canvas/60'
                      }`}
                    >
                      <div className="flex items-center justify-between font-mono font-semibold text-ink">
                        <span>{p.file}</span>
                        {isSelected && (
                          <span className="text-[10px] text-amber-700 font-bold uppercase tracking-wider bg-amber-100 px-1.5 py-0.2 rounded">
                            Loaded
                          </span>
                        )}
                      </div>
                      <div className="text-ink-muted text-[11px] line-clamp-1">{p.description}</div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Field 1: Prompt */}
            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="prompt-field"
                className="text-xs font-semibold text-ink flex items-center justify-between"
              >
                <span className="flex items-center gap-1.5">
                  <Terminal className="w-3.5 h-3.5 text-ink-muted" />
                  1. What you asked your coding agent
                </span>
                <span className="text-[11px] font-mono text-ink-subtle">Natural prompt</span>
              </label>
              <textarea
                id="prompt-field"
                rows={2}
                value={promptInput}
                onChange={(e) => {
                  setPromptInput(e.target.value);
                  setSelectedPresetId(null);
                }}
                placeholder="e.g., Change the submit button color to blue"
                className="w-full text-sm p-3 rounded-md border border-surface-border bg-canvas focus:bg-surface focus:outline-none focus:ring-2 focus:ring-ink/20 focus:border-ink transition-all resize-y text-ink"
              />
            </div>

            {/* Field 2: Unified Diff */}
            <div className="flex flex-col gap-1.5 flex-1">
              <label
                htmlFor="diff-field"
                className="text-xs font-semibold text-ink flex items-center justify-between"
              >
                <span className="flex items-center gap-1.5">
                  <FileCode2 className="w-3.5 h-3.5 text-ink-muted" />
                  2. What your coding agent changed (<code className="font-mono text-xs">git diff</code>)
                </span>
                <span className="text-[11px] font-mono text-ink-subtle">Unified format</span>
              </label>
              <textarea
                id="diff-field"
                rows={11}
                value={diffInput}
                onChange={(e) => {
                  setDiffInput(e.target.value);
                  setSelectedPresetId(null);
                }}
                placeholder={`--- a/src/App.jsx\n+++ b/src/App.jsx\n@@ -10,5 +10,4 @@\n...`}
                className="w-full text-xs font-mono p-3 rounded-md border border-surface-border bg-canvas focus:bg-surface focus:outline-none focus:ring-2 focus:ring-ink/20 focus:border-ink transition-all resize-y leading-relaxed text-ink"
                spellCheck="false"
              />
            </div>

            {/* Action Button */}
            <button
              onClick={() => handleRunAnalysis(promptInput, diffInput)}
              disabled={isProcessing}
              className="w-full py-2.5 px-4 bg-ink hover:bg-neutral-800 active:bg-neutral-900 text-surface font-semibold text-xs font-mono uppercase tracking-wider rounded-md transition-all shadow-sm flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {isProcessing ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin text-amber-400" />
                  <span>Analyzing Hunk Tokens...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 text-amber-400" />
                  <span>Generate Post-Prompt Receipt</span>
                </>
              )}
            </button>
          </div>

          {/* Educational Callout: Deterministic vs. Probabilistic Contract */}
          <div className="bg-surface/80 rounded-lg border border-surface-border p-4 text-xs flex flex-col gap-2">
            <div className="flex items-center gap-2 font-mono font-semibold text-ink">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>Architectural Verification Contract</span>
            </div>
            <p className="text-ink-muted leading-relaxed">
              <strong>Deterministic Core:</strong> Hunks are matched strictly against meaningful prompt tokens (splitting camelCase and stripping syntax boilerplate). No LLM hallucinations or guessing involved in the audit.
            </p>
            <p className="text-ink-muted leading-relaxed">
              <strong>Bounded Live AI:</strong> Only collateral hunks labeled <code className="font-mono bg-amber-100 text-amber-900 px-1 py-0.5 rounded text-[10px]">NOT MENTIONED</code> trigger a model call to write a 1-sentence impact receipt and 1-click restore prompt.
            </p>
          </div>
        </section>

        {/* ========================================================================= */}
        {/* ZONE B: Right Main Receipt Feed */}
        {/* ========================================================================= */}
        <section className="lg:w-7/12 flex flex-col gap-4">
          {/* Validation Banner if missing or invalid */}
          {analysis && !analysis.isValid && (
            <div className="bg-amber-50 border border-amber-300 rounded-lg p-5 flex flex-col gap-3">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                <div className="flex flex-col gap-1">
                  <h3 className="text-sm font-semibold text-amber-900">Valid Input Required</h3>
                  <p className="text-xs text-amber-800 leading-relaxed">{analysis.error}</p>
                </div>
              </div>
              <div>
                <button
                  onClick={() => handleSelectPreset(PRESETS[0])}
                  className="px-3 py-1.5 bg-amber-700 hover:bg-amber-800 text-white text-xs font-mono font-medium rounded transition-colors"
                >
                  Load Preset 1 (SignupForm.jsx)
                </button>
              </div>
            </div>
          )}

          {/* When valid analysis exists */}
          {analysis && analysis.isValid && (
            <>
              {/* Receipt Summary Header Bar */}
              <div className="bg-surface rounded-lg border border-surface-border p-4 shadow-card flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2 font-mono text-xs font-semibold text-ink">
                  <Receipt className="w-4 h-4 text-ink-muted" />
                  <span>
                    {analysis.summary.totalHunks} Hunk{analysis.summary.totalHunks === 1 ? '' : 's'} Analyzed
                  </span>
                </div>

                <div className="flex items-center gap-2 font-mono text-xs">
                  {analysis.summary.unmentionedCount > 0 ? (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-amber-100 text-amber-900 border border-amber-300 font-semibold text-[11px]">
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-700" />
                      {analysis.summary.unmentionedCount} NOT mentioned in prompt
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-emerald-100 text-emerald-900 border border-emerald-300 font-semibold text-[11px]">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700" />
                      0 hunks outside prompt
                    </span>
                  )}

                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-emerald-50 text-emerald-800 border border-emerald-200 text-[11px]">
                    <Check className="w-3 h-3 text-emerald-600" />
                    {analysis.summary.mentionedCount} Mentioned
                  </span>
                </div>
              </div>

              {/* Hunk Cards Feed */}
              <div className="flex flex-col gap-4">
                {analysis.hunks.map((hunk) => {
                  const isUnmentioned = hunk.status === 'NOT_MENTIONED_IN_PROMPT';
                  const isExpanded = expandedHunks[hunk.id] !== false;

                  return (
                    <article
                      key={hunk.id}
                      className={`rounded-lg border shadow-card overflow-hidden transition-all bg-surface ${
                        isUnmentioned
                          ? 'border-alert-border ring-1 ring-amber-500/20'
                          : 'border-verified-border'
                      }`}
                    >
                      {/* Card Header Strip */}
                      <div
                        className={`px-4 py-3 border-b flex flex-wrap items-center justify-between gap-2 ${
                          isUnmentioned
                            ? 'bg-alert-header border-alert-border'
                            : 'bg-verified-header border-verified-border'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <span
                            className={`px-2.5 py-1 rounded text-xs font-mono font-bold tracking-wider inline-flex items-center gap-1.5 uppercase ${
                              isUnmentioned
                                ? 'bg-alert-badge text-white'
                                : 'bg-verified-badge text-white'
                            }`}
                          >
                            {isUnmentioned ? (
                              <>
                                <AlertTriangle className="w-3.5 h-3.5" />
                                NOT MENTIONED IN YOUR PROMPT
                              </>
                            ) : (
                              <>
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                MENTIONED IN YOUR PROMPT
                              </>
                            )}
                          </span>

                          <span className="font-mono text-xs text-ink-muted">
                            {hunk.file}
                          </span>
                        </div>

                        <div className="flex items-center gap-3">
                          {/* Line Delta Badge */}
                          <div className="flex items-center gap-2 font-mono text-[11px] text-ink-muted">
                            {hunk.deletedCount > 0 && (
                              <span className="text-red-700 bg-red-100 px-1.5 py-0.5 rounded font-medium">
                                -{hunk.deletedCount} {hunk.deletedCount === 1 ? 'line' : 'lines'}
                              </span>
                            )}
                            {hunk.addedCount > 0 && (
                              <span className="text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded font-medium">
                                +{hunk.addedCount} {hunk.addedCount === 1 ? 'line' : 'lines'}
                              </span>
                            )}
                          </div>

                          <button
                            onClick={() => toggleHunkExpand(hunk.id)}
                            className="p-1 rounded hover:bg-black/5 text-ink-muted"
                            title={isExpanded ? 'Collapse diff' : 'Expand diff'}
                          >
                            {isExpanded ? (
                              <ChevronUp className="w-4 h-4" />
                            ) : (
                              <ChevronDown className="w-4 h-4" />
                            )}
                          </button>
                        </div>
                      </div>

                      {/* Card Content Area */}
                      <div className="p-4 flex flex-col gap-4">
                        {/* Literal Token Receipt (Deterministic Proof) */}
                        <div
                          className={`p-3 rounded-md border text-xs font-mono flex flex-col gap-1.5 ${
                            isUnmentioned
                              ? 'bg-amber-50/60 border-amber-200 text-amber-950'
                              : 'bg-emerald-50/60 border-emerald-200 text-emerald-950'
                          }`}
                        >
                          <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-ink-subtle">
                            <span>Deterministic Token Receipt</span>
                            <span>Verifiable match</span>
                          </div>
                          <div className="leading-relaxed font-sans text-xs">
                            {hunk.literalReceipt}
                          </div>
                        </div>

                        {/* Collapsible Diff Code View */}
                        {isExpanded && (
                          <div className="rounded-md border border-surface-border bg-ink overflow-hidden text-xs font-mono">
                            <div className="bg-neutral-800 text-neutral-300 px-3 py-1.5 text-[11px] flex items-center justify-between border-b border-neutral-700">
                              <span>{hunk.header}</span>
                              {hunk.contextLabel && (
                                <span className="text-neutral-400 truncate max-w-xs">
                                  {hunk.contextLabel}
                                </span>
                              )}
                            </div>
                            <pre className="p-2 overflow-x-auto text-[12px] leading-snug">
                              {hunk.lines.map((line, idx) => {
                                let lineClass = 'text-neutral-300';
                                let gutterClass = 'text-neutral-500 select-none';
                                let bgClass = '';

                                if (line.type === 'deleted') {
                                  bgClass = 'bg-red-950/70 border-l-2 border-red-500';
                                  lineClass = 'text-red-200';
                                  gutterClass = 'text-red-400 select-none';
                                } else if (line.type === 'added') {
                                  bgClass = 'bg-emerald-950/70 border-l-2 border-emerald-500';
                                  lineClass = 'text-emerald-200';
                                  gutterClass = 'text-emerald-400 select-none';
                                }

                                return (
                                  <div
                                    key={idx}
                                    className={`flex items-start py-0.5 px-2 ${bgClass}`}
                                  >
                                    <span className={`w-4 text-center mr-2 ${gutterClass}`}>
                                      {line.type === 'deleted'
                                        ? '-'
                                        : line.type === 'added'
                                        ? '+'
                                        : ' '}
                                    </span>
                                    <span className={`flex-1 whitespace-pre ${lineClass}`}>
                                      {line.text}
                                    </span>
                                  </div>
                                );
                              })}
                            </pre>
                          </div>
                        )}

                        {/* Live AI Section (Strictly for NOT_MENTIONED hunks) */}
                        {isUnmentioned && (
                          <div className="flex flex-col gap-3 pt-2 border-t border-surface-border">
                            {/* AI Loading State */}
                            {hunk.aiLoading && (
                              <div className="p-3.5 rounded-md bg-amber-50/70 border border-amber-200 flex items-center gap-3 text-xs text-amber-900 font-mono animate-pulse">
                                <Sparkles className="w-4 h-4 text-amber-600 animate-spin" />
                                <span>
                                  Consulting Gemini to generate 1-sentence impact &amp; restore prompt...
                                </span>
                              </div>
                            )}

                            {/* Transparent Fallback Banner if live model unavailable */}
                            {hunk.aiError && !hunk.aiLoading && (
                              <div className="p-3 rounded-md bg-neutral-100 border border-neutral-300 text-xs text-neutral-700 flex flex-col gap-1.5">
                                <div className="flex items-center gap-1.5 font-semibold text-neutral-800">
                                  <AlertTriangle className="w-3.5 h-3.5 text-neutral-600" />
                                  <span>Live model unavailable &mdash; deterministic token receipt above is complete.</span>
                                </div>
                                <p className="text-[11px] text-neutral-600">
                                  {hunk.aiError}
                                </p>
                              </div>
                            )}

                            {/* AI Impact Statement & Restore Prompt */}
                            {hunk.impactSummary && (
                              <div className="flex flex-col gap-2.5">
                                <div className="p-3 rounded-md bg-amber-50/90 border border-amber-300 flex flex-col gap-1">
                                  <div className="flex items-center gap-1.5 text-[11px] font-mono font-bold uppercase tracking-wider text-amber-800">
                                    <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                                    <span>AI Impact Statement (Unmentioned Edit)</span>
                                  </div>
                                  <p className="text-xs text-ink leading-relaxed font-medium">
                                    &ldquo;{hunk.impactSummary}&rdquo;
                                  </p>
                                </div>

                                {hunk.restorePrompt && (
                                  <div className="p-3.5 rounded-md bg-canvas border border-surface-border flex flex-col gap-2">
                                    <div className="flex items-center justify-between">
                                      <span className="text-[11px] font-mono font-semibold text-ink-muted uppercase tracking-wider">
                                        One-Click Coding Agent Restore Prompt
                                      </span>
                                      <button
                                        onClick={() =>
                                          handleCopyPrompt(hunk.id, hunk.restorePrompt)
                                        }
                                        className={`flex items-center gap-1.5 px-3 py-1 text-xs font-mono font-semibold rounded transition-all cursor-pointer ${
                                          copiedHunkId === hunk.id
                                            ? 'bg-emerald-600 text-white'
                                            : 'bg-ink text-surface hover:bg-neutral-800'
                                        }`}
                                      >
                                        {copiedHunkId === hunk.id ? (
                                          <>
                                            <Check className="w-3.5 h-3.5" />
                                            <span>Copied Receipt Prompt &check;</span>
                                          </>
                                        ) : (
                                          <>
                                            <Copy className="w-3.5 h-3.5 text-amber-400" />
                                            <span>Copy Restore Prompt</span>
                                          </>
                                        )}
                                      </button>
                                    </div>
                                    <div className="p-2.5 bg-surface rounded border border-surface-border text-xs font-mono text-ink leading-relaxed select-all">
                                      {hunk.restorePrompt}
                                    </div>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </article>
                  );
                })}
              </div>
            </>
          )}

          {/* Empty state if user cleared everything */}
          {!analysis && (
            <div className="bg-surface rounded-lg border border-dashed border-surface-border p-12 text-center flex flex-col items-center justify-center gap-3">
              <Receipt className="w-10 h-10 text-ink-subtle" />
              <h3 className="text-base font-semibold text-ink">No Diff Loaded</h3>
              <p className="text-xs text-ink-muted max-w-sm">
                Paste a prompt and unified diff, or select one of the real-world presets on the left to see the post-prompt receipt in action.
              </p>
              <button
                onClick={() => handleSelectPreset(PRESETS[0])}
                className="mt-2 px-4 py-2 bg-ink text-surface text-xs font-mono font-semibold rounded-md"
              >
                Load Preset 1 (SignupForm.jsx)
              </button>
            </div>
          )}
        </section>
      </main>

      {/* API Key Modal */}
      {showKeyModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-surface rounded-lg border border-surface-border max-w-md w-full p-6 shadow-xl flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 font-mono font-bold text-sm text-ink">
                <KeyRound className="w-4 h-4 text-amber-600" />
                <span>Gemini API Key Configuration</span>
              </div>
              <button
                onClick={() => setShowKeyModal(false)}
                className="text-ink-subtle hover:text-ink text-sm"
              >
                &times;
              </button>
            </div>

            <p className="text-xs text-ink-muted leading-relaxed">
              DiffStory uses the Google Gemini API (<code className="font-mono">gemini-3.5-flash-lite</code>) exclusively to produce bounded 1-sentence impact receipts and restore prompts for unmentioned hunks.
            </p>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="custom-api-key-input" className="text-xs font-semibold text-ink font-mono">
                API Key
              </label>
              <input
                id="custom-api-key-input"
                type="password"
                value={customApiKey}
                onChange={(e) => setCustomApiKey(e.target.value)}
                placeholder={isKeyPresent ? '•••••••••••••••• (Active)' : 'Enter Gemini API key'}
                className="w-full text-xs font-mono p-2.5 rounded border border-surface-border bg-canvas focus:bg-surface focus:outline-none focus:ring-1 focus:ring-ink"
              />
              <span className="text-[11px] text-ink-subtle">
                {isKeyPresent
                  ? 'Key detected and active.'
                  : 'No key detected. Deterministic token matching will work 100%, and transparent fallback will explain live status.'}
              </span>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-surface-border">
              <button
                onClick={() => setShowKeyModal(false)}
                className="px-4 py-2 bg-ink text-surface text-xs font-mono font-semibold rounded hover:bg-neutral-800"
              >
                Save &amp; Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="border-t border-surface-border bg-surface px-6 py-4 mt-auto text-xs text-ink-muted font-mono flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span>DiffStory</span>
          <span>&middot;</span>
          <span>Open Source (MIT)</span>
        </div>
        <div className="text-[11px] text-ink-subtle">
          Verifiable Post-Prompt Receipt for Claude Code, OpenCode, Cursor &amp; Codex
        </div>
      </footer>
    </div>
  );
}
