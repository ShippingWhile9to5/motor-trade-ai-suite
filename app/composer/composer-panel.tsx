"use client";

import Link from "next/link";
import { useState } from "react";
import { generateSubmissionComposerOutputs } from "../../lib/submission-composer";
import type {
  SubmissionComposerBusinessType,
  SubmissionComposerInput,
  SubmissionComposerOutputs,
  SubmissionComposerStockProfile,
} from "../../lib/schemas/submission-composer";

type CopyState = "idle" | "copied" | "failed";

const businessTypeLabels: Record<SubmissionComposerBusinessType, string> = {
  servicing_and_repair: "Car Servicing and Repair",
  mot_servicing: "Car Servicing, Repair and MOT",
  bodyshop: "Bodyshop",
  car_sales: "Car Sales (Used)",
  combined: "Car Sales and Servicing Combined",
};

const stockProfileLabels: Record<SubmissionComposerStockProfile, string> = {
  standard: "Standard Used Cars (up to GBP 15k average)",
  mid_range: "Mid-Range/Premium (GBP 15k-GBP 50k average)",
  prestige: "Prestige/Exotic (GBP 50k+ average)",
};

const blankInput: SubmissionComposerInput = {
  business_type: "servicing_and_repair",
  stock_profile: "standard",
  business_name: "",
  director_name: "",
  established_year: "",
  incorporated_year: "",
  trade_experience: "",
  prestige_experience: "",
  no_claims_bonus: "",
  primary_operations: "",
  private_cars_percent: "",
  light_commercial_vehicles_percent: "",
  classics_percent: "",
  bikes_percent: "",
  location: "",
  construction_year: "",
  tenure: "",
  walls: "",
  roof: "",
  floors: "",
  heating: "",
  police_distance: "",
  fire_distance: "",
  business_hours_mon_to_fri: "",
  business_hours_saturday: "",
  business_hours_sunday: "",
  average_vehicle_value: "",
  maximum_vehicle_value: "",
  maximum_used_car_value: "",
  underwriter_name: "",
  target_premium: "",
  cover_requirements: "",
  security_details: "",
  security_company: "",
  housekeeping: "Excellent",
  vehicle_storage: "",
  safety_notes: "",
  customer_facilities: "",
  work_mot: false,
  work_servicing: false,
  work_repairs: false,
  work_bodywork: false,
  work_welding: false,
  security_alarm: false,
  security_cctv: false,
  security_lighting: false,
  security_shutters: false,
  security_fencing: false,
  security_ram_bars: false,
  compliance_iee: false,
  compliance_health_safety: false,
  compliance_accident_book: false,
  compliance_risk_assessment: false,
  compliance_licence_checks: false,
  compliance_excess_recovery: false,
  welding_percentage: "",
  paint_spraying: false,
  paint_spraying_percentage: "",
};

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
      className="min-h-11 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-950 hover:bg-slate-50"
      onClick={handleCopy}
    >
      {state === "copied" ? "Copied" : state === "failed" ? "Copy failed" : "Copy"}
    </button>
  );
}

function FormSection({
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

function FieldGrid({ children }: { children: React.ReactNode }) {
  return <div className="grid gap-4 md:grid-cols-2">{children}</div>;
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
  onChange,
}: {
  title: string;
  text: string;
  onChange: (value: string) => void;
}) {
  return (
    <section className="rounded-md border border-slate-200 bg-white px-4 py-5 sm:px-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
          {title}
        </h2>
        <CopyButton text={text} />
      </div>
      <textarea
        rows={14}
        value={text}
        className="mt-4 w-full rounded-md border border-slate-300 bg-white px-3 py-3 text-sm leading-6 text-slate-950"
        onChange={(event) => onChange(event.target.value)}
      />
    </section>
  );
}

export function SubmissionComposerPanel() {
  const [formData, setFormData] = useState<SubmissionComposerInput>(blankInput);
  // Outputs are editable text, not a pure derivation of the form: once
  // generated, typing in the form must NOT silently overwrite manual edits.
  // "Regenerate from form" is the explicit action that recomputes them.
  const [outputs, setOutputs] = useState<SubmissionComposerOutputs>(() =>
    generateSubmissionComposerOutputs(blankInput),
  );

  function regenerateOutputs() {
    setOutputs(generateSubmissionComposerOutputs(formData));
  }

  function updateOutput<Key extends keyof SubmissionComposerOutputs>(
    key: Key,
    value: SubmissionComposerOutputs[Key],
  ) {
    setOutputs((current) => ({ ...current, [key]: value }));
  }

  const hasStockProfile =
    formData.business_type === "car_sales" || formData.business_type === "combined";
  const hasPrestigeFields =
    hasStockProfile && formData.stock_profile === "prestige";

  function updateField<Key extends keyof SubmissionComposerInput>(
    key: Key,
    value: SubmissionComposerInput[Key],
  ) {
    setFormData((current) => ({ ...current, [key]: value }));
  }

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
            Submission Composer
          </h1>
          <p className="mt-3 max-w-3xl text-base leading-7 text-slate-600">
            Fill this in from your fact-find, then copy the generated text
            into Acturis and your underwriter email. Nothing here is saved -
            close the tab and it's gone, so copy what you need before you
            leave.
          </p>
        </div>
      </header>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)]">
        <section className="space-y-6">
          <FormSection title="Business Type">
            <FieldGrid>
              <label className="block">
                <span className="block text-sm font-medium text-slate-950">
                  Select Business Type
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
                    Object.entries(businessTypeLabels) as Array<
                      [SubmissionComposerBusinessType, string]
                    >
                  ).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </label>

              {hasStockProfile ? (
                <label className="block">
                  <span className="block text-sm font-medium text-slate-950">
                    Stock Profile
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
                      Object.entries(stockProfileLabels) as Array<
                        [SubmissionComposerStockProfile, string]
                      >
                    ).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                </label>
              ) : null}
            </FieldGrid>
          </FormSection>

          <FormSection title="Basic Information">
            <TextInput
              label="Business Name"
              value={formData.business_name}
              onChange={(value) => updateField("business_name", value)}
            />
            <TextInput
              label="Director/Owner Name"
              value={formData.director_name}
              onChange={(value) => updateField("director_name", value)}
            />
            <FieldGrid>
              <TextInput
                label="Established Year"
                value={formData.established_year}
                onChange={(value) => updateField("established_year", value)}
              />
              <TextInput
                label="Incorporated Year (if applicable)"
                value={formData.incorporated_year}
                onChange={(value) => updateField("incorporated_year", value)}
              />
              <TextInput
                label="Total Motor Trade Experience (years)"
                value={formData.trade_experience}
                onChange={(value) => updateField("trade_experience", value)}
              />
              <TextInput
                label="Motor Trade NCB (claim-free years)"
                value={formData.no_claims_bonus}
                onChange={(value) => updateField("no_claims_bonus", value)}
              />
            </FieldGrid>
            {hasPrestigeFields ? (
              <TextInput
                label="Years Experience in Prestige Car Sales Specifically"
                value={formData.prestige_experience}
                onChange={(value) => updateField("prestige_experience", value)}
              />
            ) : null}
          </FormSection>

          <FormSection title="Business Activities">
            <TextInput
              label="Primary Operations"
              value={formData.primary_operations}
              onChange={(value) => updateField("primary_operations", value)}
            />
            <FieldGrid>
              <TextInput
                label="% Standard Private Cars"
                value={formData.private_cars_percent}
                onChange={(value) => updateField("private_cars_percent", value)}
              />
              <TextInput
                label="% Light Commercial Vehicles"
                value={formData.light_commercial_vehicles_percent}
                onChange={(value) =>
                  updateField("light_commercial_vehicles_percent", value)
                }
              />
              <TextInput
                label="% Classic Cars"
                value={formData.classics_percent}
                onChange={(value) => updateField("classics_percent", value)}
              />
              <TextInput
                label="% Bikes (if any)"
                value={formData.bikes_percent}
                onChange={(value) => updateField("bikes_percent", value)}
              />
              <TextInput
                label="Average Vehicle Value (GBP)"
                value={formData.average_vehicle_value}
                onChange={(value) =>
                  updateField("average_vehicle_value", value)
                }
              />
              <TextInput
                label="Max Value Any One Vehicle (GBP)"
                value={formData.maximum_vehicle_value}
                onChange={(value) =>
                  updateField("maximum_vehicle_value", value)
                }
              />
            </FieldGrid>
            {hasStockProfile ? (
              <TextInput
                label="Sale of Used Cars - Max Value (GBP)"
                value={formData.maximum_used_car_value}
                onChange={(value) =>
                  updateField("maximum_used_car_value", value)
                }
              />
            ) : null}
            {formData.business_type !== "car_sales" ? (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                <CheckboxInput
                  label="MOT Testing"
                  checked={formData.work_mot}
                  onChange={(checked) => updateField("work_mot", checked)}
                />
                <CheckboxInput
                  label="Servicing"
                  checked={formData.work_servicing}
                  onChange={(checked) => updateField("work_servicing", checked)}
                />
                <CheckboxInput
                  label="Repairs"
                  checked={formData.work_repairs}
                  onChange={(checked) => updateField("work_repairs", checked)}
                />
                <CheckboxInput
                  label="Bodywork"
                  checked={formData.work_bodywork}
                  onChange={(checked) => updateField("work_bodywork", checked)}
                />
                <CheckboxInput
                  label="Welding"
                  checked={formData.work_welding}
                  onChange={(checked) => updateField("work_welding", checked)}
                />
                <CheckboxInput
                  label="Paint Spraying"
                  checked={formData.paint_spraying}
                  onChange={(checked) => updateField("paint_spraying", checked)}
                />
              </div>
            ) : null}
            <FieldGrid>
              <TextInput
                label="Welding % (if applicable)"
                value={formData.welding_percentage}
                onChange={(value) => updateField("welding_percentage", value)}
              />
              <TextInput
                label="Paint Spraying % (if applicable)"
                value={formData.paint_spraying_percentage}
                onChange={(value) =>
                  updateField("paint_spraying_percentage", value)
                }
              />
            </FieldGrid>
          </FormSection>

          <FormSection title="Premises & Construction">
            <TextInput
              label="Location"
              value={formData.location}
              onChange={(value) => updateField("location", value)}
            />
            <FieldGrid>
              <TextInput
                label="Construction Year"
                value={formData.construction_year}
                onChange={(value) => updateField("construction_year", value)}
              />
              <label className="block">
                <span className="block text-sm font-medium text-slate-950">
                  Tenure
                </span>
                <select
                  value={formData.tenure}
                  className="mt-2 min-h-11 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-950"
                  onChange={(event) => updateField("tenure", event.target.value)}
                >
                  <option value="">Select</option>
                  <option value="Rented property">Rented</option>
                  <option value="Owner-occupied">Owner-occupied</option>
                  <option value="Leasehold">Leasehold</option>
                </select>
              </label>
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
                label="Floor"
                value={formData.floors}
                onChange={(value) => updateField("floors", value)}
              />
              <TextInput
                label="Heating"
                value={formData.heating}
                onChange={(value) => updateField("heating", value)}
              />
              <TextInput
                label="Police Station Distance (km)"
                value={formData.police_distance}
                onChange={(value) => updateField("police_distance", value)}
              />
              <TextInput
                label="Fire Station Distance (km)"
                value={formData.fire_distance}
                onChange={(value) => updateField("fire_distance", value)}
              />
            </FieldGrid>
          </FormSection>

          <FormSection title="Security & Risk Management">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <CheckboxInput
                label="Intruder Alarm"
                checked={formData.security_alarm}
                onChange={(checked) => updateField("security_alarm", checked)}
              />
              <CheckboxInput
                label="CCTV System"
                checked={formData.security_cctv}
                onChange={(checked) => updateField("security_cctv", checked)}
              />
              <CheckboxInput
                label="Roller Shutters"
                checked={formData.security_shutters}
                onChange={(checked) =>
                  updateField("security_shutters", checked)
                }
              />
              <CheckboxInput
                label="Security Lighting"
                checked={formData.security_lighting}
                onChange={(checked) =>
                  updateField("security_lighting", checked)
                }
              />
              <CheckboxInput
                label="Heavy-duty Fencing"
                checked={formData.security_fencing}
                onChange={(checked) => updateField("security_fencing", checked)}
              />
              <CheckboxInput
                label="Ram Bars/Bollards"
                checked={formData.security_ram_bars}
                onChange={(checked) =>
                  updateField("security_ram_bars", checked)
                }
              />
            </div>
            {hasPrestigeFields ? (
              <TextInput
                label="Security Company Name (if applicable)"
                value={formData.security_company}
                onChange={(value) => updateField("security_company", value)}
              />
            ) : null}
            <TextAreaInput
              label="Security Details (additional info)"
              value={formData.security_details}
              onChange={(value) => updateField("security_details", value)}
            />
            <label className="block">
              <span className="block text-sm font-medium text-slate-950">
                Housekeeping Standards
              </span>
              <select
                value={formData.housekeeping}
                className="mt-2 min-h-11 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-950"
                onChange={(event) =>
                  updateField("housekeeping", event.target.value)
                }
              >
                <option value="Excellent">Excellent</option>
                <option value="Good">Good</option>
                <option value="Satisfactory">Satisfactory</option>
              </select>
            </label>
            <TextInput
              label="Vehicle Storage"
              value={formData.vehicle_storage}
              onChange={(value) => updateField("vehicle_storage", value)}
            />
          </FormSection>

          <FormSection title="Safety & Compliance">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <CheckboxInput
                label="Current IEE Certificate"
                checked={formData.compliance_iee}
                onChange={(checked) => updateField("compliance_iee", checked)}
              />
              <CheckboxInput
                label="H&S Policy"
                checked={formData.compliance_health_safety}
                onChange={(checked) =>
                  updateField("compliance_health_safety", checked)
                }
              />
              <CheckboxInput
                label="Accident Book"
                checked={formData.compliance_accident_book}
                onChange={(checked) =>
                  updateField("compliance_accident_book", checked)
                }
              />
              <CheckboxInput
                label="Risk Assessment"
                checked={formData.compliance_risk_assessment}
                onChange={(checked) =>
                  updateField("compliance_risk_assessment", checked)
                }
              />
              <CheckboxInput
                label="Driver Licence Checks"
                checked={formData.compliance_licence_checks}
                onChange={(checked) =>
                  updateField("compliance_licence_checks", checked)
                }
              />
              <CheckboxInput
                label="Excess Recovery Policy"
                checked={formData.compliance_excess_recovery}
                onChange={(checked) =>
                  updateField("compliance_excess_recovery", checked)
                }
              />
            </div>
            <TextAreaInput
              label="Additional Safety Notes"
              value={formData.safety_notes}
              onChange={(value) => updateField("safety_notes", value)}
            />
            <TextInput
              label="Customer Facilities"
              value={formData.customer_facilities}
              onChange={(value) => updateField("customer_facilities", value)}
            />
          </FormSection>

          <FormSection title="Opening Hours">
            <TextInput
              label="Monday - Friday"
              value={formData.business_hours_mon_to_fri}
              onChange={(value) =>
                updateField("business_hours_mon_to_fri", value)
              }
            />
            <TextInput
              label="Saturday"
              value={formData.business_hours_saturday}
              onChange={(value) => updateField("business_hours_saturday", value)}
            />
            <TextInput
              label="Sunday"
              value={formData.business_hours_sunday}
              onChange={(value) => updateField("business_hours_sunday", value)}
            />
          </FormSection>

          <FormSection title="Email Details">
            <TextInput
              label="Underwriter Name"
              value={formData.underwriter_name}
              onChange={(value) => updateField("underwriter_name", value)}
            />
            <TextInput
              label="Target Premium (GBP)"
              value={formData.target_premium}
              onChange={(value) => updateField("target_premium", value)}
            />
            <TextInput
              label="Cover Requirements (optional)"
              value={formData.cover_requirements}
              onChange={(value) => updateField("cover_requirements", value)}
            />
          </FormSection>
        </section>

        <section className="space-y-6">
          <div className="flex flex-col gap-3 rounded-md border border-slate-200 bg-white px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
            <p className="text-sm text-slate-600">
              These are editable - type directly into any box below. Changing
              the form on the left won&apos;t touch your edits unless you
              regenerate.
            </p>
            <button
              type="button"
              className="min-h-11 shrink-0 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-950 hover:bg-slate-50"
              onClick={regenerateOutputs}
            >
              Regenerate from form
            </button>
          </div>
          <OutputCard
            title="Motor Trade Combined - Additional Information"
            text={outputs.motor_trade_additional_information}
            onChange={(value) =>
              updateOutput("motor_trade_additional_information", value)
            }
          />
          <OutputCard
            title="Material Damage - Additional Information"
            text={outputs.material_damage_additional_information}
            onChange={(value) =>
              updateOutput("material_damage_additional_information", value)
            }
          />
          <OutputCard
            title="Underwriter Email"
            text={outputs.underwriter_email}
            onChange={(value) => updateOutput("underwriter_email", value)}
          />
        </section>
      </div>
    </section>
  );
}
