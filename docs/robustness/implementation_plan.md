# Auto Logout Implementation Plan

## Goal Description
Implement an automatic logout feature to prevent unauthorized access when a terminal is left unattended. This increases security compliance, especially for handling sensitive medical/resident data.

## User Review Required
> [!NOTE]
> **Timeout Settings**: Default timeout is set to **60 minutes** of inactivity. The warning dialog will appear **1 minute** before logout.
> If you prefer different timings (e.g., 15 mins for stricter security), please let me know.

## Proposed Changes

### Frontend Components
#### [NEW] `components/providers/auto-logout-provider.tsx`
- **Logic**:
    - Tracks user events: `mousemove`, `keydown`, `click`, `scroll`, `touchstart`.
    - Uses `setTimeout` to trigger warning and logout.
    - Resets timer on event (throttled).
- **UI**:
    - Renders a `AlertDialog` when warning time is reached.
    - Dialog shows countdown "あとXX秒でログアウトします".
    - "継続して利用する" button resets the timer.

### Integration
#### [MODIFY] `app/(dashboard)/layout.tsx`
- Wrap the children with `<AutoLogoutProvider>`.
- Pass server-side logout action or handle client-side redirect.

## Verification Plan

### Manual Verification
1.  **Dev Test**: Set timeout to 10 seconds for testing.
2.  **Inactivity**: Wait and verify warning dialog appears.
3.  **Resume**: Click "Continue" and verify timer resets.
4.  **Logout**: Wait for full timeout and verify redirection to `/login`.
5.  **Activity**: Move mouse continuously and verify warning does NOT appear.
