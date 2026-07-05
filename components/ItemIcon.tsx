"use client";

import { useState } from "react";

function initialOf(text: string): string {
  const trimmed = text.trim();
  return trimmed ? trimmed[0].toUpperCase() : "?";
}

export function ItemIcon({
  itemId,
  itemName,
  quality,
  size = 48,
  className = "",
}: {
  itemId: string;
  itemName?: string;
  quality: number;
  size?: number;
  className?: string;
}) {
  const [attempt, setAttempt] = useState(0);
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);

  if (failed) {
    return (
      <div
        className={`flex shrink-0 items-center justify-center rounded-md border border-ink-line bg-ink font-display text-parchment-dim ${className}`}
        style={{ width: size, height: size, fontSize: Math.max(10, size * 0.38) }}
        title={itemName}
      >
        {initialOf(itemName ?? itemId)}
      </div>
    );
  }

  // render.albiononline.com is a slow, occasionally unresponsive third-party
  // service (observed 2-15s response times for the same item). A plain <img>
  // lets the browser fetch it directly instead of routing through Next's
  // image proxy, whose own upstream timeout is shorter than the service's
  // worst-case latency. One retry absorbs transient slowness; after that we
  // fall back to a monogram instead of a broken-image icon.
  const src = `https://render.albiononline.com/v1/item/${itemId}.png?quality=${quality}&size=${Math.round(size * 1.5)}${attempt > 0 ? `&retry=${attempt}` : ""}`;

  return (
    // eslint-disable-next-line @next/next/no-img-element -- deliberate, see comment above
    <img
      key={attempt}
      src={src}
      alt=""
      width={size}
      height={size}
      loading="lazy"
      decoding="async"
      onLoad={() => setLoaded(true)}
      onError={() => {
        if (attempt < 1) setAttempt((a) => a + 1);
        else setFailed(true);
      }}
      className={`shrink-0 rounded-md bg-ink-line/30 transition-opacity duration-300 ${loaded ? "opacity-100" : "opacity-0"} ${className}`}
      style={{ width: size, height: size }}
    />
  );
}
