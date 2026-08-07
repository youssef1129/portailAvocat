import {
  Injectable,
  InternalServerErrorException,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  HeadBucketCommand,
  CreateBucketCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

@Injectable()
export class StorageService implements OnModuleInit {
  private readonly client: S3Client; // internal — uploads, bucket checks
  private readonly publicClient: S3Client; // public — presigned URLs consumed by the browser
  private readonly bucket: string;

  constructor(private readonly configService: ConfigService) {
    const bucket = this.configService.get<string>('MINIO_BUCKET') || '';
    const endpoint = this.configService.get<string>('MINIO_ENDPOINT') || '';
    const port = this.configService.get<string>('MINIO_PORT') || '';
    const accessKey = this.configService.get<string>('MINIO_ACCESS_KEY') || '';
    const secretKey = this.configService.get<string>('MINIO_SECRET_KEY') || '';
    const useSSL = this.configService.get<string>('MINIO_USE_SSL') === 'true';
    const protocol = useSSL ? 'https' : 'http';

    this.bucket = bucket;

    this.client = new S3Client({
      endpoint: `${protocol}://${endpoint}:${port}`,
      region: 'us-east-1',
      credentials: {
        accessKeyId: accessKey,
        secretAccessKey: secretKey,
      },
      forcePathStyle: true,
    });

    // Presigned URLs must be signed against the URL the browser will actually
    // call — the internal Docker hostname (minio:9000) is not reachable from
    // outside the network, so a separate public endpoint is required here.
    const publicEndpoint = this.configService.get<string>('MINIO_PUBLIC_URL');
    this.publicClient = new S3Client({
      endpoint: publicEndpoint,
      region: 'us-east-1',
      credentials: {
        accessKeyId: accessKey,
        secretAccessKey: secretKey,
      },
      forcePathStyle: true,
    });
  }

  async onModuleInit() {
    await this.ensureBucketExists();
  }

  private async ensureBucketExists(): Promise<void> {
    try {
      await this.client.send(new HeadBucketCommand({ Bucket: this.bucket }));
    } catch {
      await this.client.send(new CreateBucketCommand({ Bucket: this.bucket }));
      console.log(`Bucket "${this.bucket}" créé.`);
    }
  }

  async uploadFile(
    key: string,
    buffer: Buffer,
    mimetype: string,
  ): Promise<void> {
    try {
      const command = new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: buffer,
        ContentType: mimetype,
      });
      await this.client.send(command);
    } catch {
      throw new InternalServerErrorException('Unable to upload file.');
    }
  }

  async getPresignedDownloadUrl(key: string): Promise<string> {
    try {
      const command = new GetObjectCommand({
        Bucket: this.bucket,
        Key: key,
      });
      return await getSignedUrl(this.publicClient, command, {
        expiresIn: 900,
      });
    } catch {
      throw new InternalServerErrorException(
        'Unable to generate download URL.',
      );
    }
  }
}
