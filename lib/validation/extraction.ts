import { type z } from "zod";
import {
  type ExtractionField,
  type FactFindExtraction,
  extractionFieldSchema,
  factFindExtractionSchema,
} from "../schemas/extraction";

type ExtractionSection = keyof FactFindExtraction;

type MissingField = {
  path: string;
  label: string;
  source_reference: string;
};

export type MissingFieldGroup = {
  section: ExtractionSection;
  label: string;
  fields: MissingField[];
};

export type ExtractionMissingFieldsResult = {
  success: true;
  missing_required_fields: MissingFieldGroup[];
};

export type ExtractionValidationErrorResult = {
  success: false;
  issues: z.ZodIssue[];
};

export type ExtractionValidationResult =
  | ExtractionMissingFieldsResult
  | ExtractionValidationErrorResult;

const sectionLabels: Record<ExtractionSection, string> = {
  company_details: "Company details",
  premises_details: "Premises details",
  business_activities: "Business activities",
  sums_insured_and_covers: "Sums insured and covers",
  turnover_split: "Turnover split",
  employee_details: "Employee details",
  road_risks: "Road risks",
  driver_details: "Driver details",
  vehicle_details: "Vehicle details",
  existing_cover_and_notes: "Existing cover and notes",
  claims_history: "Claims history",
  declarations: "Declarations",
  additional_notes: "Additional notes",
};

function isExtractionField(value: unknown): value is ExtractionField {
  return extractionFieldSchema.safeParse(value).success;
}

export function isMissingRequiredField(field: ExtractionField) {
  if (!field.is_missing_required) {
    return false;
  }

  if (typeof field.value === "string") {
    return field.value.trim() === "";
  }

  if (Array.isArray(field.value)) {
    return field.value.length === 0;
  }

  return false;
}

function toLabel(path: string) {
  return path
    .split(".")
    .at(-1)!
    .replaceAll("_", " ");
}

function collectMissingFields(value: unknown, path: string): MissingField[] {
  if (isExtractionField(value)) {
    if (!isMissingRequiredField(value)) {
      return [];
    }

    return [
      {
        path,
        label: toLabel(path),
        source_reference: value.source_reference,
      },
    ];
  }

  if (Array.isArray(value)) {
    return value.flatMap((item, index) =>
      collectMissingFields(item, `${path}.${index}`),
    );
  }

  if (value && typeof value === "object") {
    return Object.entries(value).flatMap(([key, nestedValue]) =>
      collectMissingFields(nestedValue, `${path}.${key}`),
    );
  }

  return [];
}

export function getGroupedMissingExtractionFields(
  payload: unknown,
): ExtractionValidationResult {
  const parsedExtraction = factFindExtractionSchema.safeParse(payload);

  if (!parsedExtraction.success) {
    return {
      success: false,
      issues: parsedExtraction.error.issues,
    };
  }

  const extraction = parsedExtraction.data;

  const missingRequiredFields = Object.entries(extraction).flatMap(
    ([section, sectionValue]) => {
      const typedSection = section as ExtractionSection;
      const fields = collectMissingFields(sectionValue, typedSection);

      if (fields.length === 0) {
        return [];
      }

      return [
        {
          section: typedSection,
          label: sectionLabels[typedSection],
          fields,
        },
      ];
    },
  );

  return {
    success: true,
    missing_required_fields: missingRequiredFields,
  };
}
