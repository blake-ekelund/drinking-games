export function avatarURL(input: string) {
  const raw = (input || '').trim();
  if (!raw) return `https://api.dicebear.com/7.x/shapes/svg`;
  if (/^https?:\/\//i.test(raw)) return raw;
  const handle = raw.replace(/^@/, '');
  return `https://unavatar.io/tiktok/${encodeURIComponent(handle)}?fallback=https://api.dicebear.com/7.x/shapes/svg?seed=${encodeURIComponent(handle)}`;
}

export function loadImage(url: string, seed: string) {
  return new Promise<HTMLImageElement>((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => {
      const fb = new Image();
      fb.crossOrigin = 'anonymous';
      fb.onload = () => resolve(fb);
      fb.src = `https://api.dicebear.com/7.x/shapes/svg?seed=${encodeURIComponent(seed)}`;
    };
    img.src = url;
  });
}
