import * as Minio from 'minio';
import { createModuleLogger } from '../../utils/logger';

const log = createModuleLogger('Storage');

let _client: Minio.Client | null = null;

export function getMinioClient(): Minio.Client {
  if (!_client) {
    _client = new Minio.Client({
      endPoint: process.env.MINIO_ENDPOINT ?? 'localhost',
      port: Number(process.env.MINIO_PORT ?? 9000),
      useSSL: process.env.MINIO_USE_SSL === 'true',
      accessKey: process.env.MINIO_ACCESS_KEY ?? 'minioadmin',
      secretKey: process.env.MINIO_SECRET_KEY ?? 'minioadmin123',
    });
  }
  return _client;
}

const BUCKET = process.env.MINIO_BUCKET ?? 'lianshanyi';

export async function ensureBucketExists(): Promise<void> {
  const client = getMinioClient();
  const exists = await client.bucketExists(BUCKET);
  if (!exists) {
    await client.makeBucket(BUCKET, '');
    // Set public read policy
    const policy = JSON.stringify({
      Version: '2012-10-17',
      Statement: [
        {
          Effect: 'Allow',
          Principal: { AWS: ['*'] },
          Action: ['s3:GetObject'],
          Resource: [`arn:aws:s3:::${BUCKET}/*`],
        },
      ],
    });
    await client.setBucketPolicy(BUCKET, policy);
    log.info({ bucket: BUCKET }, 'MinIO bucket created with public read policy');
  }
}

export function getPublicUrl(objectName: string): string {
  const baseUrl = process.env.MINIO_PUBLIC_URL ?? `http://localhost:9000/${BUCKET}`;
  return `${baseUrl.replace(/\/$/, '')}/${objectName}`;
}

export async function uploadFile(
  objectName: string,
  buffer: Buffer,
  contentType: string,
): Promise<string> {
  const client = getMinioClient();
  await client.putObject(BUCKET, objectName, buffer, buffer.length, {
    'Content-Type': contentType,
  });
  return getPublicUrl(objectName);
}

export async function deleteFile(objectName: string): Promise<void> {
  const client = getMinioClient();
  await client.removeObject(BUCKET, objectName);
}
