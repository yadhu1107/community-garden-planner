const configuredOrigins = process.env.CLIENT_ORIGINS || 'http://localhost:5173,https://yadhu1107.github.io';

export const allowedOrigins = new Set(configuredOrigins.split(',').map(origin => origin.trim()).filter(Boolean));

export function cookieOptions() {
  const production = process.env.NODE_ENV === 'production';
  return {
    httpOnly: true,
    secure: production,
    sameSite: production ? 'none' : 'lax',
    path: '/api/auth',
    maxAge: 30 * 24 * 60 * 60 * 1000,
    partitioned: production
  };
}
