import React, { useState, useEffect, useCallback, useId } from 'react';
import Layout from './components/Layout';
import MetricsDashboard from './components/MetricsDashboard';
import StageToggles from './components/StageToggles';
import SplitPaneEditor from './components/SplitPaneEditor';
import TemplateManager from './components/TemplateManager';
import DemoSwitcher from './components/DemoSwitcher';
import KeyboardShortcutsModal from './components/KeyboardShortcutsModal';
import MotionShowcaseModal from './components/MotionShowcaseModal';
import Toast from './components/Toast';
import { useCompression } from './hooks/useCompression';
import { useToast } from './hooks/useToast';
import { rewritePayload, fetchStats } from './utils/api';
import { rewriteLocal, autoFixCacheViolations } from './utils/localEngine';
import { runViewTransition } from './utils/viewTransitions';
import { Sparkles, Bookmark, Loader2, AlertCircle, X } from 'lucide-react';

async function copyTextSafely(text) {
  if (!text) return false;
  try {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // Fall through to execCommand fallback
  }
  try {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    document.body.removeChild(ta);
    return true;
  } catch {
    return false;
  }
}

export default function App() {
  const {
    content,
    setContent,
    contentType,
    setContentType,
    stages,
    setStages,
    compressedData,
    setCompressedData,
    isLoading,
    error,
    engineMode,
  } = useCompression('');

  const { toasts, addToast, dismissToast } = useToast();

  const [stats, setStats] = useState(null);
  const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false);
  const [isShortcutsOpen, setIsShortcutsOpen] = useState(false);
  const [isMotionOpen, setIsMotionOpen] = useState(false);
  const [isZenMode, setIsZenMode] = useState(false);
  const [isRewriting, setIsRewriting] = useState(false);
  const [rewriteStyle, setRewriteStyle] = useState('pipe_delimited');
  const [rewriteNotice, setRewriteNotice] = useState(null);

  const rewriteStyleId = useId();

  // Load cumulative stats when backend compression completes
  useEffect(() => {
    if (engineMode === 'local') return;
    const controller = new AbortController();
    fetchStats(controller.signal)
      .then((data) => setStats(data))
      .catch(() => {});
    return () => controller.abort();
  }, [compressedData, engineMode]);

  // Handle Gemini Stage 3 Rewrite (with offline deterministic fallback)
  const handleGeminiRewrite = useCallback(async () => {
    if (!content.trim() || isRewriting) return;

    setIsRewriting(true);
    setRewriteNotice(null);

    try {
      const result = await rewritePayload({
        content,
        style: rewriteStyle,
        maxOutputTokens: 300,
      });

      setCompressedData({
        original: result.original,
        compressed: result.rewritten,
        metrics: result.metrics,
        cache_violations: [],
        stages_applied: [`gemini_rewriter (${result.gemini_model_used})`],
      });

      const notice = result.was_fallback
        ? 'Gemini API key not configured. Processed via local deterministic rule engine.'
        : `Successfully rewritten using Google Gemini (${result.gemini_model_used}).`;
      setRewriteNotice(notice);
      addToast({
        title: 'Prompt Rewritten',
        message: `Reduced by ${result.metrics.token_reduction_pct.toFixed(1)}%.`,
        type: 'success',
      });
    } catch {
      const localRes = rewriteLocal({ content, style: rewriteStyle });
      setCompressedData({
        original: localRes.original,
        compressed: localRes.rewritten,
        metrics: localRes.metrics,
        cache_violations: [],
        stages_applied: ['gemini_rewriter (local-deterministic-engine)'],
      });
      setRewriteNotice('Backend offline — rewritten locally with PromptDiet deterministic rule engine.');
      addToast({
        title: 'Local Rewrite Complete',
        message: `Saved ${localRes.metrics.tokens_saved} tokens (${localRes.metrics.token_reduction_pct}%).`,
        type: 'info',
      });
    } finally {
      setIsRewriting(false);
    }
  }, [content, isRewriting, rewriteStyle, setCompressedData, addToast]);

  const handleCopyOutput = useCallback(async () => {
    const text = compressedData?.compressed;
    if (!text) return;
    const ok = await copyTextSafely(text);
    if (ok) {
      addToast({
        title: 'Copied to Clipboard',
        message: `Copied ${compressedData.metrics?.compressed_tokens ?? 0} compressed tokens.`,
        type: 'success',
      });
    } else {
      addToast({ title: 'Copy Failed', message: 'Clipboard access was blocked by the browser.', type: 'error' });
    }
  }, [compressedData, addToast]);

  const handleAutoFixCache = useCallback(() => {
    const violations = compressedData?.cache_violations;
    if (!violations || violations.length === 0) return;
    const fixed = autoFixCacheViolations(content, violations);
    runViewTransition(() => {
      setContent(fixed);
    });
    addToast({
      title: 'KV-Cache Prefix Aligned',
      message: `Relocated ${violations.length} volatile variable(s) to the prompt suffix.`,
      type: 'success',
    });
  }, [content, compressedData, setContent, addToast]);

  const handleToggleZenMode = useCallback(() => {
    runViewTransition(() => setIsZenMode((prev) => !prev));
  }, []);

  const handleLoadTemplate = useCallback(
    (template) => {
      runViewTransition(() => {
        setContent(template.content);
        if (template.content_type) {
          setContentType(template.content_type);
        }
      });
      addToast({ title: 'Template Loaded', message: `Loaded "${template.name}".`, type: 'info' });
    },
    [setContent, setContentType, addToast]
  );

  // Wire up all global keyboard shortcuts
  useEffect(() => {
    const onKeyDown = (e) => {
      const mod = e.metaKey || e.ctrlKey;
      const tag = (e.target?.tagName || '').toLowerCase();
      const isTyping = tag === 'input' || tag === 'textarea' || tag === 'select';

      if (mod && e.key === 'Enter') {
        e.preventDefault();
        handleGeminiRewrite();
      } else if (mod && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsTemplateModalOpen((prev) => !prev);
      } else if (mod && e.shiftKey && e.key.toLowerCase() === 'c') {
        e.preventDefault();
        handleCopyOutput();
      } else if (mod && e.shiftKey && e.key.toLowerCase() === 'f') {
        e.preventDefault();
        handleToggleZenMode();
      } else if (!mod && !isTyping && e.key === '?') {
        e.preventDefault();
        setIsShortcutsOpen(true);
      } else if (e.key === 'Escape' && isZenMode) {
        setIsZenMode(false);
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [handleGeminiRewrite, handleCopyOutput, handleToggleZenMode, isZenMode]);

  return (
    <Layout
      stats={stats}
      engineMode={engineMode}
      onOpenShortcuts={() => setIsShortcutsOpen(true)}
      onOpenMotionPreview={() => setIsMotionOpen(true)}
    >
      <div className="space-y-4">
        {/* Action Toolbar */}
        <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-900/60 border border-slate-800 rounded-xl px-4 py-2.5">
          {/* Left: Template Library Button */}
          <button
            type="button"
            onClick={() => setIsTemplateModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
          >
            <Bookmark className="w-3.5 h-3.5 text-indigo-400" aria-hidden="true" />
            <span>Template Library</span>
            <kbd className="hidden sm:inline ml-1 px-1.5 py-0.5 text-[10px] font-mono rounded bg-slate-900 text-slate-400 border border-slate-700">
              ⌘K
            </kbd>
          </button>

          {/* Right: Gemini Rewrite Controls */}
          <div className="flex flex-wrap items-center gap-2">
            <label htmlFor={rewriteStyleId} className="sr-only">
              Rewrite output style
            </label>
            <select
              id={rewriteStyleId}
              value={rewriteStyle}
              onChange={(e) => setRewriteStyle(e.target.value)}
              className="bg-slate-950 border border-slate-700/80 rounded-lg px-2.5 py-1.5 text-xs text-slate-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 cursor-pointer"
            >
              <option value="pipe_delimited">Pipe Delimited (Key: Val | ...)</option>
              <option value="bullet">Bullet Constraints (- Key: Val)</option>
              <option value="minimal">Minimal Semicolon</option>
            </select>

            <button
              type="button"
              onClick={handleGeminiRewrite}
              disabled={isRewriting || !content.trim()}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-medium text-xs shadow-md shadow-indigo-600/20 transition disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400"
            >
              {isRewriting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden="true" />
                  <span>Rewriting with Gemini...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5 text-amber-300" aria-hidden="true" />
                  <span>Rewrite with Gemini</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Gemini Rewrite Notification Banner */}
        {rewriteNotice && (
          <div
            role="status"
            aria-live="polite"
            className="flex items-center justify-between gap-2 p-3 rounded-xl bg-indigo-950/40 border border-indigo-500/30 text-xs text-indigo-200"
          >
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-indigo-400 flex-shrink-0" aria-hidden="true" />
              <span>{rewriteNotice}</span>
            </div>
            <button
              type="button"
              onClick={() => setRewriteNotice(null)}
              aria-label="Dismiss rewrite notice"
              className="p-1 rounded hover:bg-indigo-900/50 text-indigo-300 transition"
            >
              <X className="w-3.5 h-3.5" aria-hidden="true" />
            </button>
          </div>
        )}

        {/* Pipeline Stage Toggles */}
        <StageToggles
          stages={stages}
          setStages={setStages}
          contentType={contentType}
          setContentType={setContentType}
        />

        {/* 1-Click Demo Fixtures Switcher */}
        <DemoSwitcher
          onSelectFixture={(fixture) => {
            setContent(fixture.content);
            setContentType(fixture.content_type);
            addToast({
              title: 'Demo Loaded',
              message: `Loaded "${fixture.name}" for live compression.`,
              type: 'info',
            });
          }}
        />

        {/* Telemetry Dashboard */}
        <MetricsDashboard metrics={compressedData?.metrics} engineMode={engineMode} />

        {/* Split Pane Editor with 5 Views + Zen Mode + Drag & Drop */}
        <SplitPaneEditor
          content={content}
          setContent={setContent}
          compressedData={compressedData}
          isLoading={isLoading}
          error={error}
          isZenMode={isZenMode}
          onToggleZenMode={handleToggleZenMode}
          onCopyOutput={handleCopyOutput}
          onAutoFixCache={handleAutoFixCache}
          onFileDropToast={(filename) =>
            addToast({ title: 'File Loaded', message: `Loaded "${filename}" into Raw Input.`, type: 'success' })
          }
        />

        {/* Native <dialog> Modals */}
        <TemplateManager
          isOpen={isTemplateModalOpen}
          onClose={() => setIsTemplateModalOpen(false)}
          currentContent={content}
          currentType={contentType}
          onLoadTemplate={handleLoadTemplate}
          onNotify={addToast}
        />

        <KeyboardShortcutsModal
          isOpen={isShortcutsOpen}
          onClose={() => setIsShortcutsOpen(false)}
        />

        <MotionShowcaseModal
          isOpen={isMotionOpen}
          onClose={() => setIsMotionOpen(false)}
          metrics={compressedData?.metrics}
        />

        {/* Global Toast Stack */}
        <Toast toasts={toasts} onDismiss={dismissToast} />
      </div>
    </Layout>
  );
}
