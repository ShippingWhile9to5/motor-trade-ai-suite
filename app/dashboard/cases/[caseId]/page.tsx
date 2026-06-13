import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";
import { getCaseAction } from "../../../actions/cases";
import { getCaseDocumentsAction } from "../../../actions/documents";
import { getExtractionAction } from "../../../actions/extractions";
import { getReviewAction } from "../../../actions/reviews";
import { getSubmissionAction } from "../../../actions/submissions";
import { CaseUploadSection } from "./case-upload-section";
import { ExtractionTrigger } from "./extraction-trigger";
import { ReviewPanel } from "./review-panel";
import { SubmissionPanel } from "./submission-panel";

type CaseDetailPageProps = {
  params: Promise<{
    caseId: string;
  }>;
};

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

function formatFileSize(size: number) {
  if (size < 1024 * 1024) {
    return `${Math.max(1, Math.round(size / 1024))} KB`;
  }

  return `${(size / 1024 / 1024).toFixed(1)} MB`;
}

function StatusValue({ children }: { children: React.ReactNode }) {
  return (
    <span className="w-fit rounded-full bg-slate-100 px-3 py-1 text-xs font-medium uppercase tracking-wide text-slate-700">
      {children}
    </span>
  );
}

function WorkflowProgress({
  steps,
}: {
  steps: Array<{
    label: string;
    detail: string;
    isComplete: boolean;
    isCurrent: boolean;
  }>;
}) {
  return (
    <section className="rounded-md border border-slate-200 bg-white px-4 py-5 sm:px-5">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
        Workflow progress
      </h2>
      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {steps.map((step) => (
          <div
            key={step.label}
            className={`rounded-md border px-4 py-3 ${
              step.isComplete
                ? "border-emerald-200 bg-emerald-50"
                : step.isCurrent
                  ? "border-sky-200 bg-sky-50"
                  : "border-slate-200 bg-slate-50"
            }`}
          >
            <div className="flex items-center gap-3">
              <span
                className={`h-3 w-3 shrink-0 rounded-full ${
                  step.isComplete
                    ? "bg-emerald-500"
                    : step.isCurrent
                      ? "bg-sky-500"
                      : "bg-slate-300"
                }`}
              />
              <p className="text-sm font-medium text-slate-950">{step.label}</p>
            </div>
            <p className="mt-2 text-sm text-slate-600">{step.detail}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

async function safelyLoad<T>(loader: () => Promise<T>, fallback: T): Promise<T> {
  try {
    return await loader();
  } catch {
    return fallback;
  }
}

export default async function CaseDetailPage({ params }: CaseDetailPageProps) {
  const { caseId } = await params;
  const parsedCaseId = z.string().uuid().safeParse(caseId);

  if (!parsedCaseId.success) {
    notFound();
  }

  const caseRecord = await getCaseAction({ id: parsedCaseId.data });

  if (!caseRecord) {
    notFound();
  }

  const [documents, extraction, submission] = await Promise.all([
    safelyLoad(() => getCaseDocumentsAction({ case_id: caseRecord.id }), []),
    safelyLoad(() => getExtractionAction({ case_id: caseRecord.id }), null),
    safelyLoad(() => getSubmissionAction({ case_id: caseRecord.id }), null),
  ]);

  const review = extraction
    ? await safelyLoad(
        () =>
          getReviewAction({
            case_id: caseRecord.id,
            extraction_id: extraction.id,
          }),
        null,
      )
    : null;
  const hasDocuments = documents.length > 0;
  const hasExtraction = Boolean(extraction?.raw_result_json);
  const hasApprovedReview = review?.review_status === "approved";
  const isSubmissionReady =
    submission?.submission_status === "ready" ||
    submission?.submission_status === "submitted";
  const workflowSteps = [
    {
      label: "Uploaded",
      detail: hasDocuments
        ? `${documents.length} document${documents.length === 1 ? "" : "s"} saved`
        : "No documents yet",
      isComplete: hasDocuments,
      isCurrent: !hasDocuments,
    },
    {
      label: "Extracted",
      detail:
        hasExtraction
          ? extraction?.status ?? "review_required"
          : hasDocuments
            ? "Ready to run"
            : "Waiting for upload",
      isComplete: hasExtraction,
      isCurrent: hasDocuments && !hasExtraction,
    },
    {
      label: "Reviewed",
      detail: review?.review_status ?? (hasExtraction ? "Awaiting review" : "Waiting for extraction"),
      isComplete: hasApprovedReview,
      isCurrent: hasExtraction && !hasApprovedReview,
    },
    {
      label: "Submission ready",
      detail:
        submission?.submission_status ??
        (hasApprovedReview ? "Ready to generate" : "Waiting for approved review"),
      isComplete: isSubmissionReady,
      isCurrent: hasApprovedReview && !isSubmissionReady,
    },
  ];

  return (
    <section className="flex flex-1 flex-col gap-6">
      <header className="space-y-3">
        <Link
          href="/dashboard"
          className="text-sm font-medium text-slate-600 hover:text-slate-950"
        >
          Back to dashboard
        </Link>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <h1 className="truncate text-3xl font-semibold text-slate-950 sm:text-4xl">
              {caseRecord.client_name}
            </h1>
            <p className="mt-3 text-base leading-7 text-slate-600">
              Created {formatDate(caseRecord.created_at)}. Updated{" "}
              {formatDate(caseRecord.updated_at)}.
            </p>
          </div>
          <StatusValue>{caseRecord.status}</StatusValue>
        </div>
      </header>

      <WorkflowProgress steps={workflowSteps} />

      <div className="grid gap-4 md:grid-cols-2">
        <section className="rounded-md border border-slate-200 bg-white px-4 py-5 sm:px-5">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
            Case metadata
          </h2>
          <dl className="mt-4 space-y-3 text-sm">
            <div className="flex items-center justify-between gap-4">
              <dt className="text-slate-500">Client</dt>
              <dd className="truncate font-medium text-slate-950">
                {caseRecord.client_name}
              </dd>
            </div>
            <div className="flex items-center justify-between gap-4">
              <dt className="text-slate-500">Status</dt>
              <dd className="font-medium text-slate-950">{caseRecord.status}</dd>
            </div>
          </dl>
        </section>

        <section className="rounded-md border border-slate-200 bg-white px-4 py-5 sm:px-5">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
            Extraction
          </h2>
          <div className="mt-4 space-y-2">
            <StatusValue>{extraction?.status ?? "not_started"}</StatusValue>
            <p className="text-sm text-slate-600">
              {extraction
                ? `Last updated ${formatDate(extraction.updated_at)}.`
                : hasDocuments
                  ? "No extraction result yet. Run extraction when ready."
                  : "Upload a document before running extraction."}
            </p>
          </div>
          <ExtractionTrigger
            caseId={caseRecord.id}
            documentReferenceId={documents[0]?.id}
            extractionStatus={hasExtraction ? extraction?.status : undefined}
          />
        </section>

        <section className="rounded-md border border-slate-200 bg-white px-4 py-5 sm:px-5">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
            Review
          </h2>
          <div className="mt-4 space-y-2">
            <StatusValue>{review?.review_status ?? "not_started"}</StatusValue>
            <p className="text-sm text-slate-600">
              {review?.reviewed_at
                ? `Reviewed ${formatDate(review.reviewed_at)}.`
                : hasExtraction
                  ? "Extraction is available for review."
                  : "No review available until extraction has run."}
            </p>
          </div>
        </section>

        <section className="rounded-md border border-slate-200 bg-white px-4 py-5 sm:px-5">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
            Submission
          </h2>
          <div className="mt-4 space-y-2">
            <StatusValue>{submission?.submission_status ?? "not_started"}</StatusValue>
            <p className="text-sm text-slate-600">
              {submission
                ? `Created ${formatDate(submission.created_at)}.`
                : hasApprovedReview
                  ? "Approved review is ready for submission generation."
                  : "No submission draft until review is approved."}
            </p>
            <Link
              href={`/dashboard/cases/${caseRecord.id}/submission-composer`}
              className="inline-flex min-h-11 items-center text-sm font-medium text-sky-700 hover:text-sky-900"
            >
              Open submission composer
            </Link>
          </div>
        </section>
      </div>

      <ReviewPanel
        caseId={caseRecord.id}
        extractionId={extraction?.id}
        extractionOutput={extraction?.raw_result_json ?? null}
        review={review}
      />

      <SubmissionPanel
        caseId={caseRecord.id}
        extractionId={extraction?.id}
        reviewStatus={review?.review_status}
        submission={submission}
      />

      <CaseUploadSection caseId={caseRecord.id} />

      <section className="rounded-md border border-slate-200 bg-white px-4 py-5 sm:px-5">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
            Documents
          </h2>
          <p className="text-sm text-slate-500">{documents.length} uploaded</p>
        </div>

        {documents.length === 0 ? (
          <div className="mt-4 rounded-md border border-dashed border-slate-300 bg-slate-50 px-4 py-8 text-center">
            <p className="text-sm font-medium text-slate-950">No documents yet.</p>
            <p className="mt-1 text-sm text-slate-600">
              Upload a PDF or photo to start the workflow.
            </p>
          </div>
        ) : (
          <ul className="mt-4 divide-y divide-slate-200">
            {documents.map((document) => (
              <li
                key={document.id}
                className="flex flex-col gap-1 py-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-slate-950">
                    {document.file_name}
                  </p>
                  <p className="text-xs text-slate-500">
                    {document.file_type} - Uploaded {formatDate(document.uploaded_at)}
                  </p>
                </div>
                <p className="text-sm text-slate-500">
                  {formatFileSize(document.file_size)}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </section>
  );
}
