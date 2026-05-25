EPIC 1 — Project Setup
Ticket 1.1 — Initialise Next.js project

Build:

Next.js App Router
TypeScript
Tailwind
Basic layout
Dashboard route

Done when:

App runs locally
Dashboard page loads
TypeScript has no errors
Ticket 1.2 — Add environment validation

Build:

Create env.ts
Validate env vars with Zod
Include:
Clerk keys
Supabase URL
Supabase service role key
AI provider key
Upstash Redis keys
Sentry DSN

Done when:

App fails safely if env vars are missing
No secret env vars exposed client-side
EPIC 2 — Auth
Ticket 2.1 — Add Clerk auth

Build:

Clerk provider
Sign-in page
Sign-up page
Protected dashboard routes

Done when:

Logged-out users cannot access app
Logged-in users can access dashboard
Ticket 2.2 — Add server-side auth helper

Build:

requireUser()
Use in all server actions/API routes

Done when:

Unauthenticated requests rejected server-side
EPIC 3 — Database
Ticket 3.1 — Create Supabase migrations

Build tables:

cases
documents
extractions
submission_outputs

Done when:

Fresh database can be created from migrations
No manual SQL required
Ticket 3.2 — Create cases table

Fields:

id
user_id
client_name
trading_name
business_type
contact_name
email
phone
renewal_date
notes
status
created_at
updated_at

Allowed statuses:

draft
review
ready
submitted
closed

Done when:

Case records can be created and read
Invalid statuses rejected
Ticket 3.3 — Create documents table

Fields:

id
case_id
user_id
filename
mime_type
size_bytes
storage_path
status
created_at

Allowed statuses:

uploaded
queued
processing
complete
failed

Done when:

Documents linked to cases
Document status updatable
Ticket 3.4 — Create extractions table

Fields:

id
case_id
document_id
user_id
status
raw_result_json
reviewed_result_json
error_message
created_at
updated_at

Allowed statuses:

queued
processing
review_required
approved
failed

Done when:

Extraction results stored
Failed extraction stores safe error message
Ticket 3.5 — Create submission_outputs table

Fields:

id
case_id
user_id
acturis_notes
insurer_email_subject
insurer_email_body
status
created_at
updated_at

Allowed statuses:

draft
approved

Done when:

Submission drafts stored and editable
EPIC 4 — Validation
Ticket 4.1 — Add shared Zod schemas

Build schemas for:

Create case
Update case
Upload document metadata
Extraction result
Review extraction
Generate submission
Update submission
Update case status

Done when:

All server writes validated with Zod
Invalid data rejected safely
EPIC 5 — Case Management
Ticket 5.1 — Build case creation form

Fields:

Client name
Trading name
Business type
Contact name
Email
Phone
Renewal date
Notes

Done when:

User can create case
Status defaults to draft
Ticket 5.2 — Build case dashboard

Build:

List cases
Show status
Show client/trading name
Show updated date
Link to case detail page

Done when:

User can view all cases
User can open case
Ticket 5.3 — Build case detail page shell

Sections:

Case details
Document upload
Extraction review
Submission pack
Status controls

Done when:

Case workspace loads correctly
EPIC 6 — File Upload
Ticket 6.1 — Build file upload component

Allow:

PDF
JPG
PNG
HEIC
HEIF

Done when:

User can upload supported files
Uploaded file linked to case
Ticket 6.2 — Add file validation

Validate:

MIME type
File extension
File size
Empty files

Allowed MIME types:

application/pdf
image/jpeg
image/png
image/heic
image/heif

Done when:

Invalid uploads rejected
User receives clear validation error
Ticket 6.3 — Store uploaded file securely

Build:

Supabase storage upload
Private bucket
Store metadata
Set status uploaded

Done when:

Files not publicly accessible
Metadata saved
Ticket 6.4 — Add server-side HEIC handling

Build flow:

HEIC upload

↓

Detect HEIC/HEIF

↓

Convert server-side if extraction pipeline requires

↓

Continue extraction

Rules:

Never rely on browser conversion
Preserve image quality sufficient for OCR

Done when:

iPhone photos process reliably
EPIC 7 — Extraction Queue
Ticket 7.1 — Add extraction queue

Build:

Queue extraction after upload
Document status → queued
Extraction status → queued

Done when:

Upload returns immediately
Extraction runs asynchronously
Ticket 7.2 — Add extraction idempotency

Rule:

If extraction status is:

queued
processing
review_required
approved

Prevent duplicate extraction creation.

Done when:

Duplicate extraction jobs blocked
Ticket 7.3 — Add extraction worker

Flow:

Load document

↓

Convert HEIC if required

↓

Set processing

↓

Run extraction

↓

Validate output

↓

Store result

↓

Set extraction review_required

↓

Set case review

↓

Set document complete

Done when:

Extraction completes in background
Ticket 7.4 — Add extraction failure handling

Build:

Catch failures
Set extraction failed
Set document failed
Store safe error
Allow retry

Done when:

Failure never crashes workflow
Ticket 7.5 — Add extraction retry button

Build:

Retry extraction
Requeue job
Clear previous safe error

Done when:

User can retry failed extraction
EPIC 8 — Extraction Schema
Ticket 8.1 — Define extraction schema

Groups:

Business details
Premises
Security
Drivers
Claims
Stock/vehicles
Cover requirements
Notes

Field structure:

value
confidence
source_reference
requires_review
is_missing_required

Rules:

Missing required fields remain empty.

Example:

Correct:

{
  "annual_turnover": "",
  "is_missing_required": true
}

Wrong:

{
  "annual_turnover": "150000"
}

when turnover is missing.

Done when:

Invalid extraction output rejected
Ticket 8.2 — Implement extraction prompt/function

Rules:

Extract only from source document
Never invent information
Never estimate information
Missing required fields remain empty
Uncertain fields remain empty
Missing required fields flagged
Return JSON only
Match schema exactly

Example:

Missing turnover:

{
  "annual_turnover": "",
  "requires_review": true,
  "is_missing_required": true
}

Done when:

AI never estimates missing data
Missing values remain explicitly empty
EPIC 9 — Human Review
Ticket 9.1 — Build extraction review UI

Build:

Group fields
Show value
Show confidence
Show source reference
Show missing required indicators
Allow edits

Done when:

User can review extracted data
Ticket 9.2 — Save reviewed extraction

Build:

Save reviewed version
Preserve original extraction

Done when:

Human corrections stored separately
Ticket 9.3 — Approve extraction

Rules:

Submission generation blocked unless:

extraction.status === "approved"

Approval:

review_required

↓

approved

Case:

review

↓

ready

Done when:

Human review mandatory
EPIC 10 — Submission Pack
Ticket 10.1 — Add submission generation guard

Only allow generation when:

extraction.status === "approved"
case.status === "ready"
reviewed_result_json exists

Done when:

Unreviewed extraction cannot generate submission
Ticket 10.2 — Generate Acturis notes draft

Output:

Business description
Premises summary
Security summary
Drivers summary
Claims summary
Cover requirements
Underwriting strengths
Open questions

Rules:

Use reviewed structured data only
Preserve missing values
Never invent information

Done when:

Notes generated safely
Ticket 10.3 — Generate insurer email draft

Output:

Subject
Body
Risk summary
Cover requested
Attachments checklist
Open questions

Rules:

Preserve missing information
Never invent information
Email never auto-sends

Done when:

Draft generated safely
Ticket 10.4 — Store submission pack

Build:

Save notes
Save email subject
Save email body
Default status draft

Done when:

Draft persists
Ticket 10.5 — Build submission editor

Build:

Edit notes
Edit subject
Edit email
Save

Done when:

User can amend outputs
Ticket 10.6 — Approve submission pack

Build:

Status → approved
Manual send only

Done when:

Human approval required
EPIC 11 — Case Status
Ticket 11.1 — Add manual status control

Allowed statuses:

draft
review
ready
submitted
closed

Done when:

User can update status
Ticket 11.2 — Add submitted action

Build:

Button:

Mark Submitted

Sets:

submitted

Done when:

User can manually track sent submissions
EPIC 12 — Rate Limiting
Ticket 12.1 — Add rate limiting helper

Build:

Upstash Redis helper
User-based limits

Done when:

Shared rate limiting reusable
Ticket 12.2 — Protect expensive actions

Apply limits to:

Uploads
Extraction retries
Submission generation

Done when:

Excess usage blocked safely
EPIC 13 — Error Handling
Ticket 13.1 — Add Sentry

Build:

Client capture
Server capture

Done when:

Errors visible safely
Ticket 13.2 — Add safe user errors

Build:

Error formatter
Hide stack traces
Clear user messages

Done when:

Internal errors never exposed
EPIC 14 — Final Polish
Ticket 14.1 — Add loading states

States:

Uploading

Queued

Processing

Failed

Saving Review

Generating Submission

Done when:

User always understands progress
Ticket 14.2 — Add copy buttons

Buttons:

Acturis notes
Email subject
Email body

Done when:

User can copy manually into Acturis/email