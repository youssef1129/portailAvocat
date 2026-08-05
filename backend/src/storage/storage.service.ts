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
  private readonly client: S3Client;
  private readonly bucket: string;

  constructor(private readonly configService: ConfigService) {
    const bucket = this.configService.get<string>('MINIO_BUCKET') || '';
    const endpoint = this.configService.get<string>('MINIO_ENDPOINT') || '';
    const port = this.configService.get<string>('MINIO_PORT') || '';
    const accessKey = this.configService.get<string>('MINIO_ACCESS_KEY') || '';
    const secretKey = this.configService.get<string>('MINIO_SECRET_KEY') || '';

    this.bucket = bucket;
    const useSSL = this.configService.get<string>('MINIO_USE_SSL') === 'true';
    const protocol = useSSL ? 'https' : 'http';
    this.client = new S3Client({
      endpoint: `${protocol}://${endpoint}:${port}`,
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
      // Bucket absent -> on le crée
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
      return await getSignedUrl(this.client, command, { expiresIn: 900 });
    } catch {
      throw new InternalServerErrorException(
        'Unable to generate download URL.',
      );
    }
  }
}
