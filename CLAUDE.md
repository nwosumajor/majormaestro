# Project Overview
**Name:** MajorGBN Enterprise Platform (Staff Classification, Career Partner & Forensic Recovery)
**Purpose:** A comprehensive enterprise Next.js application featuring AI-driven staff team placement, strategic career roadmapping, and a secure B2B portal for corporate forensic financial auditing and excess bank charges recovery.

## Tech Stack & Architecture
- **Framework:** Next.js (latest, App Router)
- **Language:** TypeScript
- **Styling:** Tailwind CSS (Enterprise-grade, high-trust UI)
- **AI Integration:** Vercel AI SDK (`@ai-sdk/anthropic`)
- **AI Model:** Anthropic `claude-3-5-sonnet-latest`
- **Deployment:** Dockerized, deployed to  via GitHub Actions CI/CD.

## Core Application Modules

### 1. Landing Page (`/`)
- A modern hero section explaining the three value propositions: AI Team Placement, Career Roadmapping, and Corporate Forensic Recovery.
- Clear navigation routing to `/assessment`, `/roadmap`, and `/recovery`.

### 2. Module 1: AI Staff Classification (`/assessment`)
- **Input Form:** Evaluates users across Psychological, Mental, Social, and Environmental attributes. Captures multiple "Certificates Acquired".
- **Backend API (`/api/classify/route.ts`):** Uses the Vercel AI SDK to evaluate the user.
- **Strict Output Requirement:** The AI must use a Zod schema to return an array of EXACTLY 3 objects representing the Top 3 best-fit departments. 

**ALLOWED DEPARTMENTS (The AI must strictly choose from this list):**
- **[Banking & Financial Services]:** Corporate Banking, Retail Banking, Treasury, Risk Management, Compliance and AML, Internal Audit, Customer Service, Investment Banking, Corporate Communications, Trade Finance, Human Resources, Legal Services, Strategy and Analytics.
- **[Technology & Software Engineering]:** Software Development, DevOps & Cloud Infrastructure, Platform Engineering, QA & Automation, Data Science & AI, Product Management, UX/UI Design, Cybersecurity & InfoSec, IT Service Management.
- **[Fintech & Digital Payments]:** Payment Gateway Engineering, Blockchain & Web3, Core Banking Integration, E-Channel Security, Fraud Operations, Digital Wallet Management, Product Operations, Fintech Compliance.
- **[Manufacturing, FMCG & Production]:** Production Department, QA/QC, Supply Chain, Procurement, Maintenance/Engineering, Logistics, Product Development, Sales, Brand Management, HSE, Corporate Affairs, Warehouse Management.
- **[Food Restaurant Chain & Hospitality]:** F&B Management, Kitchen Operations, Front Office, Housekeeping, Restaurant Operations, Franchise Management.
- **[General Corporate Support Services]:** HR & Admin, Finance & Accounts, Legal & Secretariat, IT, Corporate Strategy, Marketing & Comms, Internal Control, Facility Management.

**Zod Schema Structure for Classification Output:**
- `rank`: (number, 1 to 3)
- `departmentName`: (string, exact match from allowed list)
- `industryCategory`: (string, exact match from allowed list)
- `reasoning`: (string, detailed explanation connecting traits/certifications to the role)

### 3. Module 2: Strategic Career Partner (`/roadmap`)
- **Input Form:** Captures "Current State" and "Future State" (desired role in 1 to 15 years).
- **Backend API (`/api/roadmap/route.ts`):** Processes the input using Anthropic.
- **Zod Schema Structure for Roadmap Output:** Generates a structured array of timeline steps. Each step must contain:
   - `timeframe`: (string, e.g., "Year 1-2")
   - `milestoneName`: (string)
   - `strategicReasoning`: (string, explicitly justifying the step based on industry realities)
   - `recommendedCertifications`: (array of strings, listing necessary certifications required to achieve this specific milestone)
- **UI:** Rendered as a clean, vertical timeline component.

### 4. Module 3: Excess Charges Recovery Platform (`/recovery`)
- **Purpose:** A B2B portal for corporate organizations to request forensic audits to recover illegitimate bank deductions (interest, COT, LC charges) based on CBN and BOFIA regulations.
- **UI Requirements:** - Emphasize the "Zero-Risk / 30% Success Fee" model.
  - Display the "Six-Step Recovery Process" (Engagement, Document Collection, Forensic Analysis, Findings Report, Bank Engagement, Recovery).
- **Interactive Estimator:** A component that takes an "Annual Turnover Band" and outputs the "Typical Recovery Range" and "Estimated Timeline" (e.g., ₦200M – ₦1B yields ₦5M – ₦40M in 6-10 weeks).
- **Complaint Lodging Form:** A secure intake form capturing corporate details, banks used, and NDPA 2023/NDA compliance acknowledgments, with UI placeholders for secure document uploads (Statements, Letters of Authority).

## Development Guidelines
1. **API Keys:** Use `process.env.ANTHROPIC_API_KEY` in API routes.
2. **Security & Trust:** The `/recovery` module must look highly secure and professional, reflecting a financial institution's standards.
3. **Modularity & Fallbacks:** Keep UI components modular. Handle loading states gracefully. Implement try/catch blocks in API routes and render fallback UI if the AI response fails.