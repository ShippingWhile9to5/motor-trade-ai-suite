export const allowedFileMimeTypes = [
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/heic",
  "image/heif",
] as const;

export const allowedFileExtensions = [
  ".pdf",
  ".jpg",
  ".jpeg",
  ".png",
  ".heic",
  ".heif",
] as const;

const allowedMimeTypeSet = new Set<string>(allowedFileMimeTypes);
const allowedExtensionSet = new Set<string>(allowedFileExtensions);

export const maxUploadFileSizeBytes = 25 * 1024 * 1024;

export type FileValidationErrorCode =
  | "empty_file"
  | "invalid_extension"
  | "invalid_mime_type"
  | "file_too_large";

export type FileValidationError = {
  code: FileValidationErrorCode;
  message: string;
};

export type FileValidationResult =
  | { success: true }
  | { success: false; errors: FileValidationError[] };

export function getFileExtension(fileName: string) {
  const extension = fileName.split(".").pop()?.toLowerCase();

  return extension ? `.${extension}` : "";
}

export function validateUploadFile(file: File): FileValidationResult {
  const errors: FileValidationError[] = [];
  const extension = getFileExtension(file.name);

  if (file.size === 0) {
    errors.push({
      code: "empty_file",
      message: "File is empty.",
    });
  }

  if (file.size > maxUploadFileSizeBytes) {
    errors.push({
      code: "file_too_large",
      message: "File is larger than 25 MB.",
    });
  }

  if (!allowedExtensionSet.has(extension)) {
    errors.push({
      code: "invalid_extension",
      message: "File extension is not supported.",
    });
  }

  if (!allowedMimeTypeSet.has(file.type)) {
    errors.push({
      code: "invalid_mime_type",
      message: "File type is not supported.",
    });
  }

  if (errors.length > 0) {
    return {
      success: false,
      errors,
    };
  }

  return { success: true };
}
