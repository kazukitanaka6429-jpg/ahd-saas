# Error Monitoring (Sentry) Implementation Plan

## Goal Description
Implement Sentry to track runtime errors and performance issues in real-time. This will allow rapid debugging and issue resolution without relying on user reports.

## User Review Required
> [!IMPORTANT]
> **Manual Setup Required**: The Sentry Wizard (`@sentry/wizard`) requires interactive authentication via browser. The user must run this command manually.

## Proposed Changes

### Configuration
#### [NEW] `sentry.client.config.ts`
- Client-side error reporting configuration.

#### [NEW] `sentry.server.config.ts`
- Server-side error reporting configuration (App Router / API Routes).

#### [NEW] `sentry.edge.config.ts`
- Edge runtime configuration (Middleware).

#### [MODIFY] `next.config.mjs`
- Wrap Next.js config with `withSentryConfig` to enable source maps and upload.

### Integration
#### [NEW] `app/error-test/page.tsx` (Temporary)
- A simple page with a button to throw a test error.

## Verification Plan

### Manual Verification
1. **Run Wizard**: User executes `npx @sentry/wizard@latest -i nextjs --saas --org hobby-70 --project javascript-nextjs`.
2. **Build**: Run `npm run build` to ensure Sentry plugin works.
3. **Verify**:
   - Visit the test page (or trigger an error).
   - Check Sentry Dashboard for the reported issue.
