import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return { name: 'TEAMSPIRIT ERP', short_name: 'TEAMSPIRIT', description: 'Quản lý vận hành doanh nghiệp', start_url: '/', display: 'standalone', background_color: '#f7faf7', theme_color: '#153c2d', lang: 'vi', icons: [] };
}
