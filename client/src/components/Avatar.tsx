import React, { useRef, useState } from 'react';
import { Upload, Trash2, User } from 'lucide-react';

interface AvatarProps {
  url?: string | null;
  name?: string | null;
  size?: number;
  className?: string;
}

export const Avatar: React.FC<AvatarProps> = ({ url, name, size = 36, className = '' }) => {
  const initial = (name || 'S').charAt(0).toUpperCase();
  const dim = { width: size, height: size };

  if (url) {
    return (
      <img
        src={url}
        alt={name || 'avatar'}
        style={dim}
        className={`rounded-full object-cover border fios-border ${className}`}
      />
    );
  }

  return (
    <div
      style={dim}
      className={`rounded-full accent-bg flex items-center justify-center text-slate-950 font-black ${className}`}
    >
      {initial}
    </div>
  );
};

interface AvatarPickerProps {
  url?: string | null;
  name?: string | null;
  onChange: (dataUrl: string | null) => void;
}

// Reads an uploaded image into a data URL stored in user_profiles.avatar_url.
export const AvatarPicker: React.FC<AvatarPickerProps> = ({ url, name, onChange }) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setError('Please choose an image file.');
      return;
    }
    if (file.size > 1_500_000) {
      setError('Image must be under 1.5 MB.');
      return;
    }
    setError(null);
    const reader = new FileReader();
    reader.onload = () => onChange(String(reader.result));
    reader.readAsDataURL(file);
  };

  return (
    <div className="flex items-center gap-4">
      <Avatar url={url} name={name} size={64} />
      <div className="space-y-1.5">
        <input ref={inputRef} type="file" accept="image/*" onChange={handleFile} className="hidden" />
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="px-3 py-1.5 bg-[var(--fios-surface-2)] border fios-border text-[var(--fios-text)] text-xs font-bold uppercase rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <Upload className="w-3.5 h-3.5 accent-solid-text" /> Upload
          </button>
          {url && (
            <button
              type="button"
              onClick={() => onChange(null)}
              className="px-3 py-1.5 bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs font-bold uppercase rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" /> Remove
            </button>
          )}
        </div>
        <p className="text-[10px] text-[var(--fios-text-muted)] flex items-center gap-1">
          <User className="w-3 h-3" /> PNG/JPG, up to 1.5 MB. Falls back to your initial.
        </p>
        {error && <p className="text-[10px] text-rose-400 font-bold">{error}</p>}
      </div>
    </div>
  );
};

export default Avatar;
