import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Vela',
    short_name: 'Vela',
    description: 'Gestión empresarial inteligente para pymes y autónomos',
    start_url: '/',
    display: 'standalone',
    background_color: '#0B0D2B',
    theme_color: '#4F46E5',
    icons: [
      { src: '/icon.svg', sizes: 'any', type: 'image/svg+xml' },
    ],
  }
}
