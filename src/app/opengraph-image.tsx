import { ImageResponse } from 'next/og'

export const alt = 'Partivo — avtomobil ehtiyat hissələri bazarı'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          padding: 80,
          background: 'radial-gradient(circle at 80% 20%, rgba(255,107,26,0.35), transparent 50%), #0b0c0e',
          color: '#f3f4f6',
        }}
      >
        <div style={{ display: 'flex', fontSize: 88, fontWeight: 800, letterSpacing: -3 }}>
          partivo<span style={{ color: '#ff6b1a' }}>.</span>
        </div>
        <div style={{ fontSize: 40, marginTop: 20, color: '#c9ced6' }}>Avtomobil ehtiyat hissələri bazarı</div>
        <div style={{ fontSize: 28, marginTop: 40, color: '#a2a8b3' }}>OEM kodu, marka və modelə görə axtarış · partivo.az</div>
      </div>
    ),
    size,
  )
}
