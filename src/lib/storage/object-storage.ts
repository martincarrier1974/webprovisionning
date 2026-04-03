import crypto from "node:crypto";
import { createHmac } from "node:crypto";

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
  if (!config) return null;
  return `${config.endpoint}/${config.bucket}/${storageKey}`;
}

export function getObjectStorageSummary() {
  const config = getConfig();
  if (!config) return { configured: false, bucket: null, endpoint: null, provider: null };
  return { configured: true, bucket: config.bucket, endpoint: config.endpoint, provider: config.provider };
}

// ── AWS Signature V4 S3 upload (no SDK dependency) ────────────────────────

function hmacSha256(key: Buffer | string, data: string): Buffer {
  return createHmac("sha256", key).update(data, "utf8").digest();
}

function hexEncode(buf: Buffer): string {
  return buf.toString("hex");
}

function getSigningKey(secretKey: string, date: string, region: string, service: string): Buffer {
  const kDate = hmacSha256("AWS4" + secretKey, date);
  const kRegion = hmacSha256(kDate, region);
  const kService = hmacSha256(kRegion, service);
  return hmacSha256(kService, "aws4_request");
}

export async function uploadToS3(storageKey: string, buffer: Buffer, contentType = "application/octet-stream"): Promise<{ ok: boolean; url?: string; error?: string }> {
  const config = getConfig();
  if (!config) return { ok: false, error: "Stockage objet non configuré." };

  const now = new Date();
  const dateStamp = now.toISOString().slice(0, 10).replace(/-/g, "");
  const amzDate = now.toISOString().replace(/[:-]/g, "").slice(0, 15) + "Z";

  const host = new URL(config.endpoint).host;
  const url = `${config.endpoint}/${config.bucket}/${storageKey}`;
  const sha256 = crypto.createHash("sha256").update(buffer).digest("hex");

  const headers: Record<string, string> = {
    "host": host,
    "x-amz-date": amzDate,
    "x-amz-content-sha256": sha256,
    "content-type": contentType,
    "content-length": String(buffer.length),
  };

  const sortedHeaderKeys = Object.keys(headers).sort();
  const canonicalHeaders = sortedHeaderKeys.map(k => `${k}:${headers[k]}\n`).join("");
  const signedHeaders = sortedHeaderKeys.join(";");

  const canonicalRequest = [
    "PUT",
    `/${config.bucket}/${storageKey}`,
    "",
    canonicalHeaders,
    signedHeaders,
    sha256,
  ].join("\n");

  const credentialScope = `${dateStamp}/${config.region}/s3/aws4_request`;
  const stringToSign = [
    "AWS4-HMAC-SHA256",
    amzDate,
    credentialScope,
    hexEncode(crypto.createHash("sha256").update(canonicalRequest).digest()),
  ].join("\n");

  const signingKey = getSigningKey(config.secretAccessKey, dateStamp, config.region, "s3");
  const signature = hexEncode(hmacSha256(signingKey, stringToSign));

  const authHeader = `AWS4-HMAC-SHA256 Credential=${config.accessKeyId}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;

  try {
    const res = await fetch(url, {
      method: "PUT",
      headers: {
        ...headers,
        "Authorization": authHeader,
      },
      body: buffer as BodyInit,
    });

    if (res.ok || res.status === 200) {
      return { ok: true, url: buildPublicObjectUrl(storageKey) ?? url };
    }
    const body = await res.text();
    return { ok: false, error: `S3 ${res.status}: ${body.slice(0, 200)}` };
  } catch (e: unknown) {
    return { ok: false, error: (e as { message?: string }).message ?? "Erreur upload S3." };
  }
}
