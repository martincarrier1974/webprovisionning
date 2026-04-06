/** BigInt n’est pas JSON-serializable ; Prisma renvoie fileSizeBytes en BigInt. */
export function firmwareForJsonResponse<T extends { fileSizeBytes: bigint | null }>(f: T) {
  return {
    ...f,
    fileSizeBytes: f.fileSizeBytes != null ? f.fileSizeBytes.toString() : null,
  };
}
