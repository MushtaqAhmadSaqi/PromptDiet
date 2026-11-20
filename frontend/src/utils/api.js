const API_BASE = import.meta.env.VITE_API_URL || '';

async function parseError(resp, fallbackMessage) {
  try {
    const text = await resp.text();
    return text ? `${fallbackMessage} (${resp.status}): ${text}` : `${fallbackMessage} (${resp.status})`;
  } catch {
    return `${fallbackMessage} (${resp.status})`;
  }
}

export async function compressPayload({ content, contentType = 'auto', stages, signal }) {
  const resp = await fetch(`${API_BASE}/api/compress`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    signal,
    body: JSON.stringify({
      content,
      content_type: contentType,
      stages: {
        log_dedup: stages?.log_dedup ?? true,
        json_crush: stages?.json_crush ?? true,
        cache_audit: stages?.cache_audit ?? true,
      },
    }),
  });
  if (!resp.ok) {
    throw new Error(await parseError(resp, 'Compression failed'));
  }
  return resp.json();
}

export async function rewritePayload({ content, style = 'pipe_delimited', maxOutputTokens = 300, signal }) {
  const resp = await fetch(`${API_BASE}/api/rewrite`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    signal,
    body: JSON.stringify({
      content,
      style,
      max_output_tokens: maxOutputTokens,
    }),
  });
  if (!resp.ok) {
    throw new Error(await parseError(resp, 'Rewrite failed'));
  }
  return resp.json();
}

export async function fetchFixtures(signal) {
  const resp = await fetch(`${API_BASE}/api/fixtures`, { signal });
  if (!resp.ok) throw new Error('Failed to load demo fixtures');
  return resp.json();
}

export async function fetchStats(signal) {
  const resp = await fetch(`${API_BASE}/api/stats`, { signal });
  if (!resp.ok) throw new Error('Failed to load cumulative stats');
  return resp.json();
}

export async function fetchTemplates(signal) {
  const resp = await fetch(`${API_BASE}/api/templates`, { signal });
  if (!resp.ok) throw new Error('Failed to load templates');
  return resp.json();
}

export async function saveTemplate(template) {
  const resp = await fetch(`${API_BASE}/api/templates`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(template),
  });
  if (!resp.ok) throw new Error('Failed to save template');
  return resp.json();
}

export async function deleteTemplate(id) {
  const resp = await fetch(`${API_BASE}/api/templates/${encodeURIComponent(id)}`, {
    method: 'DELETE',
  });
  if (!resp.ok) throw new Error('Failed to delete template');
  return resp.json();
}
