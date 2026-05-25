MOTOR TRADE AI SUITE — MASTER BRIEFWHO I AM

My name is Nick.

I am an Account Executive at a commercial insurance brokerage in Manchester specialising in motor trade insurance.

My day-to-day responsibilities include:

Cold outreachSite visitsFact-finds with motor trade businessesManual Acturis inputSubmission emails to underwritersQuote trackingRenewal managementProducing client-facing lettersManaging insurer relationshipsPresenting risks to insurers in the strongest possible way

My typical clients include:

GaragesMOT centresCar sales businessesBodyshopsMixed tradersOther motor trade businesses

I hold access to exclusive motor trade schemes including:

NIG / Intact

Benefits:

Premium discountsLow Claims RebateNo Claims Protection

I understand:

Motor trade underwriting presentationRisk positioningInsurer appetiteMotor trade operational risksWhat makes risks attractive to insurersWhat slows brokers down operationallyEXISTING TOOLS I HAVE BUILTQuote Tracker

Purpose:

Kanban quote pipeline management.

Tracks:

Submission progressQuote stagesWorkflow progressionMotor Trade Proximity Finder

Purpose:

Google Maps + Companies House prospecting.

Used for:

Lead generationProspect identificationQuote Letter Generator

Purpose:

PDF upload → client letter generation.

Motor Trade Insurance Generator

Purpose:

Generate:

Acturis additional informationUnderwriter email preparation

Currently standalone HTML.

Future integration required.

Insurer Eligibility Checker

Purpose:

Risk appetite filtering.

WHY THIS EXISTS

Current workflow creates:

Duplicate administrationManual copy-and-paste workContext switchingSubmission delaysManual quote chasingManual policy extractionRepetitive admin

Goal:

Reduce:

Fact Find → Submission Pack

45–60 minutes

↓

5–10 minutes

Core principle:

AI drafts.

Humans approve.

PRODUCT VISION

Build the operating system for motor trade insurance workflows.

Not a chatbot.

Not AI for the sake of AI.

A workflow platform that reduces repetitive administration while improving:

SpeedConsistencyAuditabilityUnderwriting presentation quality

Long-term potential:

Internal brokerage tool.

Potential licensing platform.

Potential SaaS business.

CORE PRINCIPLESHuman approval before critical actionsDeterministic systems preferred over AI where possibleStructured data before generated proseAI draftsHumans approveNever invent compliance-sensitive informationSecurity before convenienceMinimise dependenciesAuditability mandatoryExplain uncertainty rather than guessingAvoid overengineeringOptimise for shippingSYSTEM ARCHITECTURE

Workflow:

Fact Find Upload

↓

Extractor

(AI + validation)

↓

Structured Case Profile

↓

Human Review

↓

Acturis Writer

↓

Submission Writer

↓

Human Approval

↓

Workflow Engine (Hermes)

↓

Tracker Updates

↓

Terms Received

↓

Policy Reader

↓

Human Review

↓

Client Letter Draft

AGENT 1 — EXTRACTOR

Purpose:

Receive:

Fact-find imagesHandwritten notesDocuments

Extract:

Business detailsSecurity informationDriver informationClaims historyCover requirementsPremises informationStock information

Requirements:

Every extracted field includes:

Confidence scoreSource referenceReview status

Missing information:

Group questions together.

Never ask one question at a time.

No downstream generation until extraction approved.

Human approval mandatory.

AGENT 2 — ACTURIS WRITER

Purpose:

Generate:

Road Risks additional information.

Combined / Material Damage additional information.

Requirements:

Match broker toneStrong underwriting positioningHonest presentationNo softening material facts

Use deterministic logic where possible.

Narrative generation only where AI genuinely adds value.

AGENT 3 — SUBMISSION WRITER

Purpose:

Generate insurer submission email.

Capabilities:

Recommend insurer marketsRisk positioningUnderwriting presentation

Market appetite data stored separately.

Human approval mandatory.

Never auto-send.

POLICY READER

Purpose:

Read insurer terms.

Extract:

ExcessesConditionsEndorsementsPremiumIPTExclusionsTerms

Requirements:

Every extraction includes:

Confidence scorePage reference

Material endorsements surfaced.

Boilerplate ignored.

Uncertainty flagged.

Never guess.

HERMES

Hermes is NOT autonomous AI.

Hermes is:

Workflow Engine.

Responsibilities:

Case progressionReminder schedulingChase schedulingDashboard promptsQuote tracker updatesWorkflow coordination

Examples:

"Submission sent — schedule 5 day chase?"

"3 submissions overdue."

"Terms received — upload policy PDF."

"Policy review ready."

Software handles workflow.

AI only where AI genuinely helps.

STACK

Frontend:

Next.jsTypeScriptTailwind

Backend:

Next.js API Routes

Database:

Supabase

Auth:

Clerk

Hosting:

Vercel

Validation:

Zod

AI:

Claude / OpenAI

Rate limiting:

Upstash Redis

Monitoring:

SentrySECURITY REQUIREMENTS

Mandatory:

Server-side API keys onlyNo client-side secretsZod validationFile validationAuthentication checksRow-level securityAudit logsRate limitingNo raw user input into AINo permanent storage of uploadsHuman approval gatesBUILD ORDER

PHASE 1

Project setup

Auth

Database

Validation

Security

Rate limiting

PHASE 2

Extractor

Review screen

Case creation

PHASE 3

Acturis Writer

Submission Writer

PHASE 4

Hermes workflow engine

Case tracking

Reminders

PHASE 5

Policy Reader

Client letters

PHASE 6

Polish

Monitoring

Performance

Mobile optimisation

PRODUCT RULE

Before building any feature:

Ask:

Does this solve a real bottleneck?Is AI genuinely needed?Can software do this deterministically?Does this reduce operational risk?Is this MVP necessity or founder excitement?

Prefer discipline.

Avoid feature creep.