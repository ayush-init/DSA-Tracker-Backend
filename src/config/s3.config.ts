import { S3Client } from '@aws-sdk/client-s3';

export const s3Client = new S3Client({
  region: process.env.AWS_REGION!,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY!,
    secretAccessKey: process.env.AWS_SECRET_KEY!,
  },
});

export const S3_BUCKET_NAME = process.env.AWS_BUCKET_NAME!;
export const AWS_REGION = process.env.AWS_REGION!;