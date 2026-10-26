import { ImageResponse } from 'next/og';

// Square 512px sender avatar (Google profile photo, Gravatar, etc.).
// Full-bleed background with the mark centred so it survives a circular crop.
export const dynamic = 'force-static';

export function GET() {
  return new ImageResponse(
    (
      <div style={{ width: '100%', height: '100%', display: 'flex', position: 'relative', background: '#17130E' }}>
        <div style={{ position: 'absolute', left: 128, top: 128, width: 196, height: 196, borderRadius: '50%', background: '#FF5A36' }} />
        <div style={{ position: 'absolute', left: 300, top: 300, width: 90, height: 90, borderRadius: '50%', background: '#C9F266' }} />
      </div>
    ),
    { width: 512, height: 512, headers: { 'Cache-Control': 'public, max-age=31536000, immutable' } },
  );
}
