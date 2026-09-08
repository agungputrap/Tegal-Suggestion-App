export const MAX_PHOTO_BYTES = 5 * 1024 * 1024; // 5MB, cukup untuk foto HP tanpa bikin R2 write mahal

export const EXT_BY_TYPE: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};
