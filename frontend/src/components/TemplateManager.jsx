import React, { useState, useEffect } from 'react';
import { Bookmark, Save, Trash2, Download, Upload, X, Check, FileText } from 'lucide-react';
import { fetchTemplates, saveTemplate, deleteTemplate } from '../utils/api';
import { useLocalStorage } from '../hooks/useLocalStorage';

export default function TemplateManager({
  isOpen,
  onClose,
  currentContent,
  currentType,
  onLoadTemplate,
}) {
  const [localTemplates, setLocalTemplates] = useLocalStorage('promptdiet_templates', []);
  const [templates, setTemplates] = useState([]);
  const [templateName, setTemplateName] = useState('');
  const [templateTags, setTemplateTags] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Sync templates from backend API, falling back to localStorage
  const loadTemplates = async () => {
    try {
      const data = await fetchTemplates();
      if (data?.templates) {
        setTemplates(data.templates);
        setLocalTemplates(data.templates);
        return;
      }
    } catch {
      // Backend unreachable or offline — use localStorage
    }
    setTemplates(localTemplates);
  };

  useEffect(() => {
    if (isOpen) {
      loadTemplates();
    }
  }, [isOpen]);

  const handleSave = async (e) => {
    e.preventDefault();
    if (!templateName.trim() || !currentContent.trim()) return;

    setIsSaving(true);
    const tagsArray = templateTags
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);

    const newTemplate = {
      name: templateName.trim(),
      content: currentContent,
      content_type: currentType === 'auto' ? 'prompt' : currentType,
      tags: tagsArray,
    };

    try {
      const saved = await saveTemplate(newTemplate);
      const updated = [saved, ...templates.filter((t) => t.id !== saved.id)];
      setTemplates(updated);
      setLocalTemplates(updated);
    } catch {
      // Fallback to local storage only
      const localRecord = {
        ...newTemplate,
        id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now()),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      const updated = [localRecord, ...templates];
      setTemplates(updated);
      setLocalTemplates(updated);
    } finally {
      setIsSaving(false);
      setTemplateName('');
      setTemplateTags('');
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2000);
    }
  };

  const handleDelete = async (id) => {
    try {
      await deleteTemplate(id);
    } catch {
      // Ignored if offline
    }
    const updated = templates.filter((t) => t.id !== id);
    setTemplates(updated);
    setLocalTemplates(updated);
  };

  const handleExport = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(templates, null, 2));
    const dlAnchor = document.createElement('a');
    dlAnchor.setAttribute('href', dataStr);
    dlAnchor.setAttribute('download', 'promptdiet_templates.json');
    dlAnchor.click();
  };

  const handleImport = (e) => {
    const fileReader = new FileReader();
    if (e.target.files && e.target.files[0]) {
      fileReader.readAsText(e.target.files[0], 'UTF-8');
      fileReader.onload = (event) => {
        try {
          const parsed = JSON.parse(event.target.result);
          if (Array.isArray(parsed)) {
            const merged = [...parsed, ...templates];
            setTemplates(merged);
            setLocalTemplates(merged);
          }
        } catch (err) {
          alert('Invalid JSON templates file: ' + err.message);
        }
      };
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in duration-200">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
          <div className="flex items-center gap-2 text-slate-100 font-semibold text-base">
            <Bookmark className="w-5 h-5 text-indigo-400" />
            <span>Prompt & Log Template Library</span>
          </div>

          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {/* Save Current Content Form */}
          <form onSubmit={handleSave} className="p-4 rounded-xl bg-slate-950 border border-slate-800/80 space-y-3">
            <div className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
              <Save className="w-4 h-4 text-emerald-400" />
              <span>Save Current Editor Content as Template</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] text-slate-400 mb-1">Template Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Next.js Build Error Trace"
                  value={templateName}
                  onChange={(e) => setTemplateName(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700/80 rounded-lg px-3 py-1.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-[11px] text-slate-400 mb-1">Tags (comma-separated)</label>
                <input
                  type="text"
                  placeholder="e.g. webpack, error, ci"
                  value={templateTags}
                  onChange={(e) => setTemplateTags(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700/80 rounded-lg px-3 py-1.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            <div className="flex items-center justify-between pt-1">
              <span className="text-[11px] text-slate-500">
                {currentContent.trim() ? `${currentContent.split('\n').length} lines ready to save` : 'Editor is empty'}
              </span>

              <button
                type="submit"
                disabled={isSaving || !templateName.trim() || !currentContent.trim()}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-xs transition disabled:opacity-40"
              >
                {saveSuccess ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-white" />
                    <span>Saved!</span>
                  </>
                ) : (
                  <>
                    <Save className="w-3.5 h-3.5" />
                    <span>Save Template</span>
                  </>
                )}
              </button>
            </div>
          </form>

          {/* Saved Templates List */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Saved Templates ({templates.length})
              </span>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleExport}
                  title="Export templates as JSON"
                  className="flex items-center gap-1 px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs transition"
                >
                  <Download className="w-3 h-3 text-slate-400" />
                  <span>Export</span>
                </button>

                <label className="flex items-center gap-1 px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs transition cursor-pointer">
                  <Upload className="w-3 h-3 text-slate-400" />
                  <span>Import</span>
                  <input type="file" accept=".json" onChange={handleImport} className="hidden" />
                </label>
              </div>
            </div>

            {templates.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-500 border border-dashed border-slate-800 rounded-xl">
                No templates saved yet. Save frequently used system prompts, build logs, or tool schemas above!
              </div>
            ) : (
              <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                {templates.map((tpl) => (
                  <div
                    key={tpl.id}
                    className="flex items-center justify-between gap-3 p-3 rounded-xl bg-slate-950/60 border border-slate-800 hover:border-slate-700 transition"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <FileText className="w-3.5 h-3.5 text-indigo-400 flex-shrink-0" />
                        <span className="font-medium text-xs text-slate-200 truncate">{tpl.name}</span>
                        <span className="px-1.5 py-0.5 rounded text-[10px] uppercase font-semibold bg-slate-800 text-slate-400">
                          {tpl.content_type}
                        </span>
                      </div>

                      {tpl.tags?.length > 0 && (
                        <div className="flex items-center gap-1 mt-1">
                          {tpl.tags.map((tag, tIdx) => (
                            <span key={tIdx} className="text-[10px] text-slate-400 bg-slate-900 px-1.5 py-0.2 rounded border border-slate-800">
                              #{tag}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => {
                          onLoadTemplate(tpl);
                          onClose();
                        }}
                        className="px-2.5 py-1 rounded-md bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 text-xs font-medium transition"
                      >
                        Load
                      </button>

                      <button
                        onClick={() => handleDelete(tpl.id)}
                        className="p-1.5 rounded-md hover:bg-slate-800 text-slate-500 hover:text-rose-400 transition"
                        title="Delete template"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

