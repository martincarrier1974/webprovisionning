import crypto from "node:crypto";

type ObjectStorageConfig = {
  provider: string;
  endpoint: string;
  region: string;
  bucket: string;
  accessKeyId: string;
  secretAccessKey: string;
};

function getConfig(): ObjectStorageConfig | null {
  const provider = process.env.STORAGE_PROVIDER?.trim() || "";
  const endpoint = process.env.S3_ENDPOINT?.trim() || "";
  const region = process.env.S3_REGION?.trim() || "";
  const bucket = process.env.S3_BUCKET?.trim() || "";
  const accessKeyId = process.env.S3_ACCESS_KEY_ID?.trim() || "";
  const secretAccessKey = process.env.S3_SECRET_ACCESS_KEY?.trim() || "";

  if (!provider || !endpoint || !region || !bucket || !accessKeyId || !secretAccessKey) {
    return null;
  }

  return {
    provider,
    endpoint: endpoint.replace(/\/$/, ""),
    region,
    bucket,
    accessKeyId,
    secretAccessKey,
  };
}

export function isObjectStorageConfigured() {
  return Boolean(getConfig());
}

export function buildStorageKey(originalName: string) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const random = crypto.randomBytes(6).toString("hex");
  const safeName = originalName.replace(/[^a-zA-Z0-9._-]/g, "-");
  return `firmware/${timestamp}-${random}-${safeName}`;
}

export function buildPublicObjectUrl(storageKey: string) {
  const config = getConfig();

  if (!config) {
    return null;
  }

  return `${config.endpoint}/${config.bucket}/${storageKey}`;
}

export function getObjectStorageSummary() {
  const config = getConfig();

  if (!config) {
    return {
      configured: false,
      bucket: null,
      endpoint: null,
      provider: null,
    };
  }

  return {
    configured: true,
    bucket: config.bucket,
    endpoint: config.endpoint,
    provider: config.provider,
  };
}
