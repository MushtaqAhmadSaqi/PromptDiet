import { useState, useEffect, useCallback } from 'react';
import { useDebounce } from './useDebounce';
import { compressPayload } from '../utils/api';

export function useCompression(initialContent = '', initialContentType = 'auto') {
  const [content, setContent] = useState(initialContent);
  const [contentType, setContentType] = useState(initialContentType);
  const [stages, setStages] = useState({
    log_dedup: true,
    json_crush: true,
    cache_audit: true,
  });

  const [compressedData, setCompressedData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const debouncedContent = useDebounce(content, 300);

  const executeCompression = useCallback(
    async (textToCompress, typeToUse, activeStages) => {
      if (!textToCompress || !textToCompress.trim()) {
        setCompressedData(null);
        setError(null);
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        const response = await compressPayload({
          content: textToCompress,
          contentType: typeToUse,
          stages: activeStages,
        });
        setCompressedData(response);
      } catch (err) {
        console.error('Compression request failed:', err);
        setError(err.message || 'Compression failed');
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  // Auto-compress when debounced text, content type, or stage toggles change
  useEffect(() => {
    executeCompression(debouncedContent, contentType, stages);
  }, [debouncedContent, contentType, stages, executeCompression]);

  return {
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
    recompress: () => executeCompression(content, contentType, stages),
  };
}

