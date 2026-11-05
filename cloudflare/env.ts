import type { D1Database, R2Bucket, Fetcher } from '@cloudflare/workers-types';

export interface CloudflareEnv {
  DB: D1Database;
  PHOTOS: R2Bucket;
  ASSETS: Fetcher;
  APP_URL: string;
  GOOGLE_CLIENT_ID: string;
  MEDIA_SIGNING_SECRET: string;
  CREEM_API_KEY?: string;
  CREEM_WEBHOOK_SECRET?: string;
  CREEM_TEST_MODE?: string;
  CREEM_PROFESSIONAL_PRODUCT_ID?: string;
  CREEM_EXECUTIVE_PRODUCT_ID?: string;
  NANO_BANANA_API_KEY?: string;
  NANO_BANANA_MODEL_1K?: string;
  NANO_BANANA_MODEL_2K?: string;
  GENERATED_IMAGE_HOSTS?: string;
  MAINTENANCE_MODE?: string;
  ALLOW_NEW_ACCOUNTS?: string;
}
export interface AccountUser { id: string; email: string | null; user_metadata: { name?: string; avatar_url?: string } }
