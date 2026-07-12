"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { extractPolicyScheduleAction } from "../../app/actions/policy-letter";
import {
  INSURERS,
  DRIVER_BASIS_OPTIONS,
  blankPolicyLetterManualInput,
  calculateTotals,
  generateLetter,
  type Insurer,
  type PolicyLetterManualInput,
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

function NumberInput({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: number | "";
  onChange: (value: number | "") => void;
  placeholder?: string;
}) {
  return (
    <label className="block">
      <span className="block text-sm font-medium text-slate-950">{label}</span>
      <input
        type="number"
        step="0.01"
        min="0"
        value={value}
        placeholder={placeholder}
        className="mt-2 min-h-11 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-950"
        onChange={(event) =>
          onChange(event.target.value === "" ? "" : Number(event.target.value))
        }
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

export function PolicyLetterPanel() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [extractState, setExtractState] = useState<ExtractState>("idle");
  const [extractError, setExtractError] = useState<string | null>(null);
  const [extractedData, setExtractedData] = useState<ExtractedPolicyData | null>(
    null,
  );
  const [manualInput, setManualInput] = useState<PolicyLetterManualInput>(
    blankPolicyLetterManualInput,
  );
  const [generatedLetter, setGeneratedLetter] = useState<string | null>(null);
  const [copyState, setCopyState] = useState<CopyState>("idle");

  function updateManualField<Key extends keyof PolicyLetterManualInput>(
    key: Key,
    value: PolicyLetterManualInput[Key],
  ) {
    setManualInput((current) => ({ ...current, [key]: value }));
  }

  function toggleInsurerApproached(insurer: Insurer) {
    setManualInput((current) => ({
      ...current,
      insurersApproached: current.insurersApproached.includes(insurer)
        ? current.insurersApproached.filter((value) => value !== insurer)
        : [...current.insurersApproached, insurer],
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
    setGeneratedLetter(null);
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
    setGeneratedLetter(generateLetter(extractedData, manualInput));
  }

  async function handleCopy() {
    if (!generatedLetter) {
      return;
    }

    try {
      await navigator.clipboard.writeText(generatedLetter);
      setCopyState("copied");
    } catch {
      setCopyState("failed");
    }
    window.setTimeout(() => setCopyState("idle"), 1800);
  }

  const totals = calculateTotals(manualInput);
  const canGenerateLetter =
    manualInput.insurer !== "" &&
    manualInput.premiumExclIPT !== "" &&
    manualInput.ipt !== "";

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
            quote figures, and copy the letter into Acturis and your client
            email. Nothing here is saved.
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
                  setGeneratedLetter(null);
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

          <div>
            <h3 className="text-sm font-medium text-slate-950">
              Excesses ({extractedData.excesses.length})
            </h3>
            {extractedData.excesses.length === 0 ? (
              <p className="mt-2 text-sm text-slate-500">
                None found in document.
              </p>
            ) : (
              <div className="mt-2 space-y-3">
                {extractedData.excesses.map((excess, index) => (
                  <div
                    key={index}
                    className="grid gap-2 rounded-md border border-slate-200 bg-slate-50 p-3 sm:grid-cols-3"
                  >
                    <input
                      type="text"
                      value={excess.category}
                      placeholder="Category"
                      className="min-h-11 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-950"
                      onChange={(event) => {
                        const next = [...extractedData.excesses];
                        next[index] = { ...next[index], category: event.target.value };
                        setExtractedData({ ...extractedData, excesses: next });
                      }}
                    />
                    <input
                      type="text"
                      value={excess.amount}
                      placeholder="Amount"
                      className="min-h-11 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-950"
                      onChange={(event) => {
                        const next = [...extractedData.excesses];
                        next[index] = { ...next[index], amount: event.target.value };
                        setExtractedData({ ...extractedData, excesses: next });
                      }}
                    />
                    <button
                      type="button"
                      className="min-h-11 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-600 hover:bg-slate-100"
                      onClick={() =>
                        setExtractedData({
                          ...extractedData,
                          excesses: extractedData.excesses.filter((_, i) => i !== index),
                        })
                      }
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

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
            label="Driver basis"
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
                updateManualField("insurer", event.target.value as Insurer | "")
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
        </div>

        <TextInput
          label="Business description"
          value={manualInput.businessDescription}
          onChange={(value) => updateManualField("businessDescription", value)}
          placeholder="e.g., Motor Trade with Taxi"
        />

        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          <NumberInput
            label="Premium excl. IPT (£)"
            value={manualInput.premiumExclIPT}
            onChange={(value) => updateManualField("premiumExclIPT", value)}
          />
          <NumberInput
            label="IPT (£)"
            value={manualInput.ipt}
            onChange={(value) => updateManualField("ipt", value)}
          />
          <NumberInput
            label="VAT (£)"
            value={manualInput.vat}
            onChange={(value) => updateManualField("vat", value)}
            placeholder="optional"
          />
          <NumberInput
            label="Admin Fee (£)"
            value={manualInput.adminFee}
            onChange={(value) => updateManualField("adminFee", value)}
          />
        </div>

        <div className="flex items-center justify-between rounded-md border border-sky-200 bg-sky-50 px-4 py-3">
          <span className="text-sm font-medium text-slate-700">
            Total (Premium + IPT + VAT + Admin Fee)
          </span>
          <span className="text-lg font-semibold text-sky-700">
            £{totals.total.toFixed(2)}
          </span>
        </div>

        <div>
          <h3 className="text-sm font-medium text-slate-950">Deposit</h3>
          <div className="mt-2 space-y-3">
            <CheckboxInput
              label="Deposit required"
              checked={manualInput.depositRequired}
              onChange={(checked) => updateManualField("depositRequired", checked)}
            />
            {manualInput.depositRequired ? (
              <NumberInput
                label="Deposit percentage (%)"
                value={manualInput.depositPercentage}
                onChange={(value) => updateManualField("depositPercentage", value)}
              />
            ) : null}
          </div>
        </div>

        <div>
          <h3 className="text-sm font-medium text-slate-950">
            Investec premium finance (10 months)
          </h3>
          <div className="mt-2 grid gap-4 md:grid-cols-2">
            <NumberInput
              label="Interest rate (%)"
              value={manualInput.investecFinanceRate}
              onChange={(value) => updateManualField("investecFinanceRate", value)}
            />
            <NumberInput
              label="APR (%)"
              value={manualInput.investecAPR}
              onChange={(value) => updateManualField("investecAPR", value)}
            />
          </div>
        </div>

        <div>
          <h3 className="text-sm font-medium text-slate-950">
            Insurer&apos;s own instalment option
          </h3>
          <div className="mt-2 space-y-3">
            <CheckboxInput
              label="Available"
              checked={manualInput.insurerInstalmentAvailable}
              onChange={(checked) =>
                updateManualField("insurerInstalmentAvailable", checked)
              }
            />
            {manualInput.insurerInstalmentAvailable ? (
              <div className="grid gap-4 md:grid-cols-2">
                <NumberInput
                  label="Interest rate (%)"
                  value={manualInput.insurerInstalmentRate}
                  onChange={(value) =>
                    updateManualField("insurerInstalmentRate", value)
                  }
                />
                <label className="block">
                  <span className="block text-sm font-medium text-slate-950">
                    Number of months
                  </span>
                  <select
                    value={manualInput.insurerInstalmentMonths}
                    className="mt-2 min-h-11 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-950"
                    onChange={(event) =>
                      updateManualField(
                        "insurerInstalmentMonths",
                        Number(event.target.value) as 10 | 12,
                      )
                    }
                  >
                    <option value={10}>10 months</option>
                    <option value={12}>12 months</option>
                  </select>
                </label>
              </div>
            ) : null}
          </div>
        </div>

        <div>
          <h3 className="text-sm font-medium text-slate-950">
            Insurers approached
          </h3>
          <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
            {INSURERS.map((insurer) => (
              <CheckboxInput
                key={insurer}
                label={insurer}
                checked={manualInput.insurersApproached.includes(insurer)}
                onChange={() => toggleInsurerApproached(insurer)}
              />
            ))}
          </div>
        </div>

        <label className="block">
          <span className="block text-sm font-medium text-slate-950">
            Special notes (optional)
          </span>
          <textarea
            rows={3}
            value={manualInput.specialNotes}
            className="mt-2 w-full rounded-md border border-slate-300 bg-white px-3 py-3 text-sm leading-6 text-slate-950"
            onChange={(event) => updateManualField("specialNotes", event.target.value)}
          />
        </label>
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
            Fill in Insurer, Premium excl. IPT, and IPT to generate the letter.
          </p>
        ) : null}
      </div>

      {generatedLetter ? (
        <Section title="Generated letter">
          <div className="flex items-center justify-end">
            <button
              type="button"
              className="min-h-11 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-950 hover:bg-slate-50"
              onClick={handleCopy}
            >
              {copyState === "copied"
                ? "Copied"
                : copyState === "failed"
                  ? "Copy failed"
                  : "Copy to clipboard"}
            </button>
          </div>
          <pre className="whitespace-pre-wrap rounded-md border border-slate-200 bg-slate-50 p-4 text-sm leading-6 text-slate-950">
            {generatedLetter}
          </pre>
          <p className="text-xs text-slate-500">
            This letter body can be pasted directly into Acturis.
          </p>
        </Section>
      ) : null}
    </section>
  );
}
