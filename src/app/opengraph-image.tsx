import { ImageResponse } from 'next/og';

export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';
export const alt = 'FFCS planner — build your VIT timetable by talking';

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          width: '100%',
          height: '100%',
          background: '#131316',
          color: '#f3f2ed',
          padding: 72,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
          <div style={{ display: 'flex', position: 'relative', width: 64, height: 64 }}>
            <div
              style={{
                position: 'absolute',
                left: 0,
                top: 0,
                width: 40,
                height: 40,
                borderRadius: 999,
                background: '#b8f24a',
              }}
            />
            <div
              style={{
                position: 'absolute',
                right: 0,
                top: 0,
                width: 26,
                height: 26,
                borderRadius: 7,
                background: '#b39dfb',
              }}
            />
            <div
              style={{
                position: 'absolute',
                left: 20,
                bottom: 0,
                width: 0,
                height: 0,
                borderLeft: '14px solid transparent',
                borderRight: '14px solid transparent',
                borderBottom: '24px solid #ffd43a',
              }}
            />
          </div>
          <div style={{ display: 'flex', fontSize: 30, letterSpacing: 6, color: '#9a9aa5' }}>
            FFCS PLANNER
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          <div style={{ display: 'flex', fontSize: 78, lineHeight: 1.05, fontWeight: 700 }}>
            Build your VIT timetable
          </div>
          <div style={{ display: 'flex', fontSize: 78, lineHeight: 1.05, fontWeight: 700 }}>
            by talking to it.
          </div>
          <div style={{ display: 'flex', fontSize: 32, color: '#9a9aa5', marginTop: 12 }}>
            Ask who teaches a slot, then let a deterministic solver place every course.
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
          <div style={{ display: 'flex', width: 90, height: 8, background: '#b8f24a' }} />
          <div style={{ display: 'flex', fontSize: 26, color: '#9a9aa5' }}>
            728 courses · clash-free · no account
          </div>
        </div>
      </div>
    ),
    size,
  );
}
