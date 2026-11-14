const API_BASE = import.meta.env.VITE_API_URL || '';

export async function compressPayload({ content, contentType = 'auto', stages }) {
  const resp = await fetch(`${API_BASE}/api/compress`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
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
    const errorText = await resp.text();
    throw new Error(`Compression failed (${resp.status}): ${errorText}`);
  }
  return resp.json();
}

export async function rewritePayload({ content, style = 'pipe_delimited', maxOutputTokens = 300 }) {
  const resp = await fetch(`${API_BASE}/api/rewrite`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      content,
      style,
      max_output_tokens: maxOutputTokens,
    }),
  });
  if (!resp.ok) {
    const errorText = await resp.text();
    throw new Error(`Rewrite failed (${resp.status}): ${errorText}`);
  }
  return resp.json();
}

export async function fetchFixtures() {
  const resp = await fetch(`${API_BASE}/api/fixtures`);
  if (!resp.ok) throw new Error('Failed to load demo fixtures');
  return resp.json();
}

export async function fetchStats() {
  const resp = await fetch(`${API_BASE}/api/stats`);
  if (!resp.ok) throw new Error('Failed to load cumulative stats');
  return resp.json();
}

export async function fetchTemplates() {
  const resp = await fetch(`${API_BASE}/api/templates`);
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
  const resp = await fetch(`${API_BASE}/api/templates/${id}`, {
    method: 'DELETE',
  });
  if (!resp.ok) throw new Error('Failed to delete template');
  return resp.json();
}

