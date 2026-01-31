import { ImageResponse } from 'next/og'

export const runtime = 'edge'
export const size = {
    width: 32,
    height: 32,
}
export const contentType = 'image/png'

export default function Icon() {
    return new ImageResponse(
        (
            <div
                style={{
                    width: '100%',
                    height: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#4f46e5', // Primary indigo/blue color matching the theme roughly
                }}
            >
                <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    style={{ width: '100%', height: '100%' }}
                >
                    <path d="M18 4h-6L8 8v8l4 4h6l4-4V8l-4-4z" fill="currentColor" fillOpacity="0.1" />
                    <path d="M18 4l-6 6v10l6-6V4z" fill="currentColor" fillOpacity="0.8" />
                    <path d="M6 10l6-6v10l-6 6V10z" fill="currentColor" fillOpacity="0.5" />
                </svg>
            </div>
        ),
        {
            ...size,
        }
    )
}
