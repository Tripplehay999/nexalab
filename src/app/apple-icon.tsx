import { ImageResponse } from 'next/og';

export const size = { width: 180, height: 180 };
export const contentType = 'image/png';

// iOS home-screen icon — same mark as src/app/icon.svg, on a full-bleed square
// (iOS rounds the corners itself).
export default function AppleIcon() {
  return new ImageResponse(
    (
      <div style={{ width: '100%', height: '100%', display: 'flex', position: 'relative', background: '#17130E' }}>
        <div style={{ position: 'absolute', left: 39, top: 39, width: 73, height: 73, borderRadius: '50%', background: '#FF5A36' }} />
        <div style={{ position: 'absolute', left: 104, top: 101, width: 34, height: 34, borderRadius: '50%', background: '#C9F266' }} />
      </div>
    ),
    size,
  );
}
