"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  generateSubmissionComposerOutputs,
} from "../../../../../lib/submission-composer";
import type {
  SubmissionComposerBusinessType,
  SubmissionComposerInput,
  SubmissionComposerStockProfile,
} from "../../../../../lib/schemas/submission-composer";
import type { SubmissionStatus } from "../../../../../lib/schemas/submission";

type ComposerPanelProps = {
  caseId: string;
  initialInput: SubmissionComposerInput;
  submissionStatus?: SubmissionStatus;
};

type CopyState = "idle" | "copied" | "failed";

const businessTypeLabels: Record<SubmissionComposerBusinessType, string> = {
  mot_servicing: "Service, Repair and MOT",
  bodyshop: "Bodyshop",
  car_sales: "Car Sales",
  combined: "Combined",
};

const stockProfileLabels: Record<SubmissionComposerStockProfile, string> = {
  standard: "Standard",
  mid_range: "Mid-range",
  prestige: "Prestige",
};

function CopyButton({
  text,
  label,
}: {
  text: string;
  label: string;
}) {
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

  const buttonLabel =
    state === "copied" ? "Copied" : state === "failed" ? "Copy failed" : label;

  return (
    <button
      type="button"
      className="min-h-11 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-950 hover:bg-slate-50"
      onClick={handleCopy}
    >
      {buttonLabel}
    </button>
  );
}

function TextInput({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="block">
      <span className="block text-sm font-medium text-slate-950">{label}</span>
      <input
        type="text"
        value={value}
        className="mt-2 min-h-11 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-950"
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  );
}

function TextAreaInput({
  label,
  value,
  onChange,
  rows = 4,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  rows?: number;
}) {
  return (
    <label className="block">
      <span className="block text-sm font-medium text-slate-950">{label}</span>
      <textarea
        rows={rows}
        value={value}
        className="mt-2 w-full rounded-md border border-slate-300 bg-white px-3 py-3 text-sm leading-6 text-slate-950"
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

function OutputCard({
  title,
  text,
}: {
  title: string;
  text: string;
}) {
  return (
    <section className="rounded-md border border-slate-200 bg-white px-4 py-5 sm:px-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
          {title}
        </h2>
        <CopyButton text={text} label="Copy" />
      </div>
      <textarea
        readOnly
        rows={14}
        value={text}
        className="mt-4 w-full rounded-md border border-slate-300 bg-slate-50 px-3 py-3 text-sm leading-6 text-slate-950"
      />
    </section>
  );
}

export function SubmissionComposerPanel({
  caseId,
  initialInput,
  submissionStatus,
}: ComposerPanelProps) {
  const [formData, setFormData] = useState(initialInput);
  const outputs = useMemo(
    () => generateSubmissionComposerOutputs(formData),
    [formData],
  );

  function updateField<Key extends keyof SubmissionComposerInput>(
    key: Key,
    value: SubmissionComposerInput[Key],
  ) {
    setFormData((current) => ({
      ...current,
      [key]: value,
    }));
  }

  return (
    <section className="flex flex-1 flex-col gap-6">
      <header className="space-y-3">
        <Link
          href={`/dashboard/cases/${caseId}`}
          className="text-sm font-medium text-slate-600 hover:text-slate-950"
        >
          Back to case
        </Link>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-3xl font-semibold text-slate-950 sm:text-4xl">
              Submission Composer
            </h1>
            <p className="mt-3 max-w-3xl text-base leading-7 text-slate-600">
              Use the reviewed fact-find data as your starting point, then tune
              the wording here for Acturis notes and insurer emails without
              losing the case context.
            </p>
          </div>
          <span className="w-fit rounded-full bg-slate-100 px-3 py-1 text-xs font-medium uppercase tracking-wide text-slate-700">
            Submission {submissionStatus ?? "not_started"}
          </span>
        </div>
      </header>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
        <section className="space-y-6">
          <section className="rounded-md border border-slate-200 bg-white px-4 py-5 sm:px-5">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
              Smart form
            </h2>
            <p className="mt-2 text-sm text-slate-600">
              One business type setting drives the wording across all outputs so
              the text stays aligned with the risk you are presenting.
            </p>

            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <label className="block">
                <span className="block text-sm font-medium text-slate-950">
                  Business type
                </span>
                <select
                  value={formData.business_type}
                  className="mt-2 min-h-11 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-950"
                  onChange={(event) =>
                    updateField(
                      "business_type",
                      event.target.value as SubmissionComposerBusinessType,
                    )
                  }
                >
                  {(
                    Object.entries(
                      businessTypeLabels,
                    ) as Array<
                      [SubmissionComposerBusinessType, string]
                    >
                  ).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block">
                <span className="block text-sm font-medium text-slate-950">
                  Stock profile
                </span>
                <select
                  value={formData.stock_profile}
                  className="mt-2 min-h-11 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-950"
                  onChange={(event) =>
                    updateField(
                      "stock_profile",
                      event.target.value as SubmissionComposerStockProfile,
                    )
                  }
                >
                  {(
                    Object.entries(
                      stockProfileLabels,
                    ) as Array<
                      [SubmissionComposerStockProfile, string]
                    >
                  ).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </label>

              <TextInput
                label="Business name"
                value={formData.business_name}
                onChange={(value) => updateField("business_name", value)}
              />
              <TextInput
                label="Director or proposer"
                value={formData.director_name}
                onChange={(value) => updateField("director_name", value)}
              />
              <TextInput
                label="Established"
                value={formData.established_year}
                onChange={(value) => updateField("established_year", value)}
              />
              <TextInput
                label="Trade experience"
                value={formData.trade_experience}
                onChange={(value) => updateField("trade_experience", value)}
              />
              <TextInput
                label="No claims bonus"
                value={formData.no_claims_bonus}
                onChange={(value) => updateField("no_claims_bonus", value)}
              />
              <TextInput
                label="Location"
                value={formData.location}
                onChange={(value) => updateField("location", value)}
              />
              <TextInput
                label="Average vehicle value"
                value={formData.average_vehicle_value}
                onChange={(value) =>
                  updateField("average_vehicle_value", value)
                }
              />
              <TextInput
                label="Maximum vehicle value"
                value={formData.maximum_vehicle_value}
                onChange={(value) =>
                  updateField("maximum_vehicle_value", value)
                }
              />
              <TextInput
                label="Underwriter name"
                value={formData.underwriter_name}
                onChange={(value) => updateField("underwriter_name", value)}
              />
              <TextInput
                label="Target premium"
                value={formData.target_premium}
                onChange={(value) => updateField("target_premium", value)}
              />
            </div>

            <div className="mt-4 space-y-4">
              <TextAreaInput
                label="Primary operations"
                value={formData.primary_operations}
                onChange={(value) => updateField("primary_operations", value)}
                rows={3}
              />
              <TextAreaInput
                label="Cover requirements"
                value={formData.cover_requirements}
                onChange={(value) => updateField("cover_requirements", value)}
                rows={3}
              />
            </div>
          </section>

          <section className="rounded-md border border-slate-200 bg-white px-4 py-5 sm:px-5">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
              Premises and wording notes
            </h2>
            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <TextInput
                label="Walls"
                value={formData.walls}
                onChange={(value) => updateField("walls", value)}
              />
              <TextInput
                label="Roof"
                value={formData.roof}
                onChange={(value) => updateField("roof", value)}
              />
              <TextInput
                label="Floors"
                value={formData.floors}
                onChange={(value) => updateField("floors", value)}
              />
              <TextInput
                label="Heating"
                value={formData.heating}
                onChange={(value) => updateField("heating", value)}
              />
              <TextInput
                label="Mon to Fri hours"
                value={formData.business_hours_mon_to_fri}
                onChange={(value) =>
                  updateField("business_hours_mon_to_fri", value)
                }
              />
              <TextInput
                label="Sat / Sun hours"
                value={formData.business_hours_sat_to_sun}
                onChange={(value) =>
                  updateField("business_hours_sat_to_sun", value)
                }
              />
            </div>

            <div className="mt-4 space-y-4">
              <TextAreaInput
                label="Security details"
                value={formData.security_details}
                onChange={(value) => updateField("security_details", value)}
              />
              <TextAreaInput
                label="Vehicle storage"
                value={formData.vehicle_storage}
                onChange={(value) => updateField("vehicle_storage", value)}
                rows={3}
              />
              <TextAreaInput
                label="Safety notes"
                value={formData.safety_notes}
                onChange={(value) => updateField("safety_notes", value)}
              />
              <TextAreaInput
                label="Customer facilities"
                value={formData.customer_facilities}
                onChange={(value) =>
                  updateField("customer_facilities", value)
                }
                rows={3}
              />
            </div>
          </section>

          <section className="rounded-md border border-slate-200 bg-white px-4 py-5 sm:px-5">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
              Controls
            </h2>
            <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <CheckboxInput
                label="Intruder alarm"
                checked={formData.security_alarm}
                onChange={(checked) => updateField("security_alarm", checked)}
              />
              <CheckboxInput
                label="CCTV"
                checked={formData.security_cctv}
                onChange={(checked) => updateField("security_cctv", checked)}
              />
              <CheckboxInput
                label="Security lighting"
                checked={formData.security_lighting}
                onChange={(checked) =>
                  updateField("security_lighting", checked)
                }
              />
              <CheckboxInput
                label="Protected openings"
                checked={formData.security_shutters}
                onChange={(checked) =>
                  updateField("security_shutters", checked)
                }
              />
              <CheckboxInput
                label="Perimeter protection"
                checked={formData.security_fencing}
                onChange={(checked) => updateField("security_fencing", checked)}
              />
              <CheckboxInput
                label="Ram bars or hoops"
                checked={formData.security_ram_bars}
                onChange={(checked) => updateField("security_ram_bars", checked)}
              />
              <CheckboxInput
                label="IEE certificate"
                checked={formData.compliance_iee}
                onChange={(checked) => updateField("compliance_iee", checked)}
              />
              <CheckboxInput
                label="Health and Safety policy"
                checked={formData.compliance_health_safety}
                onChange={(checked) =>
                  updateField("compliance_health_safety", checked)
                }
              />
              <CheckboxInput
                label="Accident book"
                checked={formData.compliance_accident_book}
                onChange={(checked) =>
                  updateField("compliance_accident_book", checked)
                }
              />
              <CheckboxInput
                label="Risk assessment"
                checked={formData.compliance_risk_assessment}
                onChange={(checked) =>
                  updateField("compliance_risk_assessment", checked)
                }
              />
              <CheckboxInput
                label="Licence checks"
                checked={formData.compliance_licence_checks}
                onChange={(checked) =>
                  updateField("compliance_licence_checks", checked)
                }
              />
              <CheckboxInput
                label="Excess recovery"
                checked={formData.compliance_excess_recovery}
                onChange={(checked) =>
                  updateField("compliance_excess_recovery", checked)
                }
              />
              <CheckboxInput
                label="Paint spraying"
                checked={formData.paint_spraying}
                onChange={(checked) => updateField("paint_spraying", checked)}
              />
            </div>

            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <TextInput
                label="Welding percentage"
                value={formData.welding_percentage}
                onChange={(value) => updateField("welding_percentage", value)}
              />
              <TextInput
                label="Paint spraying percentage"
                value={formData.paint_spraying_percentage}
                onChange={(value) =>
                  updateField("paint_spraying_percentage", value)
                }
              />
            </div>
          </section>
        </section>

        <section className="space-y-6">
          <OutputCard
            title="Motor trade combined - additional information"
            text={outputs.motor_trade_additional_information}
          />
          <OutputCard
            title="Material damage - additional information"
            text={outputs.material_damage_additional_information}
          />
          <OutputCard
            title="Underwriter email"
            text={outputs.underwriter_email}
          />
        </section>
      </div>
    </section>
  );
}
