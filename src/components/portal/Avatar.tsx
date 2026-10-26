import { initialsOf } from '@/lib/portal';

// Photo if we have one, warm initials otherwise. Plain <img> so any staff photo
// URL works without adding image domains to next.config.
const TONES = ['#FF5A36', '#103B2F', '#8B6CF0', '#E3A21A', '#2F9E6E', '#5B8DEF'];

export default function Avatar({ name, src, size = 40, ring = false }: { name: string; src?: string | null; size?: number; ring?: boolean }) {
  const tone = TONES[(name.charCodeAt(0) + name.length) % TONES.length];
  const style = { width: size, height: size, fontSize: Math.round(size * 0.38) } as const;
  return src ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt={name} width={size} height={size} className={`pt-avatar ${ring ? 'has-ring' : ''}`} style={style} loading="lazy" />
  ) : (
    <span className={`pt-avatar pt-avatar-initials ${ring ? 'has-ring' : ''}`} style={{ ...style, background: tone }} aria-label={name}>
      {initialsOf(name)}
    </span>
  );
}
