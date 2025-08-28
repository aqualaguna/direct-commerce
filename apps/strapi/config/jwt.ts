export default ({ env }) => ({
  jwt: {
    secret: env('JWT_SECRET'),
    expiresIn: '30d', // Token expires in 30 days
    refreshToken: {
      secret: env('JWT_REFRESH_SECRET'),
      expiresIn: '7d', // Refresh token expires in 7 days
    },
  },
});
