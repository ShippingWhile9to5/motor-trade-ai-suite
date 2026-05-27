"use client";

import { type ChangeEvent, type DragEvent, useRef, useState } from "react";
import {
  allowedFileExtensions,
  allowedFileMimeTypes,
  validateUploadFile,
} from "../../lib/validation/files";

type FileUploadProps = {
  onFilesChange?: (files: File[]) => void;
};

const fileAccept = [...allowedFileExtensions, ...allowedFileMimeTypes].join(",");
const cameraFileAccept = [
  ".jpg",
  ".jpeg",
  ".png",
  ".heic",
  ".heif",
  "image/jpeg",
  "image/png",
  "image/heic",
  "image/heif",
].join(",");

function getFileKey(file: File) {
  return `${file.name}-${file.size}-${file.lastModified}`;
}

function formatFileSize(size: number) {
  if (size < 1024 * 1024) {
    return `${Math.max(1, Math.round(size / 1024))} KB`;
  }

  return `${(size / 1024 / 1024).toFixed(1)} MB`;
}

export function FileUpload({ onFilesChange }: FileUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [rejectedFiles, setRejectedFiles] = useState<string[]>([]);
  const [isDragging, setIsDragging] = useState(false);

  function updateSelectedFiles(files: File[]) {
    setSelectedFiles(files);
    onFilesChange?.(files);
  }

  function addFiles(files: FileList | File[]) {
    const incomingFiles = Array.from(files);
    const acceptedFiles: File[] = [];
    const rejectedFileMessages: string[] = [];

    incomingFiles.forEach((file) => {
      const validation = validateUploadFile(file);

      if (validation.success) {
        acceptedFiles.push(file);
        return;
      }

      rejectedFileMessages.push(
        `${file.name}: ${validation.errors.map((error) => error.message).join(" ")}`,
      );
    });

    const existingFileKeys = new Set(selectedFiles.map(getFileKey));
    const newFiles = acceptedFiles.filter(
      (file) => !existingFileKeys.has(getFileKey(file)),
    );

    updateSelectedFiles([...selectedFiles, ...newFiles]);
    setRejectedFiles(rejectedFileMessages);
  }

  function handleInputChange(event: ChangeEvent<HTMLInputElement>) {
    if (event.target.files) {
      addFiles(event.target.files);
    }

    event.target.value = "";
  }

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setIsDragging(false);
    addFiles(event.dataTransfer.files);
  }

  function removeFile(fileToRemove: File) {
    updateSelectedFiles(
      selectedFiles.filter((file) => getFileKey(file) !== getFileKey(fileToRemove)),
    );
  }

  return (
    <div className="w-full space-y-4">
      <div
        className={`flex min-h-40 flex-col items-center justify-center rounded-md border border-dashed px-4 py-6 text-center transition sm:px-6 sm:py-8 ${
          isDragging
            ? "border-sky-500 bg-sky-50"
            : "border-slate-300 bg-white hover:border-slate-400"
        }`}
        onDragEnter={() => setIsDragging(true)}
        onDragLeave={() => setIsDragging(false)}
        onDragOver={(event) => event.preventDefault()}
        onDrop={handleDrop}
      >
        <input
          ref={inputRef}
          type="file"
          multiple
          accept={fileAccept}
          className="sr-only"
          onChange={handleInputChange}
        />
        <input
          ref={cameraInputRef}
          type="file"
          accept={cameraFileAccept}
          capture="environment"
          className="sr-only"
          onChange={handleInputChange}
        />
        <p className="text-base font-medium text-slate-950">
          Drop files here or choose from your device
        </p>
        <p className="mt-2 text-sm text-slate-600">PDF, JPG, PNG, HEIC, HEIF</p>
        <div className="mt-5 flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
          <button
            type="button"
            className="w-full rounded-md bg-slate-950 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 sm:w-auto"
            onClick={() => inputRef.current?.click()}
          >
            Choose files
          </button>
          <button
            type="button"
            className="w-full rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-950 hover:bg-slate-50 sm:w-auto"
            onClick={() => cameraInputRef.current?.click()}
          >
            Take photo
          </button>
        </div>
      </div>

      {rejectedFiles.length > 0 ? (
        <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <p className="font-medium">Some files could not be selected.</p>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            {rejectedFiles.map((message) => (
              <li key={message}>{message}</li>
            ))}
          </ul>
        </div>
      ) : null}

      {selectedFiles.length > 0 ? (
        <ul className="divide-y divide-slate-200 rounded-md border border-slate-200 bg-white">
          {selectedFiles.map((file) => (
            <li
              key={getFileKey(file)}
              className="flex items-center justify-between gap-4 px-4 py-3"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-slate-950">
                  {file.name}
                </p>
                <p className="text-xs text-slate-500">{formatFileSize(file.size)}</p>
              </div>
              <button
                type="button"
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-lg leading-none text-slate-500 hover:bg-slate-100 hover:text-slate-950"
                aria-label={`Remove ${file.name}`}
                onClick={() => removeFile(file)}
              >
                &times;
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
