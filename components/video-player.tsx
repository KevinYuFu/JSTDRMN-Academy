"use client";

import { useEffect, useRef, useState } from "react";
import { runtimeSeconds, type ResolvedVideo } from "@/lib/runtime";
import { Icon } from "./icons";

function clock(seconds: number) {
  const safe = Math.max(0, Math.floor(seconds));
  const minutes = Math.floor(safe / 60);
  const remain = safe % 60;
  return `${minutes}:${String(remain).padStart(2, "0")}`;
}

export function VideoPlayer({
  title,
  position,
  runtime,
  playback,
}: {
  title: string;
  position: number;
  runtime: string;
  playback: ResolvedVideo;
}) {
  if (playback.type === "iframe") {
    return (
      <div className="video">
        <iframe src={playback.src} title={title} allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen" allowFullScreen />
      </div>
    );
  }
  if (playback.type === "file") {
    return (
      <div className="video">
        <video src={playback.src} controls playsInline />
      </div>
    );
  }
  return <MockPlayback key={`${playback.src}\0${title}`} title={title} position={position} runtime={runtime} />;
}

function MockPlayback({
  title,
  position,
  runtime,
}: {
  title: string;
  position: number;
  runtime: string;
}) {
  const total = Math.max(runtimeSeconds(runtime), 1);
  const [playing, setPlaying] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const elapsedRef = useRef(0);

  useEffect(() => {
    if (!playing) return;
    const started = performance.now() - elapsedRef.current * 1000;
    let frame = 0;
    const tick = (now: number) => {
      const next = Math.min(total, (now - started) / 1000);
      elapsedRef.current = next;
      setElapsed(next);
      if (next >= total) {
        setPlaying(false);
        return;
      }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [playing, total]);

  const ratio = Math.min(100, (elapsed / total) * 100);
  return (
    <div className="video">
      <div className="glow" />
      <div className="label">
        Now playing
        <strong>
          Lesson {position}: {title}
        </strong>
      </div>
      <button className="play" type="button" onClick={() => setPlaying((value) => !value)} aria-label={playing ? "Pause" : "Play"}>
        <Icon name={playing ? "pause" : "play"} />
      </button>
      <div className="controls">
        <button type="button" onClick={() => setPlaying((value) => !value)} aria-label={playing ? "Pause" : "Play"}>
          <Icon name={playing ? "pause" : "play"} />
        </button>
        <span>{clock(elapsed)}</span>
        <div className="scrub" aria-hidden>
          <span style={{ width: `${ratio}%` }} />
        </div>
        <span>{runtime}</span>
        <Icon name="volume" />
        <Icon name="fullscreen" />
      </div>
    </div>
  );
}
