export default ({ env }) => ({
  upload: {
    config: {
      provider: 'aws-s3',
      providerOptions: {
        accessKeyId: env('R2_ACCESS_KEY_ID'),
        secretAccessKey: env('R2_SECRET_ACCESS_KEY'),
        region: env('R2_REGION', 'auto'),
        params: {
          Bucket: env('R2_BUCKET'),
        },
        endpoint: env('R2_ENDPOINT'),
        forcePathStyle: true,
      },
    },
  },
});
