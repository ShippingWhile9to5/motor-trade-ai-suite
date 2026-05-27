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
    getCaseDocumentsAction({ case_id: caseRecord.id }),
    getExtractionAction({ case_id: caseRecord.id }),
    getSubmissionAction({ case_id: caseRecord.id }),
  ]);

  const review = extraction
    ? await getReviewAction({
        case_id: caseRecord.id,
        extraction_id: extraction.id,
      })
    : null;

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

      <div className="grid gap-4 md:grid-cols-2">
        <section className="rounded-md border border-slate-200 bg-white px-4 py-4">
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

        <section className="rounded-md border border-slate-200 bg-white px-4 py-4">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
            Extraction
          </h2>
          <div className="mt-4 space-y-2">
            <StatusValue>{extraction?.status ?? "not_started"}</StatusValue>
            <p className="text-sm text-slate-600">
              {extraction
                ? `Last updated ${formatDate(extraction.updated_at)}.`
                : "No extraction result yet."}
            </p>
          </div>
          <ExtractionTrigger
            caseId={caseRecord.id}
            documentReferenceId={documents[0]?.id}
            extractionStatus={extraction?.status}
          />
        </section>

        <section className="rounded-md border border-slate-200 bg-white px-4 py-4">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
            Review
          </h2>
          <div className="mt-4 space-y-2">
            <StatusValue>{review?.review_status ?? "not_started"}</StatusValue>
            <p className="text-sm text-slate-600">
              {review?.reviewed_at
                ? `Reviewed ${formatDate(review.reviewed_at)}.`
                : "No review recorded yet."}
            </p>
          </div>
        </section>

        <section className="rounded-md border border-slate-200 bg-white px-4 py-4">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
            Submission
          </h2>
          <div className="mt-4 space-y-2">
            <StatusValue>{submission?.submission_status ?? "not_started"}</StatusValue>
            <p className="text-sm text-slate-600">
              {submission
                ? `Created ${formatDate(submission.created_at)}.`
                : "No submission draft yet."}
            </p>
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

      <section className="rounded-md border border-slate-200 bg-white px-4 py-4">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
            Documents
          </h2>
          <p className="text-sm text-slate-500">{documents.length} uploaded</p>
        </div>

        {documents.length === 0 ? (
          <div className="mt-4 rounded-md border border-dashed border-slate-300 px-4 py-6 text-center">
            <p className="text-sm font-medium text-slate-950">No documents yet.</p>
            <p className="mt-1 text-sm text-slate-600">
              Uploaded document references will appear here.
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
