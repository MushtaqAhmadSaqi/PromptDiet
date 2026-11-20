import { useState, useEffect, useCallback, useRef } from 'react';
import { useDebounce } from './useDebounce';
import { compressPayload } from '../utils/api';
import { compressLocal } from '../utils/localEngine';

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
  const [engineMode, setEngineMode] = useState('fastapi'); // 'fastapi' | 'local'

  const abortControllerRef = useRef(null);
  const debouncedContent = useDebounce(content, 250);

  const executeCompression = useCallback(async (textToCompress, typeToUse, activeStages) => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    if (!textToCompress || !textToCompress.trim()) {
      setCompressedData(null);
      setError(null);
      setIsLoading(false);
      return;
    }

    const controller = new AbortController();
    abortControllerRef.current = controller;

    setIsLoading(true);
    setError(null);

    try {
      const response = await compressPayload({
        content: textToCompress,
        contentType: typeToUse,
        stages: activeStages,
        signal: controller.signal,
      });
      if (!controller.signal.aborted) {
        setCompressedData(response);
        setEngineMode('fastapi');
      }
    } catch (err) {
      if (err?.name === 'AbortError' || controller.signal.aborted) {
        return;
      }
      // Graceful local-first fallback when FastAPI backend is offline
      const localResult = compressLocal({
        content: textToCompress,
        contentType: typeToUse,
        stages: activeStages,
      });
      setCompressedData(localResult);
      setEngineMode('local');
      setError(null);
    } finally {
      if (!controller.signal.aborted) {
        setIsLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    executeCompression(debouncedContent, contentType, stages);
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [debouncedContent, contentType, stages, executeCompression]);

  const recompress = useCallback(() => {
    executeCompression(content, contentType, stages);
  }, [content, contentType, stages, executeCompression]);

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
    engineMode,
    recompress,
  };
}
