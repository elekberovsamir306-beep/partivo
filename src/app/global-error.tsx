'use client'

export default function GlobalError({ reset }: { error: Error; reset: () => void }) {
  return (
    <html lang="az">
      <body style={{ background: '#0b0c0e', color: '#f3f4f6', fontFamily: 'system-ui, sans-serif', display: 'grid', placeItems: 'center', minHeight: '100vh', margin: 0 }}>
        <div style={{ textAlign: 'center', padding: 24 }}>
          <h1 style={{ fontSize: 24 }}>Partivo müvəqqəti əlçatan deyil</h1>
          <p style={{ color: '#a2a8b3' }}>Bir neçə dəqiqə sonra yenidən cəhd edin.</p>
          <button onClick={reset} style={{ marginTop: 16, padding: '10px 20px', borderRadius: 10, border: 0, background: '#ff6b1a', fontWeight: 700, cursor: 'pointer' }}>
            Yenidən cəhd et
          </button>
        </div>
      </body>
    </html>
  )
}
