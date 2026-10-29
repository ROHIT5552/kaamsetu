import { v2 as cloudinary } from 'cloudinary';
import { config } from '../config/index.js';

export interface StorageProvider {
  uploadImage(buffer: Buffer, mimetype: string): Promise<string>;
}

export class CloudinaryStorageProvider implements StorageProvider {
  constructor() {
    cloudinary.config({
      cloud_name: config.CLOUDINARY_CLOUD_NAME,
      api_key: config.CLOUDINARY_API_KEY,
      api_secret: config.CLOUDINARY_API_SECRET,
      secure: true,
    });
  }

  async uploadImage(buffer: Buffer, mimetype: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder: 'kaamsetu/work-photos',
          resource_type: 'image',
          transformation: [{ width: 1200, height: 900, crop: 'limit', quality: 'auto' }],
        },
        (error, result) => {
          if (error || !result) {
            return reject(error || new Error('Cloudinary upload failed'));
          }
          resolve(result.secure_url);
        }
      );
      uploadStream.end(buffer);
    });
  }
}

export class LocalBase64StorageProvider implements StorageProvider {
  async uploadImage(buffer: Buffer, mimetype: string): Promise<string> {
    const base64Data = buffer.toString('base64');
    return `data:${mimetype};base64,${base64Data}`;
  }
}

export const storageProvider: StorageProvider =
  config.CLOUDINARY_CLOUD_NAME && config.CLOUDINARY_API_KEY && config.CLOUDINARY_API_SECRET
    ? new CloudinaryStorageProvider()
    : new LocalBase64StorageProvider();
