import React from 'react';
import { Composition } from 'remotion';
import { PromptDietShowcase, PromptDietShowcaseProps } from './scenes/PromptDietShowcase';

export const RemotionRoot: React.FC = () => {
  return (
    <Composition<PromptDietShowcaseProps>
      id="PromptDietShowcase"
      component={PromptDietShowcase}
      durationInFrames={180}
      fps={30}
      width={1920}
      height={1080}
      defaultProps={{
        originalTokens: 4820,
        compressedTokens: 612,
        reductionPct: 87.3,
        tagline: 'Deterministic O(N) Context Compression & KV-Cache Alignment',
      }}
    />
  );
};
