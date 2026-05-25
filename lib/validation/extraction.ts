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
  business_details: "Business details",
  premises: "Premises",
  security: "Security",
  vehicles_and_stock: "Vehicles and stock",
  drivers: "Drivers",
  claims_history: "Claims history",
  current_insurance: "Current insurance",
  cover_required: "Cover required",
};

function isExtractionField(value: unknown): value is ExtractionField {
  return extractionFieldSchema.safeParse(value).success;
}

function toLabel(path: string) {
  return path
    .split(".")
    .at(-1)!
    .replaceAll("_", " ");
}

function collectMissingFields(value: unknown, path: string): MissingField[] {
  if (isExtractionField(value)) {
    if (!value.is_missing_required) {
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

      if (typedSection === "drivers" && extraction.drivers.length === 0) {
        fields.push({
          path: "drivers",
          label: "drivers",
          source_reference: "",
        });
      }

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
