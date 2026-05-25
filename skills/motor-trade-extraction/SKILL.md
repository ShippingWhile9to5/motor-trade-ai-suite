# Motor Trade Extraction

Purpose:

Protect extraction quality and compliance.

Rules:

- Extract only from uploaded documents.
- Never invent information.
- Never estimate missing information.
- Missing required fields remain explicitly empty.
- Use is_missing_required for missing required fields.
- Uncertain information remains empty.
- Humans approve extraction before submission generation.
- Preserve original extracted output separately from reviewed output.
- Return structured schema-aligned extraction only.

Required extraction field structure:

- value
- confidence
- source_reference
- requires_review
- is_missing_required

File support:

- PDF
- JPG/JPEG
- PNG
- HEIC/HEIF

HEIC handling:

If extraction provider does not support HEIC:

HEIC

↓

Server conversion

↓

Continue extraction

Never rely on browser conversion.