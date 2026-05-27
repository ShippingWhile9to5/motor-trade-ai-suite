"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { uploadCaseDocumentsAction } from "../../../actions/documents";
import { FileUpload } from "../../../components/file-upload";

type CaseUploadSectionProps = {
  caseId: string;
};

export function CaseUploadSection({ caseId }: CaseUploadSectionProps) {
  const router = useRouter();
  const [files, setFiles] = useState<File[]>([]);
  const [errors, setErrors] = useState<string[]>([]);
  const [message, setMessage] = useState("");
  const [isPending, startTransition] = useTransition();

  function handleUpload() {
    setErrors([]);
    setMessage("");

    if (files.length === 0) {
      setErrors(["Choose at least one file."]);
      return;
    }

    const formData = new FormData();
    formData.append("case_id", caseId);
    files.forEach((file) => formData.append("files", file));

    startTransition(async () => {
      const result = await uploadCaseDocumentsAction(formData);

      if (!result.success) {
        setErrors(result.errors);
        return;
      }

      setMessage(`${result.references.length} file reference saved.`);
      setFiles([]);
      router.refresh();
    });
  }

  return (
    <section className="rounded-md border border-slate-200 bg-white px-4 py-5 sm:px-5">
      <div className="mb-4">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
          Upload documents
        </h2>
        <p className="mt-2 text-sm text-slate-600">
          Select fact-find PDFs or photos from your device.
        </p>
      </div>

      <FileUpload onFilesChange={setFiles} />

      {errors.length > 0 ? (
        <div className="mt-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <p className="font-medium">Upload could not be completed.</p>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            {errors.map((error) => (
              <li key={error}>{error}</li>
            ))}
          </ul>
        </div>
      ) : null}

      {message ? (
        <p className="mt-4 rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          {message}
        </p>
      ) : null}

      <button
        type="button"
        className="mt-4 min-h-11 w-full rounded-md bg-slate-950 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300 sm:w-auto"
        disabled={isPending || files.length === 0}
        onClick={handleUpload}
      >
        {isPending ? "Saving..." : "Save document references"}
      </button>
    </section>
  );
}
