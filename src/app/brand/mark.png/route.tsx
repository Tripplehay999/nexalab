import { ImageResponse } from 'next/og';

// NexaLab mark as a PNG for emails (Gmail/Outlook don't render SVG).
// Served at /brand/mark.png — 192px, shown at 32–48px for sharp retina rendering.
export const dynamic = 'force-static';

export function GET() {
  return new ImageResponse(
    (
      <div style={{ width: '100%', height: '100%', display: 'flex', background: 'transparent' }}>
        <div style={{ width: 192, height: 192, borderRadius: 54, background: '#17130E', display: 'flex', position: 'relative' }}>
          <div style={{ position: 'absolute', left: 42, top: 42, width: 78, height: 78, borderRadius: '50%', background: '#FF5A36' }} />
          <div style={{ position: 'absolute', left: 111, top: 108, width: 36, height: 36, borderRadius: '50%', background: '#C9F266' }} />
        </div>
      </div>
    ),
    { width: 192, height: 192, headers: { 'Cache-Control': 'public, max-age=31536000, immutable' } },
  );
}
