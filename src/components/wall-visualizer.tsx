"use client";

import { useCallback, useRef, useState } from "react";

type Transform = {
  xPct: number;
  yPct: number;
  widthPct: number;
  heightPct: number;
  rotationDeg: number;
  opacity: number;
};

const DEFAULT_TRANSFORM: Transform = {
  xPct: 28,
  yPct: 28,
  widthPct: 40,
  heightPct: 40,
  rotationDeg: 0,
  opacity: 0.92,
};

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

type DragMode = "move" | "resize" | "rotate";

export function WallVisualizer({
  productImageUrl,
  productName,
}: {
  productImageUrl: string;
  productName: string;
}) {
  const [wallPhoto, setWallPhoto] = useState<string | null>(null);
  const [aspect, setAspect] = useState<number>(1);
  const [transform, setTransform] = useState<Transform>(DEFAULT_TRANSFORM);
  const [saving, setSaving] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{ mode: DragMode; startX: number; startY: number; start: Transform } | null>(null);

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    setWallPhoto(url);
    setTransform(DEFAULT_TRANSFORM);
  }

  function onImgLoad(e: React.SyntheticEvent<HTMLImageElement>) {
    const img = e.currentTarget;
    if (img.naturalWidth && img.naturalHeight) {
      setAspect(img.naturalWidth / img.naturalHeight);
    }
  }

  const beginDrag = useCallback(
    (mode: DragMode, e: React.PointerEvent) => {
      e.stopPropagation();
      e.preventDefault();
      (e.currentTarget as Element).setPointerCapture(e.pointerId);
      dragRef.current = { mode, startX: e.clientX, startY: e.clientY, start: transform };
    },
    [transform]
  );
  const onMovePointerDown = useCallback((e: React.PointerEvent) => beginDrag("move", e), [beginDrag]);
  const onResizePointerDown = useCallback((e: React.PointerEvent) => beginDrag("resize", e), [beginDrag]);
  const onRotatePointerDown = useCallback((e: React.PointerEvent) => beginDrag("rotate", e), [beginDrag]);

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    const drag = dragRef.current;
    const rect = containerRef.current?.getBoundingClientRect();
    if (!drag || !rect) return;

    const dxPct = ((e.clientX - drag.startX) / rect.width) * 100;
    const dyPct = ((e.clientY - drag.startY) / rect.height) * 100;
    const { mode, start } = drag;

    if (mode === "move") {
      setTransform((t) => ({
        ...t,
        xPct: clamp(start.xPct + dxPct, -50, 90),
        yPct: clamp(start.yPct + dyPct, -50, 90),
      }));
    } else if (mode === "resize") {
      setTransform((t) => ({
        ...t,
        widthPct: clamp(start.widthPct + dxPct, 6, 150),
        heightPct: clamp(start.heightPct + dyPct, 6, 150),
      }));
    } else if (mode === "rotate") {
      const centerX = rect.left + ((start.xPct + start.widthPct / 2) / 100) * rect.width;
      const centerY = rect.top + ((start.yPct + start.heightPct / 2) / 100) * rect.height;
      const angle = Math.atan2(e.clientY - centerY, e.clientX - centerX) * (180 / Math.PI) + 90;
      setTransform((t) => ({ ...t, rotationDeg: angle }));
    }
  }, []);

  function endDrag() {
    dragRef.current = null;
  }

  async function handleDownload() {
    if (!wallPhoto) return;
    setSaving(true);
    try {
      const wallImg = new window.Image();
      wallImg.src = wallPhoto;
      await new Promise((resolve, reject) => {
        wallImg.onload = resolve;
        wallImg.onerror = reject;
      });

      const overlayImg = new window.Image();
      overlayImg.src = productImageUrl;
      await new Promise((resolve, reject) => {
        overlayImg.onload = resolve;
        overlayImg.onerror = reject;
      });

      const canvas = document.createElement("canvas");
      canvas.width = wallImg.naturalWidth;
      canvas.height = wallImg.naturalHeight;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      ctx.drawImage(wallImg, 0, 0);

      const ow = (transform.widthPct / 100) * canvas.width;
      const oh = (transform.heightPct / 100) * canvas.height;
      const ox = (transform.xPct / 100) * canvas.width;
      const oy = (transform.yPct / 100) * canvas.height;

      ctx.save();
      ctx.globalAlpha = transform.opacity;
      ctx.translate(ox + ow / 2, oy + oh / 2);
      ctx.rotate((transform.rotationDeg * Math.PI) / 180);
      ctx.drawImage(overlayImg, -ow / 2, -oh / 2, ow, oh);
      ctx.restore();

      const dataUrl = canvas.toDataURL("image/png");
      const a = document.createElement("a");
      a.href = dataUrl;
      a.download = `${productName.replace(/\s+/g, "-").toLowerCase()}-on-your-wall.png`;
      a.click();
    } finally {
      setSaving(false);
    }
  }

  if (!wallPhoto) {
    return (
      <div className="rounded-lg border border-dashed border-neutral-300 bg-neutral-50 p-4 text-center">
        <p className="text-sm text-neutral-600">
          Photograph or upload a wall (or any surface) to preview {productName} on it.
        </p>
        <label className="mt-3 inline-block cursor-pointer rounded-lg bg-terracotta-500 px-4 py-2 text-sm font-medium text-white hover:bg-terracotta-600">
          Choose a photo
          <input type="file" accept="image/*" onChange={handleFile} className="hidden" />
        </label>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <div
        ref={containerRef}
        className="relative w-full touch-none select-none overflow-hidden rounded-xl border border-neutral-200 bg-neutral-100"
        style={{ aspectRatio: aspect }}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={wallPhoto}
          alt="Your wall"
          onLoad={onImgLoad}
          className="pointer-events-none absolute inset-0 h-full w-full object-cover"
        />
        <div
          className="absolute cursor-move border-2 border-dashed border-white shadow-[0_0_0_1px_rgba(0,0,0,0.2)]"
          style={{
            left: `${transform.xPct}%`,
            top: `${transform.yPct}%`,
            width: `${transform.widthPct}%`,
            height: `${transform.heightPct}%`,
            transform: `rotate(${transform.rotationDeg}deg)`,
            opacity: transform.opacity,
          }}
          onPointerDown={onMovePointerDown}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={productImageUrl}
            alt={productName}
            draggable={false}
            className="pointer-events-none h-full w-full object-cover"
          />
          <div
            onPointerDown={onResizePointerDown}
            className="absolute -bottom-2.5 -right-2.5 h-5 w-5 cursor-nwse-resize rounded-full border-2 border-terracotta-500 bg-white"
          />
          <div
            onPointerDown={onRotatePointerDown}
            className="absolute -top-7 left-1/2 h-5 w-5 -translate-x-1/2 cursor-grab rounded-full border-2 border-terracotta-500 bg-white"
          />
        </div>
      </div>

      <p className="text-xs text-neutral-500">
        Drag the panel to position it, the corner dot to resize, the top dot to rotate.
      </p>

      <div className="flex flex-wrap items-center gap-4">
        <label className="flex items-center gap-2 text-xs text-neutral-600">
          Blend
          <input
            type="range"
            min={0.3}
            max={1}
            step={0.02}
            value={transform.opacity}
            onChange={(e) => setTransform((t) => ({ ...t, opacity: Number(e.target.value) }))}
          />
        </label>
        <button
          type="button"
          onClick={() => setTransform(DEFAULT_TRANSFORM)}
          className="text-xs font-medium text-neutral-500 hover:text-neutral-900"
        >
          Reset position
        </button>
        <label className="cursor-pointer text-xs font-medium text-neutral-500 hover:text-neutral-900">
          Change photo
          <input type="file" accept="image/*" onChange={handleFile} className="hidden" />
        </label>
        <button
          type="button"
          onClick={handleDownload}
          disabled={saving}
          className="ml-auto rounded-lg bg-terracotta-500 px-4 py-2 text-xs font-medium text-white hover:bg-terracotta-600 disabled:opacity-60"
        >
          {saving ? "Saving…" : "Download preview"}
        </button>
      </div>
    </div>
  );
}
