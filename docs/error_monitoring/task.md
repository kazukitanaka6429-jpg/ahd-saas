# Error Monitoring (Sentry) Implementation Task List

## Overview
Implement Sentry for error monitoring and performance tracking.
This corresponds to "Phase 1.2: Error Monitoring" in the strategy plan.

## Tasks

### 1. Installation & Configuration
- [x] Run Sentry Wizard (`npx @sentry/wizard@latest -i nextjs`)
    - [x] Select project
    - [x] Authenticate
    - [x] Configure source maps
- [x] Verify `next.config.mjs` updates
- [x] Verify `sentry.client.config.ts` creation
- [x] Verify `sentry.server.config.ts` creation
- [x] Verify `sentry.edge.config.ts` creation (if applicable)

### 2. Integration & Testing
- [x] Create a test error button/page to verify reporting
- [x] Confirm error appears in Sentry Dashboard

### 3. Documentation
- [x] Document Sentry usage in `docs/error_monitoring/README.md` (Not needed for now, Wizard handled it)
