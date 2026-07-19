import {
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { getAppEnv } from "./env";

let cachedClient: S3Client | null = null;

function getR2Client(): S3Client {
  if (cachedClient) {
    return cachedClient;
  }

  const env = getAppEnv();
  cachedClient = new S3Client({
    region: "auto",
    endpoint: `https://${env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: env.R2_ACCESS_KEY_ID,
      secretAccessKey: env.R2_SECRET_ACCESS_KEY,
    },
  });

  return cachedClient;
}

export async function uploadPrivateObject(key: string, body: Buffer, contentType: string): Promise<void> {
  const env = getAppEnv();
  await getR2Client().send(
    new PutObjectCommand({
      Bucket: env.R2_BUCKET,
      Key: key,
      Body: body,
      ContentType: contentType,
      CacheControl: "private, max-age=31536000, immutable",
    }),
  );
}

export async function createPrivateUploadUrl(key: string, contentType: string, expiresInSeconds = 60 * 10): Promise<string> {
  const env = getAppEnv();
  return getSignedUrl(
    getR2Client(),
    new PutObjectCommand({
      Bucket: env.R2_BUCKET,
      Key: key,
      ContentType: contentType,
      CacheControl: "private, max-age=31536000, immutable",
    }),
    { expiresIn: expiresInSeconds },
  );
}

// R2에서 객체 내용을 서버가 직접 읽어온다 (브라우저 공유용 프록시에서 사용).
export async function getPrivateObjectBody(
  key: string,
): Promise<{ body: ReadableStream; contentType: string | undefined; contentLength: number | undefined }> {
  const env = getAppEnv();
  const res = await getR2Client().send(
    new GetObjectCommand({
      Bucket: env.R2_BUCKET,
      Key: key,
    }),
  );
  return {
    body: (res.Body as { transformToWebStream: () => ReadableStream }).transformToWebStream(),
    contentType: res.ContentType,
    contentLength: res.ContentLength,
  };
}

export async function privateObjectExists(key: string): Promise<boolean> {
  const env = getAppEnv();

  try {
    await getR2Client().send(
      new HeadObjectCommand({
        Bucket: env.R2_BUCKET,
        Key: key,
      }),
    );
    return true;
  } catch {
    return false;
  }
}

export async function deletePrivateObject(key: string): Promise<void> {
  const env = getAppEnv();
  await getR2Client().send(
    new DeleteObjectCommand({
      Bucket: env.R2_BUCKET,
      Key: key,
    }),
  );
}

// 브라우저 캐시를 살리려고 서명 URL을 1시간 창(window)에 고정한다.
// 같은 창 안에서는 매번 똑같은 URL이 나와서, 브라우저가 저장해둔 사진을 다시 안 받는다.
const URL_WINDOW_SECONDS = 60 * 60;

function windowedSigningDate(): Date {
  const nowSeconds = Math.floor(Date.now() / 1000);
  return new Date(Math.floor(nowSeconds / URL_WINDOW_SECONDS) * URL_WINDOW_SECONDS * 1000);
}

export async function getPrivateObjectUrl(key: string, expiresInSeconds = 60 * 60 * 3): Promise<string> {
  const env = getAppEnv();
  // 서명 시각을 창 시작으로 고정하니, 유효시간에 창 길이를 더해줘야
  // 창 후반부(예: 59분째)에도 요청한 시간만큼은 살아있다. (안 그러면 만료되어 사진이 안 뜸)
  return getSignedUrl(
    getR2Client(),
    new GetObjectCommand({
      Bucket: env.R2_BUCKET,
      Key: key,
    }),
    { expiresIn: expiresInSeconds + URL_WINDOW_SECONDS, signingDate: windowedSigningDate() },
  );
}

// Signed URL that forces a download (Content-Disposition: attachment) straight from R2,
// so photo bytes never pass through our server and R2 egress stays free.
export async function getPrivateDownloadUrl(key: string, downloadName: string, expiresInSeconds = 60 * 30): Promise<string> {
  const env = getAppEnv();
  const ext = key.split(".").pop() || "jpg";
  const encoded = encodeURIComponent(downloadName);
  // ASCII fallback + RFC 5987 UTF-8 name so Korean filenames survive.
  const disposition = `attachment; filename="photo.${ext}"; filename*=UTF-8''${encoded}`;

  return getSignedUrl(
    getR2Client(),
    new GetObjectCommand({
      Bucket: env.R2_BUCKET,
      Key: key,
      ResponseContentDisposition: disposition,
    }),
    { expiresIn: expiresInSeconds },
  );
}
