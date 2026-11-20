/**
 * Local-First Client-Side Fallback Compression Engine.
 * Mirrors the Python FastAPI compression pipeline (Stages 1, 2, 3, and 4)
 * so PromptDiet stays 100% interactive even when the backend is offline.
 */

const RE_ISO_TIMESTAMP = /\b\d{4}-\d{2}-\d{2}(?:[T ]\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:?\d{2})?)?\b/g;
const RE_CLOCK_TIME = /\b\d{2}:\d{2}:\d{2}(?:\.\d+)?\b/g;
const RE_BRACKET_DATE = /\[\d{2}\/[A-Za-z]{3}\/\d{4}[: ]\d{2}:\d{2}:\d{2}[^\]]*\]/g;
const RE_HEX_ADDRESS = /\b0x[0-9a-fA-F]+\b/g;
const RE_PID = /\b(?:pid|PID|process)[=:\s]*\d+\b/gi;
const RE_UUID = /\b[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}\b/g;
const RE_ERROR_HEURISTIC = /(?:\b(?:ERROR|FAIL|FAILED|FATAL|CRITICAL|Exception|Traceback)\b|(?:exit(?:ed)? with (?:code|status) [1-9]\d*)|(?:command failed with exit code)|(?:npm ERR!|ELIFECYCLE))/i;
const RE_TOKEN = /\w+|[^\w\s]+|\s+/gu;

const CACHE_PATTERNS = [
  {
    name: 'iso_timestamp',
    regex: /\b\d{4}-\d{2}-\d{2}(?:[T ]\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:?\d{2})?)?\b/g,
    suggestion: 'Dynamic ISO timestamp in prompt prefix invalidates KV-cache. Move timestamp to the prompt suffix.',
  },
  {
    name: 'uuid_v4',
    regex: /\b[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}\b/g,
    suggestion: 'Random UUID in prompt prefix invalidates KV-cache across sessions. Move session IDs to the prompt suffix.',
  },
  {
    name: 'unix_epoch',
    regex: /\b1[6-9]\d{8}(?:\d{3})?\b/g,
    suggestion: 'Unix epoch timestamp detected in prompt prefix. Move epoch values to prompt suffix.',
  },
  {
    name: 'session_or_request_id',
    regex: /\b(?:session[\s_-]?id|req(?:uest)?[\s_-]?id|trace[\s_-]?id)[=:\s]+['"]?([A-Za-z0-9_-]{8,})['"]?/gi,
    suggestion: 'Dynamic request or session ID in prefix destroys cache reuse. Relocate to suffix.',
  },
  {
    name: 'dynamic_clock_call',
    regex: /\b(?:datetime\.now\(\)|Date\.now\(\)|time\.time\(\)|new Date\(\))/g,
    suggestion: 'Dynamic time evaluation in prefix generates non-deterministic prompt headers. Relocate to suffix.',
  },
];

const DEFAULT_STRIP_KEYS = new Set([
  '$schema',
  'examples',
  'example',
  'x-readme-ref',
  'x-internal',
  'x-docs-url',
]);

const FILLER_PATTERNS = [
  [/\b(?:hello|hi|hey|greetings|dear assistant)[,!.\s]*/gi, ''],
  [/\b(?:please\s+(?:make\s+sure\s+to\s+)?|kindly\s+|be\s+sure\s+to\s+)/gi, ''],
  [/\b(?:i\s+would\s+like\s+you\s+to\s+|i\s+want\s+you\s+to\s+|you\s+must\s+always\s+|you\s+should\s+)/gi, ''],
  [/\b(?:do\s+not\s+|never\s+)/gi, 'Omit: '],
  [/\b(?:always\s+respond\s+in\s+|format\s+(?:your\s+response\s+as\s+)?|output\s+as\s+)/gi, 'Format: '],
];

export function estimateTokens(text) {
  if (!text) return 0;
  const matches = text.match(RE_TOKEN);
  return matches ? matches.length : Math.max(1, Math.floor(text.length / 4));
}

export function autoDetectContentType(text) {
  const stripped = text.trim();
  if ((stripped.startsWith('{') && stripped.endsWith('}')) || (stripped.startsWith('[') && stripped.endsWith(']'))) {
    return 'json';
  }
  if (/(?:INFO|ERROR|WARN|DEBUG|Traceback|Exception)/.test(text)) {
    return 'log';
  }
  return 'prompt';
}

function normalizeLogLine(line) {
  return line
    .replace(RE_ISO_TIMESTAMP, '<TIMESTAMP>')
    .replace(RE_BRACKET_DATE, '<TIMESTAMP>')
    .replace(RE_CLOCK_TIME, '<TIME>')
    .replace(RE_HEX_ADDRESS, '<HEX_ADDR>')
    .replace(RE_PID, '<PID>')
    .replace(RE_UUID, '<UUID>')
    .trim();
}

function deduplicateLogLocal(rawLog, contextLines = 3) {
  const lines = rawLog.split('\n');
  if (lines.length <= 1) return rawLog;

  const output = [];
  const contextBuf = [];
  let prevSig = null;
  let repeatCount = 0;

  const flushRepeats = () => {
    if (repeatCount > 0) {
      output.push(`[previous line repeated ${repeatCount} times]`);
      repeatCount = 0;
    }
  };

  for (const line of lines) {
    const isErr = RE_ERROR_HEURISTIC.test(line);
    if (isErr) {
      flushRepeats();
      for (const ctx of contextBuf) {
        if (output[output.length - 1] !== ctx) {
          output.push(ctx);
        }
      }
      contextBuf.length = 0;
      output.push(line);
      prevSig = null;
      continue;
    }

    const sig = normalizeLogLine(line);
    if (sig === prevSig && sig !== '') {
      repeatCount += 1;
    } else {
      flushRepeats();
      output.push(line);
      prevSig = sig;
    }

    contextBuf.push(line);
    if (contextBuf.length > contextLines) {
      contextBuf.shift();
    }
  }
  flushRepeats();
  return output.join('\n');
}

function stripBoilerplate(node) {
  if (Array.isArray(node)) {
    return node.map(stripBoilerplate);
  }
  if (node && typeof node === 'object') {
    const cleaned = {};
    for (const [k, v] of Object.entries(node)) {
      if (DEFAULT_STRIP_KEYS.has(k) || k.startsWith('x-')) continue;
      cleaned[k] = stripBoilerplate(v);
    }
    return cleaned;
  }
  return node;
}

function deduplicateArrays(node) {
  if (Array.isArray(node)) {
    const processed = node.map(deduplicateArrays);
    const collapsed = [];
    for (let i = 0; i < processed.length; i++) {
      const item = processed[i];
      const serialized = JSON.stringify(item);
      let count = 1;
      while (i + 1 < processed.length && JSON.stringify(processed[i + 1]) === serialized) {
        count += 1;
        i += 1;
      }
      if (count > 1 && item && typeof item === 'object' && !Array.isArray(item)) {
        collapsed.push({ ...item, __repeated: count });
      } else if (count > 1) {
        collapsed.push(item, `[repeated ${count - 1} more times]`);
      } else {
        collapsed.push(item);
      }
    }
    return collapsed;
  }
  if (node && typeof node === 'object') {
    const out = {};
    for (const [k, v] of Object.entries(node)) {
      out[k] = deduplicateArrays(v);
    }
    return out;
  }
  return node;
}

function auditCachePrefixLocal(prompt, prefixRatio = 0.2, maxPrefixLines = 50) {
  if (!prompt || !prompt.trim()) return [];
  const lines = prompt.split('\n');
  const totalLines = lines.length;
  const calc = Math.floor(totalLines * prefixRatio);
  const prefixCount = Math.min(Math.max(calc, Math.min(5, totalLines)), maxPrefixLines);
  const violations = [];

  for (let i = 0; i < prefixCount; i++) {
    const line = lines[i];
    for (const pat of CACHE_PATTERNS) {
      pat.regex.lastIndex = 0;
      let m;
      while ((m = pat.regex.exec(line)) !== null) {
        violations.push({
          line_number: i + 1,
          column: m.index + 1,
          matched_text: m[0],
          pattern_name: pat.name,
          suggestion: pat.suggestion,
        });
      }
    }
  }
  return violations;
}

/**
 * Relocates lines with KV-cache prefix violations to a clean Dynamic Context Suffix block.
 */
export function autoFixCacheViolations(prompt, violations) {
  if (!prompt || !violations || violations.length === 0) return prompt;
  const badLines = new Set(violations.map((v) => v.line_number - 1));
  const lines = prompt.split('\n');
  const staticPrefix = [];
  const relocated = [];

  lines.forEach((line, idx) => {
    if (badLines.has(idx)) {
      relocated.push(line);
    } else {
      staticPrefix.push(line);
    }
  });

  if (relocated.length === 0) return prompt;
  return `${staticPrefix.join('\n').trimEnd()}\n\n# --- Dynamic Runtime Context (Suffix for KV-Cache Alignment) ---\n${relocated.join('\n')}`;
}

export function compressLocal({ content, contentType = 'auto', stages = {} }) {
  const start = performance.now();
  const resolved = contentType === 'auto' ? autoDetectContentType(content) : contentType;
  let current = content;
  const stagesApplied = [];
  let violations = [];

  if ((stages.log_dedup ?? true) && (resolved === 'log' || resolved === 'auto')) {
    const deduped = deduplicateLogLocal(current, 3);
    if (deduped !== current) {
      current = deduped;
      stagesApplied.push('log_deduplicator');
    }
  }

  if ((stages.json_crush ?? true) && (resolved === 'json' || resolved === 'auto')) {
    try {
      const parsed = JSON.parse(current);
      const crushed = deduplicateArrays(stripBoilerplate(parsed));
      current = JSON.stringify(crushed);
      stagesApplied.push('json_crusher');
    } catch {
      // Not valid JSON
    }
  }

  if ((stages.cache_audit ?? true) && (resolved === 'prompt' || resolved === 'auto')) {
    violations = auditCachePrefixLocal(content);
    if (violations.length > 0) {
      stagesApplied.push('cache_aligner');
    }
  }

  const originalTokens = estimateTokens(content);
  const compressedTokens = estimateTokens(current);
  const tokensSaved = Math.max(0, originalTokens - compressedTokens);
  const reductionPct = originalTokens > 0 ? Number(((tokensSaved / originalTokens) * 100).toFixed(1)) : 0;
  const latencyMs = Number((performance.now() - start).toFixed(2));

  return {
    original: content,
    compressed: current,
    metrics: {
      original_chars: content.length,
      compressed_chars: current.length,
      original_tokens: originalTokens,
      compressed_tokens: compressedTokens,
      tokens_saved: tokensSaved,
      token_reduction_pct: reductionPct,
      estimated_cost_saved_usd: Number(((tokensSaved / 1_000_000) * 2.5).toFixed(6)),
      processing_time_ms: latencyMs,
      gemini_token_estimate: Math.ceil(current.length / 4),
    },
    cache_violations: violations,
    stages_applied: stagesApplied,
    _offline: true,
  };
}

export function rewriteLocal({ content, style = 'pipe_delimited' }) {
  const start = performance.now();
  let cleaned = content;
  for (const [pattern, replacement] of FILLER_PATTERNS) {
    cleaned = cleaned.replace(pattern, replacement);
  }
  const parts = cleaned
    .split(/[;\n.]+/)
    .map((p) => p.trim())
    .filter(Boolean);

  let rewritten = content;
  if (parts.length > 0) {
    if (style === 'bullet') rewritten = parts.map((p) => `- ${p}`).join('\n');
    else if (style === 'minimal') rewritten = parts.join('; ');
    else rewritten = parts.join(' | ');
  }

  const originalTokens = estimateTokens(content);
  const compressedTokens = estimateTokens(rewritten);
  const tokensSaved = Math.max(0, originalTokens - compressedTokens);
  const reductionPct = originalTokens > 0 ? Number(((tokensSaved / originalTokens) * 100).toFixed(1)) : 0;

  return {
    original: content,
    rewritten,
    metrics: {
      original_chars: content.length,
      compressed_chars: rewritten.length,
      original_tokens: originalTokens,
      compressed_tokens: compressedTokens,
      tokens_saved: tokensSaved,
      token_reduction_pct: reductionPct,
      estimated_cost_saved_usd: Number(((tokensSaved / 1_000_000) * 2.5).toFixed(6)),
      processing_time_ms: Number((performance.now() - start).toFixed(2)),
      gemini_token_estimate: Math.ceil(rewritten.length / 4),
    },
    gemini_model_used: 'local-deterministic-engine',
    was_fallback: true,
  };
}

export const FALLBACK_FIXTURES = [
  {
    id: 'build-log',
    name: 'Webpack & Jest Build Log',
    description: 'Compacts repetitive compilation logs while isolating buried stack traces.',
    content_type: 'log',
    content: [
      '2026-11-20T14:01:01.100Z INFO  [webpack] Compiling module src/components/Button.tsx (pid=4821)',
      ...Array.from({ length: 42 }, (_, i) => `2026-11-20T14:01:01.${110 + i}Z INFO  [webpack] Resolving chunk dependency 0x7f8a1c${(i + 10).toString(16)} (pid=4821)`),
      '2026-11-20T14:01:02.001Z WARN  [eslint] Unused variable "legacyCache" in src/hooks/useCompression.js',
      ...Array.from({ length: 28 }, (_, i) => `2026-11-20T14:01:02.${100 + i}Z DEBUG [jest] Worker pool heartbeat ok (pid=4821)`),
      '2026-11-20T14:01:03.410Z INFO  [jest] Running suite: tests/compression.spec.ts',
      '2026-11-20T14:01:03.422Z ERROR TypeError: Cannot read properties of undefined (reading "tokens_saved")',
      '    at MetricsDashboard (src/components/MetricsDashboard.jsx:20:28)',
      '    at renderWithHooks (node_modules/react-dom/cjs/react-dom.development.js:15486:18)',
      '2026-11-20T14:01:03.430Z FAIL  tests/compression.spec.ts — Command failed with exit code 1',
      ...Array.from({ length: 24 }, (_, i) => `2026-11-20T14:01:04.${100 + i}Z INFO  [cleanup] Releasing temporary worker socket 0x9b2d${(i + 10).toString(16)}`),
    ].join('\n'),
  },
  {
    id: 'mcp-schema',
    name: 'MCP Tool Schema (JSON)',
    description: 'Minifies whitespace, strips $schema/examples/x-* boilerplate, and collapses repeated items.',
    content_type: 'json',
    content: JSON.stringify(
      {
        $schema: 'https://json-schema.org/draft/2020-12/schema',
        'x-internal': true,
        'x-docs-url': 'https://docs.internal.dev/mcp',
        tools: [
          {
            name: 'query_database',
            description: 'Execute a read-only SQL query against the analytics warehouse.',
            examples: [{ sql: 'SELECT count(*) FROM events' }],
            'x-readme-ref': 'db-query-v2',
            parameters: { type: 'object', properties: { sql: { type: 'string' }, limit: { type: 'integer' } }, required: ['sql'] },
          },
          {
            name: 'fetch_metrics_shard',
            description: 'Fetch telemetry shard',
            parameters: { type: 'object', properties: { shard_id: { type: 'string' } } },
          },
          {
            name: 'fetch_metrics_shard',
            description: 'Fetch telemetry shard',
            parameters: { type: 'object', properties: { shard_id: { type: 'string' } } },
          },
          {
            name: 'fetch_metrics_shard',
            description: 'Fetch telemetry shard',
            parameters: { type: 'object', properties: { shard_id: { type: 'string' } } },
          },
          {
            name: 'fetch_metrics_shard',
            description: 'Fetch telemetry shard',
            parameters: { type: 'object', properties: { shard_id: { type: 'string' } } },
          },
        ],
      },
      null,
      2
    ),
  },
  {
    id: 'cache-busting-prompt',
    name: 'System Prompt (Cache Audit)',
    description: 'Audits prompt prefix for volatile variables (UUID, timestamp, session_id) that bust KV-cache.',
    content_type: 'prompt',
    content: [
      'Current Date: 2026-11-20T21:03:55Z',
      'Session ID: session_id=req_98a7f6c5d4e3b2a1',
      'Trace UUID: 550e8400-e29b-41d4-a716-446655440000',
      'Hello assistant! Please make sure to always respond in concise bullet points.',
      'I would like you to never include polite greetings or introductory filler like Sure thing.',
      'Kindly ensure all code examples are strictly typed and production ready.',
      'You must always verify edge cases and explain complexity in O(N) terms.',
      'Please make sure to keep your response under 150 words.',
    ].join('\n'),
  },
];
