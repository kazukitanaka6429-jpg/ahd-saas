# Auto Logout Implementation Task List

## Overview
Implement an automatic logout feature to enhance security.
- Detection of user inactivity (mouse move, key press, click, scroll).
- Warning dialog before logout.
- Automatic server-side sign out when timer expires.
This is part of "Phase 1.3: Robustness".

## Tasks

### 1. Component Implementation
- [x] Create `AutoLogoutProvider` (`components/providers/auto-logout-provider.tsx`)
    - [x] Implement inactivity timer logic
    - [x] Implement event listeners (mousemove, keydown, click, scroll)
    - [x] Implement warning dialog state
    - [x] Implement sign out trigger

### 2. Integration
- [x] Wrap Dashboard Layout (`app/(dashboard)/layout.tsx`) with `AutoLogoutProvider`
- [x] Configure timeout settings (Default: 60 minutes timeout, 1 minute warning)

### 3. Verification
- [x] Verify warning dialog appears (Manual verification)
- [x] Verify logout occurs effectively (Manual verification)
- [x] Verify activity resets the timer (Manual verification)
