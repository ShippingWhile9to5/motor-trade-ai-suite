import { notFound } from "next/navigation";
import { z } from "zod";
import { getCaseAction } from "../../../../actions/cases";
import { getExtractionAction } from "../../../../actions/extractions";
import { getReviewAction } from "../../../../actions/reviews";
import { getSubmissionAction } from "../../../../actions/submissions";
import { deriveSubmissionComposerInput } from "../../../../../lib/submission-composer";
import { SubmissionComposerPanel } from "./composer-panel";

type SubmissionComposerPageProps = {
  params: Promise<{
    caseId: string;
  }>;
};

async function safelyLoad<T>(loader: () => Promise<T>, fallback: T): Promise<T> {
  try {
    return await loader();
  } catch {
    return fallback;
  }
}

export default async function SubmissionComposerPage({
  params,
}: SubmissionComposerPageProps) {
  const { caseId } = await params;
  const parsedCaseId = z.string().uuid().safeParse(caseId);

  if (!parsedCaseId.success) {
    notFound();
  }

  const caseRecord = await getCaseAction({ id: parsedCaseId.data });

  if (!caseRecord) {
    notFound();
  }

  const [extraction, submission] = await Promise.all([
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

  const approvedOutput =
    review?.review_status === "approved" ? review.reviewed_output : null;

  if (!approvedOutput) {
    return (
      <section className="flex flex-1 flex-col gap-6">
        <div className="rounded-md border border-slate-200 bg-white px-4 py-5 sm:px-5">
          <h1 className="text-2xl font-semibold text-slate-950">
            Submission Composer
          </h1>
          <p className="mt-3 text-sm leading-6 text-slate-600">
            This page opens once the extraction review has been approved. That
            keeps the generated wording tied to human-checked fact-find data.
          </p>
        </div>
      </section>
    );
  }

  const initialInput = deriveSubmissionComposerInput(approvedOutput);

  return (
    <SubmissionComposerPanel
      caseId={caseRecord.id}
      initialInput={initialInput}
      submissionStatus={submission?.submission_status}
    />
  );
}
