import React, { useEffect, useRef, useState } from 'react';
import { Pause, Play, Volume2 } from 'lucide-react';

interface AudioPlayerProps {
  src: string | null;
  title?: string;
}

export const AudioPlayer: React.FC<AudioPlayerProps> = ({ src, title = 'Audio recap' }) => {
  const ref = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    setPlaying(false);
    setProgress(0);
  }, [src]);

  if (!src) return null;

  const toggle = () => {
    const el = ref.current;
    if (!el) return;
    if (el.paused) {
      void el.play();
      setPlaying(true);
    } else {
      el.pause();
      setPlaying(false);
    }
  };

  return (
    <div className="bg-[var(--fios-surface-2)] border fios-border rounded-xl p-3 flex items-center gap-3">
      <button
        type="button"
        onClick={toggle}
        className="w-10 h-10 rounded-lg accent-bg text-slate-950 flex items-center justify-center cursor-pointer shrink-0"
        aria-label={playing ? 'Pause' : 'Play'}
      >
        {playing ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
      </button>
      <div className="min-w-0 flex-1 space-y-1.5">
        <p className="text-xs font-bold text-[var(--fios-text)] truncate flex items-center gap-1.5">
          <Volume2 className="w-3.5 h-3.5 accent-solid-text shrink-0" /> {title}
        </p>
        <div className="h-1.5 rounded-full bg-[var(--fios-surface)] overflow-hidden">
          <div className="h-full accent-bg transition-all" style={{ width: `${progress * 100}%` }} />
        </div>
      </div>
      <audio
        ref={ref}
        src={src}
        onTimeUpdate={(e) => {
          const a = e.currentTarget;
          setProgress(a.duration ? a.currentTime / a.duration : 0);
        }}
        onEnded={() => {
          setPlaying(false);
          setProgress(0);
        }}
        className="hidden"
      />
    </div>
  );
};
