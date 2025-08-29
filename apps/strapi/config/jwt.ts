export default ({ env }) => ({
  jwt: {
    secret: env('JWT_SECRET'),
    expiresIn: '7d', // Token expires in 7 days as specified in story
    refreshToken: {
      secret: env('JWT_REFRESH_SECRET'),
      expiresIn: '30d', // Refresh token expires in 30 days
    },
  },
});
