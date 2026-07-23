"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { extractPolicyScheduleAction } from "../../app/actions/policy-letter";
import {
  INSURERS,
  DRIVER_BASIS_OPTIONS,
  createBlankPolicyLetterManualInput,
  defaultBenefitsForInsurer,
  generatePolicyLetterOutputs,
  resolveDriverBasis,
  type Insurer,
  type PolicyLetterManualInput,
  type PolicyLetterOutputs,
} from "../../lib/policy-letter";
import type { ExtractedPolicyData } from "../../lib/schemas/policy-letter";

type CopyState = "idle" | "copied" | "failed";
type ExtractState = "idle" | "extracting" | "failed";

function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-md border border-slate-200 bg-white px-4 py-5 sm:px-5">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
        {title}
      </h2>
      <div className="mt-5 space-y-4">{children}</div>
    </section>
  );
}

function CopyButton({ text }: { text: string }) {
  const [state, setState] = useState<CopyState>("idle");

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(text);
      setState("copied");
      window.setTimeout(() => setState("idle"), 1800);
    } catch {
      setState("failed");
      window.setTimeout(() => setState("idle"), 1800);
    }
  }

  return (
    <button
      type="button"
      className="min-h-11 shrink-0 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-950 hover:bg-slate-50"
      onClick={handleCopy}
    >
      {state === "copied" ? "Copied" : state === "failed" ? "Copy failed" : "Copy"}
    </button>
  );
}

function TextInput({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  return (
    <label className="block">
      <span className="block text-sm font-medium text-slate-950">{label}</span>
      <input
        type="text"
        value={value}
        placeholder={placeholder}
        className="mt-2 min-h-11 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-950"
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  );
}

function CheckboxInput({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="flex min-h-11 items-center gap-3 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-950">
      <input
        type="checkbox"
        checked={checked}
        className="h-4 w-4"
        onChange={(event) => onChange(event.target.checked)}
      />
      <span>{label}</span>
    </label>
  );
}

function EditableList({
  title,
  items,
  onChange,
}: {
  title: string;
  items: string[];
  onChange: (items: string[]) => void;
}) {
  return (
    <div>
      <h3 className="text-sm font-medium text-slate-950">
        {title} ({items.length})
      </h3>
      {items.length === 0 ? (
        <p className="mt-2 text-sm text-slate-500">None found in document.</p>
      ) : (
        <div className="mt-2 space-y-2">
          {items.map((item, index) => (
            <div key={index} className="flex items-center gap-2">
              <input
                type="text"
                value={item}
                className="min-h-11 flex-1 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-950"
                onChange={(event) => {
                  const next = [...items];
                  next[index] = event.target.value;
                  onChange(next);
                }}
              />
              <button
                type="button"
                className="min-h-11 shrink-0 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-600 hover:bg-slate-50"
                onClick={() => onChange(items.filter((_, i) => i !== index))}
              >
                Remove
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function OutputCard({ title, text }: { title: string; text: string }) {
  return (
    <section className="rounded-md border border-slate-200 bg-white px-4 py-5 sm:px-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
          {title}
        </h2>
        <CopyButton text={text} />
      </div>
      <pre className="mt-4 whitespace-pre-wrap rounded-md border border-slate-200 bg-slate-50 p-4 text-sm leading-6 text-slate-950">
        {text}
      </pre>
    </section>
  );
}

export function PolicyLetterPanel() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [extractState, setExtractState] = useState<ExtractState>("idle");
  const [extractError, setExtractError] = useState<string | null>(null);
  const [extractedData, setExtractedData] = useState<ExtractedPolicyData | null>(
    null,
  );
  const [manualInput, setManualInput] = useState<PolicyLetterManualInput>(
    createBlankPolicyLetterManualInput,
  );
  const [outputs, setOutputs] = useState<PolicyLetterOutputs | null>(null);

  function updateManualField<Key extends keyof PolicyLetterManualInput>(
    key: Key,
    value: PolicyLetterManualInput[Key],
  ) {
    setManualInput((current) => ({ ...current, [key]: value }));
  }

  // Selecting an insurer applies that insurer's standard benefits; both
  // checkboxes stay editable afterwards.
  function handleInsurerChange(insurer: Insurer | "") {
    setManualInput((current) => ({
      ...current,
      insurer,
      benefits: defaultBenefitsForInsurer(insurer),
    }));
  }

  function handleFileSelect(files: FileList | null) {
    const file = files?.[0];

    if (!file) {
      return;
    }

    setSelectedFile(file);
    setExtractedData(null);
    setExtractError(null);
    setOutputs(null);
  }

  async function handleExtract() {
    if (!selectedFile) {
      return;
    }

    setExtractState("extracting");
    setExtractError(null);

    const formData = new FormData();
    formData.append("file", selectedFile);

    const result = await extractPolicyScheduleAction(formData);

    if (!result.success) {
      setExtractState("failed");
      setExtractError(result.error);
      return;
    }

    setExtractState("idle");
    setExtractedData(result.data);
  }

  function handleGenerateLetter() {
    setOutputs(generatePolicyLetterOutputs(extractedData, manualInput));
  }

  const canGenerateLetter =
    resolveDriverBasis(manualInput) !== "" && manualInput.quoteDate !== "";

  return (
    <section className="flex flex-1 flex-col gap-6">
      <header className="space-y-3">
        <Link
          href="/"
          className="text-sm font-medium text-slate-600 hover:text-slate-950"
        >
          Back to home
        </Link>
        <div>
          <h1 className="text-3xl font-semibold text-slate-950 sm:text-4xl">
            Policy Letter Generator
          </h1>
          <p className="mt-3 max-w-3xl text-base leading-7 text-slate-600">
            Upload the policy schedule once a quote is accepted, review the
            extracted endorsements/conditions/exclusions/excesses, add the
            quote details, then copy each block into Acturis. Nothing here is
            saved.
          </p>
        </div>
      </header>

      <Section title="1. Upload policy schedule PDF">
        <input
          ref={fileInputRef}
          type="file"
          accept="application/pdf"
          className="hidden"
          onChange={(event) => handleFileSelect(event.target.files)}
        />
        {!selectedFile ? (
          <button
            type="button"
            className="w-full rounded-md border-2 border-dashed border-slate-300 bg-slate-50 px-4 py-8 text-center hover:border-slate-400"
            onClick={() => fileInputRef.current?.click()}
          >
            <p className="text-sm font-medium text-slate-950">
              Click to select a PDF
            </p>
            <p className="mt-1 text-sm text-slate-500">PDF files only, up to 10MB</p>
          </button>
        ) : (
          <div className="flex items-center justify-between rounded-md border border-slate-200 bg-slate-50 px-4 py-3">
            <div>
              <p className="text-sm font-medium text-slate-950">
                {selectedFile.name}
              </p>
              <p className="text-sm text-slate-500">
                {formatFileSize(selectedFile.size)}
              </p>
            </div>
            <div className="flex items-center gap-3">
              {!extractedData ? (
                <button
                  type="button"
                  className="min-h-11 rounded-md border border-slate-300 bg-slate-950 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-60"
                  onClick={handleExtract}
                  disabled={extractState === "extracting"}
                >
                  {extractState === "extracting" ? "Extracting..." : "Extract Data"}
                </button>
              ) : null}
              <button
                type="button"
                className="min-h-11 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-950 hover:bg-slate-50"
                onClick={() => {
                  setSelectedFile(null);
                  setExtractedData(null);
                  setExtractError(null);
                  setOutputs(null);
                  if (fileInputRef.current) {
                    fileInputRef.current.value = "";
                  }
                }}
              >
                Remove
              </button>
            </div>
          </div>
        )}
        {extractError ? (
          <p className="text-sm text-red-600">{extractError}</p>
        ) : null}
      </Section>

      {extractedData ? (
        <Section title="2. Review extracted data">
          <p className="text-sm text-slate-600">
            Edit or remove anything before it goes into the letter.
          </p>

          <EditableList
            title="Excesses"
            items={extractedData.excesses}
            onChange={(items) =>
              setExtractedData({ ...extractedData, excesses: items })
            }
          />
          <EditableList
            title="Endorsements & Conditions"
            items={extractedData.endorsementsAndConditions}
            onChange={(items) =>
              setExtractedData({ ...extractedData, endorsementsAndConditions: items })
            }
          />
          <EditableList
            title="Significant exclusions"
            items={extractedData.exclusions}
            onChange={(items) =>
              setExtractedData({ ...extractedData, exclusions: items })
            }
          />
          <TextInput
            label="Driver basis (as extracted from the schedule)"
            value={extractedData.driverBasis}
            onChange={(value) =>
              setExtractedData({ ...extractedData, driverBasis: value })
            }
          />
        </Section>
      ) : null}

      <Section title={extractedData ? "3. Quote details" : "2. Quote details"}>
        <div className="grid gap-4 md:grid-cols-2">
          <label className="block">
            <span className="block text-sm font-medium text-slate-950">
              Insurer
            </span>
            <select
              value={manualInput.insurer}
              className="mt-2 min-h-11 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-950"
              onChange={(event) =>
                handleInsurerChange(event.target.value as Insurer | "")
              }
            >
              <option value="">Select insurer</option>
              {INSURERS.map((insurer) => (
                <option key={insurer} value={insurer}>
                  {insurer}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="block text-sm font-medium text-slate-950">
              Quote date
            </span>
            <input
              type="date"
              value={manualInput.quoteDate}
              className="mt-2 min-h-11 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-950"
              onChange={(event) =>
                updateManualField("quoteDate", event.target.value)
              }
            />
            <span className="mt-1 block text-xs text-slate-500">
              The quotation is valid for 30 days from this date.
            </span>
          </label>
        </div>

        <label className="block">
          <span className="block text-sm font-medium text-slate-950">
            Driver basis
          </span>
          <select
            value={manualInput.driverBasis}
            className="mt-2 min-h-11 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-950"
            onChange={(event) =>
              updateManualField(
                "driverBasis",
                event.target.value as PolicyLetterManualInput["driverBasis"],
              )
            }
          >
            <option value="">Select driver basis</option>
            {DRIVER_BASIS_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>

        <TextInput
          label="Or type a different driver basis (overrides the dropdown)"
          value={manualInput.driverBasisOverride}
          onChange={(value) => updateManualField("driverBasisOverride", value)}
          placeholder="e.g. Any driver for Business and named for SDP use"
        />

        <div>
          <h3 className="text-sm font-medium text-slate-950">
            Benefits included
          </h3>
          <p className="mt-1 text-xs text-slate-500">
            Ticked automatically based on the insurer selected - change them if
            this policy differs.
          </p>
          <div className="mt-2 grid gap-2 sm:grid-cols-2">
            <CheckboxInput
              label="Premier Protected NCD"
              checked={manualInput.benefits.premierProtectedNcd}
              onChange={(checked) =>
                updateManualField("benefits", {
                  ...manualInput.benefits,
                  premierProtectedNcd: checked,
                })
              }
            />
            <CheckboxInput
              label="Low Claims Rebate"
              checked={manualInput.benefits.lowClaimsRebate}
              onChange={(checked) =>
                updateManualField("benefits", {
                  ...manualInput.benefits,
                  lowClaimsRebate: checked,
                })
              }
            />
          </div>
        </div>
      </Section>

      <div className="flex flex-col items-center gap-2">
        <button
          type="button"
          className="min-h-11 rounded-md border border-slate-300 bg-slate-950 px-8 py-3 text-base font-medium text-white hover:bg-slate-800 disabled:opacity-60"
          onClick={handleGenerateLetter}
          disabled={!canGenerateLetter}
        >
          Generate Letter
        </button>
        {!canGenerateLetter ? (
          <p className="text-sm text-slate-500">
            Select or type a driver basis, and set the quote date, to generate.
          </p>
        ) : null}
      </div>

      {outputs ? (
        <div className="space-y-6">
          <OutputCard
            title="Opening paragraph"
            text={outputs.openingParagraph}
          />
          {outputs.endorsementsAndConditions ? (
            <OutputCard
              title="Endorsements and Conditions"
              text={outputs.endorsementsAndConditions}
            />
          ) : null}
          {outputs.significantExclusions ? (
            <OutputCard
              title="Significant Exclusions and Non-Standard Excesses"
              text={outputs.significantExclusions}
            />
          ) : null}
          {outputs.excesses ? (
            <OutputCard title="Excesses" text={outputs.excesses} />
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
