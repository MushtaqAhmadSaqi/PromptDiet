import React, { useState } from 'react';
import Layout from './components/Layout';
import MetricsDashboard from './components/MetricsDashboard';
import StageToggles from './components/StageToggles';

export default function App() {
  const [contentType, setContentType] = useState('auto');
  const [stages, setStages] = useState({
    log_dedup: true,
    json_crush: true,
    cache_audit: true,
  });

  const [metrics, setMetrics] = useState({
    original_tokens: 0,
    compressed_tokens: 0,
    tokens_saved: 0,
    token_reduction_pct: 0.0,
    estimated_cost_saved_usd: 0.0,
    processing_time_ms: 0.0,
  });

  return (
    <Layout stats={{ total_tokens_saved: 0 }}>
      <div className="space-y-4">
        <StageToggles
          stages={stages}
          setStages={setStages}
          contentType={contentType}
          setContentType={setContentType}
        />
        <MetricsDashboard metrics={metrics} />
      </div>
    </Layout>
  );
}

