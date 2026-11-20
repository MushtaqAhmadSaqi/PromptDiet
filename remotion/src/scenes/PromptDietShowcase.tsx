import React from 'react';
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import { THEME } from '../theme';

export interface PromptDietShowcaseProps {
  originalTokens: number;
  compressedTokens: number;
  reductionPct: number;
  tagline: string;
}

const STAGES = [
  { label: 'Stage 1', title: 'Log Deduplicator', stat: '-96% lines' },
  { label: 'Stage 2', title: 'MCP JSON Crusher', stat: '-54% bytes' },
  { label: 'Stage 3', title: 'Gemini Rewriter', stat: 'Dense Specs' },
  { label: 'Stage 4', title: 'KV-Cache Aligner', stat: '100% Hits' },
];

export const PromptDietShowcase: React.FC<PromptDietShowcaseProps> = ({
  originalTokens,
  compressedTokens,
  reductionPct,
  tagline,
}) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();

  // Exit faster than entrance (~10 frames)
  const exitFrames = Math.round(fps * 0.35);
  const exitOpacity = interpolate(
    frame,
    [durationInFrames - exitFrames, durationInFrames],
    [1, 0],
    { easing: THEME.easings.outCubic, extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
  );

  // Spring-driven entrances (opacity + translateY + scale together)
  const badgeSpring = spring({ frame, fps, config: THEME.springs.snappy });
  const titleSpring = spring({ frame: frame - 5, fps, config: THEME.springs.snappy });
  const subSpring = spring({ frame: frame - 12, fps, config: THEME.springs.smooth });

  // Eased counter progress (never linear)
  const counterProgress = interpolate(frame, [Math.round(fps * 0.5), Math.round(fps * 1.9)], [0, 1], {
    easing: THEME.easings.outCubic,
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  // Subtle breathing idle motion for elements on screen > 2s
  const breatheY = Math.sin((frame / fps) * Math.PI * 1.2) * 5;
  const meshScale = 1 + Math.sin((frame / fps) * 0.9) * 0.035;

  const displayedPct = (reductionPct * counterProgress).toFixed(1);
  const displayedSaved = Math.round((originalTokens - compressedTokens) * counterProgress);

  return (
    <AbsoluteFill style={{ backgroundColor: THEME.colors.bg, fontFamily: THEME.fonts.display }}>
      {/* Layer 1: Animated Mesh Background */}
      <AbsoluteFill
        style={{
          background:
            'radial-gradient(circle at 22% 28%, rgba(99,102,241,0.32), transparent 48%), radial-gradient(circle at 78% 74%, rgba(16,185,129,0.22), transparent 48%), #020617',
          transform: `scale(${meshScale})`,
        }}
      />

      {/* Layer 2 & 3: Graphics + Typography */}
      <AbsoluteFill
        style={{
          opacity: exitOpacity,
          justifyContent: 'center',
          alignItems: 'center',
          padding: 96,
          gap: 28,
        }}
      >
        <div
          style={{
            opacity: badgeSpring,
            transform: `translateY(${(1 - badgeSpring) * 28}px) scale(${0.92 + badgeSpring * 0.08})`,
            padding: '10px 24px',
            borderRadius: 999,
            border: `1px solid ${THEME.colors.hero}`,
            backgroundColor: 'rgba(99,102,241,0.16)',
            color: '#c7d2fe',
            fontSize: 22,
            fontWeight: 700,
            letterSpacing: 3,
            textTransform: 'uppercase',
          }}
        >
          PromptDiet · Local-First Compressor
        </div>

        <div
          style={{
            opacity: titleSpring,
            transform: `translateY(${(1 - titleSpring) * 40 + breatheY}px) scale(${0.94 + titleSpring * 0.06})`,
            fontSize: 112,
            fontWeight: 800,
            color: THEME.colors.text,
            letterSpacing: -3,
            lineHeight: 1.05,
            fontVariantNumeric: 'tabular-nums',
            textAlign: 'center',
          }}
        >
          -{displayedPct}% <span style={{ color: THEME.colors.hero }}>Token Bloat</span>
        </div>

        <div
          style={{
            opacity: subSpring,
            transform: `translateY(${(1 - subSpring) * 20}px)`,
            fontSize: 30,
            color: THEME.colors.muted,
            textAlign: 'center',
            maxWidth: 1100,
          }}
        >
          {tagline} · <strong style={{ color: THEME.colors.accent }}>{displayedSaved.toLocaleString()} tokens pruned</strong>
        </div>

        {/* Staggered 4-Stage Pipeline Cards (5-frame offsets) */}
        <div style={{ display: 'flex', gap: 24, marginTop: 28, width: '100%', maxWidth: 1440 }}>
          {STAGES.map((stage, idx) => {
            const cardSpring = spring({
              frame: frame - (Math.round(fps * 0.9) + idx * 5),
              fps,
              config: THEME.springs.snappy,
            });
            return (
              <div
                key={stage.label}
                style={{
                  flex: 1,
                  opacity: cardSpring,
                  transform: `translateY(${(1 - cardSpring) * 32}px) scale(${0.92 + cardSpring * 0.08})`,
                  backgroundColor: 'rgba(15, 23, 42, 0.85)',
                  border: `1px solid ${THEME.colors.border}`,
                  borderRadius: 20,
                  padding: '26px 28px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 10,
                }}
              >
                <span style={{ fontSize: 18, fontWeight: 700, color: THEME.colors.hero, textTransform: 'uppercase' }}>
                  {stage.label}
                </span>
                <span style={{ fontSize: 28, fontWeight: 700, color: THEME.colors.text }}>{stage.title}</span>
                <span
                  style={{
                    fontSize: 22,
                    fontFamily: THEME.fonts.mono,
                    color: THEME.colors.accent,
                    fontWeight: 600,
                  }}
                >
                  {stage.stat}
                </span>
              </div>
            );
          })}
        </div>
      </AbsoluteFill>

      {/* Layer 4: Subtle Color Grade */}
      <AbsoluteFill
        style={{
          pointerEvents: 'none',
          background: 'linear-gradient(180deg, rgba(99,102,241,0.06) 0%, transparent 45%, rgba(2,6,23,0.28) 100%)',
        }}
      />

      {/* Layer 5: Vignette Overlay */}
      <AbsoluteFill
        style={{
          pointerEvents: 'none',
          background: 'radial-gradient(ellipse at center, transparent 58%, rgba(2,6,23,0.72) 100%)',
        }}
      />
    </AbsoluteFill>
  );
};
