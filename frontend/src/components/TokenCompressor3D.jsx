import React, { useEffect, useRef, useState, memo } from 'react';
import { Box, RotateCcw } from 'lucide-react';

/**
 * Interactive 3D Token Compression Visualizer.
 * Uses Three.js (WebGLRenderer + InstancedMesh) when installed, with a high-craft
 * 3D perspective Canvas fallback so it renders smoothly in all environments.
 * Respects `prefers-reduced-motion: reduce`, caps DPR at 2, and cleans up all GPU resources on unmount.
 */
const TokenCompressor3D = memo(function TokenCompressor3D({ metrics }) {
  const containerRef = useRef(null);
  const canvasRef = useRef(null);
  const [rendererKind, setRendererKind] = useState('3d');
  const [squeezeOverride, setSqueezeOverride] = useState(null);

  const originalTokens = metrics?.original_tokens ?? 120;
  const compressedTokens = metrics?.compressed_tokens ?? 36;
  const reductionPct = metrics?.token_reduction_pct ?? 70;
  const effectiveCompression = squeezeOverride !== null ? squeezeOverride : Math.min(95, Math.max(0, reductionPct));

  useEffect(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return;

    const prefersReducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    let disposed = false;
    let rafId = null;
    let cleanupThree = null;

    // Shared interactive orbit state
    const orbit = { rotX: 0.35, rotY: 0.6, dragging: false, lastX: 0, lastY: 0 };

    const onPointerDown = (e) => {
      orbit.dragging = true;
      orbit.lastX = e.clientX;
      orbit.lastY = e.clientY;
    };
    const onPointerMove = (e) => {
      if (!orbit.dragging) return;
      orbit.rotY += (e.clientX - orbit.lastX) * 0.008;
      orbit.rotX = Math.max(-1.2, Math.min(1.2, orbit.rotX + (e.clientY - orbit.lastY) * 0.008));
      orbit.lastX = e.clientX;
      orbit.lastY = e.clientY;
    };
    const onPointerUp = () => {
      orbit.dragging = false;
    };

    canvas.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);

    // Build deterministic token particle coordinates
    const PARTICLE_COUNT = 160;
    const retainedCount = Math.max(8, Math.round(PARTICLE_COUNT * (1 - effectiveCompression / 100)));
    const particles = Array.from({ length: PARTICLE_COUNT }, (_, i) => {
      const phi = Math.acos(1 - (2 * (i + 0.5)) / PARTICLE_COUNT);
      const theta = Math.PI * (1 + Math.sqrt(5)) * i;
      const radiusOuter = 1.9 + ((i * 17) % 10) * 0.09;
      const radiusInner = 0.65 + ((i * 13) % 7) * 0.05;
      return {
        isRetained: i < retainedCount,
        ox: Math.sin(phi) * Math.cos(theta) * radiusOuter,
        oy: Math.cos(phi) * radiusOuter,
        oz: Math.sin(phi) * Math.sin(theta) * radiusOuter,
        ix: Math.sin(phi) * Math.cos(theta) * radiusInner,
        iy: Math.cos(phi) * radiusInner,
        iz: Math.sin(phi) * Math.sin(theta) * radiusInner,
      };
    });

    const startCanvasFallback = () => {
      setRendererKind('canvas-3d');
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const resize = () => {
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        const w = container.clientWidth || 400;
        const h = container.clientHeight || 360;
        canvas.width = Math.floor(w * dpr);
        canvas.height = Math.floor(h * dpr);
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      };
      resize();
      const ro = new ResizeObserver(resize);
      ro.observe(container);

      const renderFrame = (time) => {
        if (disposed) return;
        const w = container.clientWidth || 400;
        const h = container.clientHeight || 360;
        const t = time * 0.0005;
        if (!orbit.dragging && !prefersReducedMotion) {
          orbit.rotY += 0.004;
        }

        ctx.clearRect(0, 0, w, h);

        // Subtle radial background glow
        const grad = ctx.createRadialGradient(w / 2, h / 2, 10, w / 2, h / 2, Math.min(w, h) * 0.55);
        grad.addColorStop(0, 'rgba(99, 102, 241, 0.16)');
        grad.addColorStop(0.6, 'rgba(16, 185, 129, 0.05)');
        grad.addColorStop(1, 'rgba(2, 6, 23, 0)');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, w, h);

        const factor = effectiveCompression / 100;
        const cosY = Math.cos(orbit.rotY);
        const sinY = Math.sin(orbit.rotY);
        const cosX = Math.cos(orbit.rotX);
        const sinX = Math.sin(orbit.rotX);
        const fov = Math.min(w, h) * 0.72;

        const projected = particles.map((p, idx) => {
          const breathe = prefersReducedMotion ? 0 : Math.sin(t * 2 + idx * 0.25) * 0.04;
          const x0 = p.isRetained ? p.ox + (p.ix - p.ox) * factor : p.ox * (1 + factor * 0.35);
          const y0 = p.isRetained ? p.oy + (p.iy - p.oy) * factor : p.oy * (1 + factor * 0.35);
          const z0 = p.isRetained ? p.oz + (p.iz - p.oz) * factor : p.oz * (1 + factor * 0.35);

          const x1 = (x0 + breathe) * cosY - z0 * sinY;
          const z1 = (x0 + breathe) * sinY + z0 * cosY;
          const y2 = y0 * cosX - z1 * sinX;
          const z2 = y0 * sinX + z1 * cosX + 5.2;

          const scale = fov / Math.max(0.5, z2);
          return {
            sx: w / 2 + x1 * scale,
            sy: h / 2 + y2 * scale,
            z: z2,
            size: (p.isRetained ? 4.4 : 2.5) * (scale / (fov / 5.2)),
            isRetained: p.isRetained,
          };
        });

        projected.sort((a, b) => b.z - a.z);

        for (const pt of projected) {
          const alpha = pt.isRetained ? 0.92 : Math.max(0.12, 0.45 - factor * 0.32);
          ctx.fillStyle = pt.isRetained
            ? `rgba(99, 102, 241, ${alpha})`
            : `rgba(16, 185, 129, ${alpha})`;
          ctx.beginPath();
          ctx.roundRect(pt.sx - pt.size / 2, pt.sy - pt.size / 2, pt.size, pt.size, 1.5);
          ctx.fill();
        }

        if (!prefersReducedMotion) {
          rafId = requestAnimationFrame(renderFrame);
        }
      };

      renderFrame(0);
      cleanupThree = () => ro.disconnect();
    };

    // Attempt native Three.js WebGLRenderer first; fall back cleanly if `three` isn't installed
    import('three')
      .then((THREE) => {
        if (disposed) return;
        setRendererKind('three-webgl');

        const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
        renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));

        const scene = new THREE.Scene();
        const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
        camera.position.set(0, 0, 5.4);

        const group = new THREE.Group();
        scene.add(group);

        const retainedGeo = new THREE.BoxGeometry(0.14, 0.14, 0.14);
        const retainedMat = new THREE.MeshStandardMaterial({
          color: 0x6366f1,
          emissive: 0x312e81,
          roughness: 0.3,
          metalness: 0.4,
        });
        const prunedGeo = new THREE.OctahedronGeometry(0.08, 0);
        const prunedMat = new THREE.MeshStandardMaterial({
          color: 0x10b981,
          transparent: true,
          opacity: Math.max(0.18, 0.65 - (effectiveCompression / 100) * 0.45),
          roughness: 0.5,
        });

        const retainedMesh = new THREE.InstancedMesh(retainedGeo, retainedMat, retainedCount);
        const prunedMesh = new THREE.InstancedMesh(prunedGeo, prunedMat, Math.max(1, PARTICLE_COUNT - retainedCount));
        const dummy = new THREE.Object3D();
        const factor = effectiveCompression / 100;

        let rIdx = 0;
        let pIdx = 0;
        particles.forEach((p) => {
          if (p.isRetained && rIdx < retainedCount) {
            dummy.position.set(
              p.ox + (p.ix - p.ox) * factor,
              p.oy + (p.iy - p.oy) * factor,
              p.oz + (p.iz - p.oz) * factor
            );
            dummy.updateMatrix();
            retainedMesh.setMatrixAt(rIdx++, dummy.matrix);
          } else if (pIdx < PARTICLE_COUNT - retainedCount) {
            dummy.position.set(p.ox * (1 + factor * 0.3), p.oy * (1 + factor * 0.3), p.oz * (1 + factor * 0.3));
            dummy.updateMatrix();
            prunedMesh.setMatrixAt(pIdx++, dummy.matrix);
          }
        });
        retainedMesh.instanceMatrix.needsUpdate = true;
        prunedMesh.instanceMatrix.needsUpdate = true;
        group.add(retainedMesh, prunedMesh);

        scene.add(new THREE.AmbientLight(0xffffff, 0.9));
        const keyLight = new THREE.DirectionalLight(0x818cf8, 1.4);
        keyLight.position.set(3, 4, 4);
        scene.add(keyLight);

        const resize = () => {
          const w = container.clientWidth || 400;
          const h = container.clientHeight || 360;
          renderer.setSize(w, h, false);
          camera.aspect = w / h;
          camera.updateProjectionMatrix();
        };
        resize();
        const ro = new ResizeObserver(resize);
        ro.observe(container);

        const animate = () => {
          if (disposed) return;
          if (!orbit.dragging && !prefersReducedMotion) {
            orbit.rotY += 0.004;
          }
          group.rotation.x = orbit.rotX;
          group.rotation.y = orbit.rotY;
          renderer.render(scene, camera);
          if (!prefersReducedMotion) {
            rafId = requestAnimationFrame(animate);
          }
        };
        animate();

        cleanupThree = () => {
          ro.disconnect();
          retainedGeo.dispose();
          retainedMat.dispose();
          prunedGeo.dispose();
          prunedMat.dispose();
          renderer.dispose();
        };
      })
      .catch(() => {
        if (!disposed) startCanvasFallback();
      });

    return () => {
      disposed = true;
      if (rafId) cancelAnimationFrame(rafId);
      canvas.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      if (cleanupThree) cleanupThree();
    };
  }, [effectiveCompression]);

  return (
    <div className="flex-1 min-h-0 flex flex-col bg-slate-950 relative overflow-hidden">
      {/* Top Legend */}
      <div className="px-4 py-2 bg-slate-900/60 border-b border-slate-800/80 flex flex-wrap items-center justify-between gap-2 text-[11px]">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1.5 text-indigo-300 font-medium">
            <span className="w-2 h-2 rounded-sm bg-indigo-500" />
            Retained Core ({compressedTokens} tok)
          </span>
          <span className="flex items-center gap-1.5 text-emerald-300 font-medium">
            <span className="w-2 h-2 rounded-sm bg-emerald-400/70" />
            Pruned Noise ({Math.max(0, originalTokens - compressedTokens)} tok)
          </span>
        </div>
        <span className="text-[10px] font-mono text-slate-400 flex items-center gap-1">
          <Box className="w-3 h-3 text-indigo-400" aria-hidden="true" />
          {rendererKind === 'three-webgl' ? 'Three.js WebGL' : '3D Lattice Engine'} · Drag to Orbit
        </span>
      </div>

      {/* 3D Viewport */}
      <div ref={containerRef} className="flex-1 min-h-0 relative">
        <canvas
          ref={canvasRef}
          aria-label={`Interactive 3D token compression lattice showing ${effectiveCompression.toFixed(0)}% compression`}
          className="w-full h-full block cursor-grab active:cursor-grabbing"
        />

        {/* Interactive Compression Scrubber Overlay */}
        <div className="absolute bottom-3 left-4 right-4 flex flex-wrap items-center justify-between gap-3 px-3.5 py-2 rounded-xl bg-slate-900/90 border border-slate-800 backdrop-blur-sm text-xs">
          <div className="flex items-center gap-2.5 flex-1 min-w-[200px]">
            <label htmlFor="pd-3d-squeeze" className="text-[11px] font-medium text-slate-300 whitespace-nowrap">
              Compression Force:
            </label>
            <input
              id="pd-3d-squeeze"
              type="range"
              min="0"
              max="95"
              value={Math.round(effectiveCompression)}
              onChange={(e) => setSqueezeOverride(Number(e.target.value))}
              className="flex-1 accent-indigo-500 cursor-pointer"
            />
            <span className="font-mono text-indigo-300 font-semibold w-10 text-right tabular-nums">
              {Math.round(effectiveCompression)}%
            </span>
          </div>

          {squeezeOverride !== null && (
            <button
              type="button"
              onClick={() => setSqueezeOverride(null)}
              className="flex items-center gap-1 px-2 py-1 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] transition"
            >
              <RotateCcw className="w-3 h-3" aria-hidden="true" />
              Sync Live
            </button>
          )}
        </div>
      </div>
    </div>
  );
});

export default TokenCompressor3D;
