import React, { useState, useEffect } from 'react';
import Layout from './components/Layout';
import MetricsDashboard from './components/MetricsDashboard';
import StageToggles from './components/StageToggles';
import SplitPaneEditor from './components/SplitPaneEditor';
import TemplateManager from './components/TemplateManager';
import DemoSwitcher from './components/DemoSwitcher';
import { useCompression } from './hooks/useCompression';
import { rewritePayload, fetchStats } from './utils/api';
import { Sparkles, Bookmark, Loader2, AlertCircle } from 'lucide-react';

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
  } = useCompression('');

  const [stats, setStats] = useState(null);
  const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false);
  const [isRewriting, setIsRewriting] = useState(false);
  const [rewriteStyle, setRewriteStyle] = useState('pipe_delimited');
  const [rewriteNotice, setRewriteNotice] = useState(null);

  // Load cumulative stats on mount
  useEffect(() => {
    fetchStats()
      .then((data) => setStats(data))
      .catch(() => {});
  }, [compressedData]);

  // Handle Gemini Stage 3 Rewrite
  const handleGeminiRewrite = async () => {
    if (!content.trim()) return;

    setIsRewriting(true);
    setRewriteNotice(null);

    try {
      const result = await rewritePayload({
        content,
        style: rewriteStyle,
        maxOutputTokens: 300,
      });

      // Update compressed view with Gemini rewritten prompt and metrics
      setCompressedData({
        original: result.original,
        compressed: result.rewritten,
        metrics: result.metrics,
        cache_violations: [],
        stages_applied: [`gemini_rewriter (${result.gemini_model_used})`],
      });

      if (result.was_fallback) {
        setRewriteNotice(
          'Gemini API key not configured or offline. Processed via local deterministic rule engine.'
        );
      } else {
        setRewriteNotice(`Successfully rewritten using Google Gemini (${result.gemini_model_used}).`);
      }
    } catch (err) {
      console.error('Rewrite failed:', err);
      setRewriteNotice(`Rewrite error: ${err.message}`);
    } finally {
      setIsRewriting(false);
    }
  };

  const handleLoadTemplate = (template) => {
    setContent(template.content);
    if (template.content_type) {
      setContentType(template.content_type);
    }
  };

  return (
    <Layout stats={stats}>
      <div className="space-y-4">
        {/* Action Toolbar */}
        <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-900/60 border border-slate-800 rounded-xl px-4 py-2.5">
          {/* Left: Template Library Button */}
          <button
            onClick={() => setIsTemplateModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium transition"
          >
            <Bookmark className="w-3.5 h-3.5 text-indigo-400" />
            <span>Template Library</span>
          </button>

          {/* Right: Gemini Rewrite Controls */}
          <div className="flex items-center gap-2">
            <select
              value={rewriteStyle}
              onChange={(e) => setRewriteStyle(e.target.value)}
              className="bg-slate-950 border border-slate-700/80 rounded-lg px-2.5 py-1 text-xs text-slate-300 focus:outline-none"
            >
              <option value="pipe_delimited">Pipe Delimited (Key: Val | ...)</option>
              <option value="bullet">Bullet Constraints (- Key: Val)</option>
              <option value="minimal">Minimal Semicolon</option>
            </select>

            <button
              onClick={handleGeminiRewrite}
              disabled={isRewriting || !content.trim()}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-medium text-xs shadow-md shadow-indigo-600/20 transition disabled:opacity-40"
            >
              {isRewriting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Rewriting with Gemini...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                  <span>Rewrite with Gemini</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Gemini Rewrite Notification Banner */}
        {rewriteNotice && (
          <div className="flex items-center gap-2 p-3 rounded-xl bg-indigo-950/40 border border-indigo-500/30 text-xs text-indigo-200">
            <AlertCircle className="w-4 h-4 text-indigo-400 flex-shrink-0" />
            <span>{rewriteNotice}</span>
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
          }}
        />

        {/* Telemetry Dashboard */}
        <MetricsDashboard metrics={compressedData?.metrics} />

        {/* Split Pane Editor */}
        <SplitPaneEditor
          content={content}
          setContent={setContent}
          compressedData={compressedData}
          isLoading={isLoading}
          error={error}
        />

        {/* Template Manager Modal */}
        <TemplateManager
          isOpen={isTemplateModalOpen}
          onClose={() => setIsTemplateModalOpen(false)}
          currentContent={content}
          currentType={contentType}
          onLoadTemplate={handleLoadTemplate}
        />
      </div>
    </Layout>
  );
}
