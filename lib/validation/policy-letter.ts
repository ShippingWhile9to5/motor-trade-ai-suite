const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024;

export function validatePolicyScheduleFile(file: File): string | null {
  if (file.size === 0) {
    return "The uploaded file is empty.";
  }

  if (file.size > MAX_FILE_SIZE_BYTES) {
    return "The uploaded file is too large (max 10MB).";
  }

  if (file.type !== "application/pdf") {
    return "Please upload a PDF file.";
  }

  return null;
}
