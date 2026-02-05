# Layout Refactoring Plan (Header Implementation)

## Goal Description
Introduce a global **Header** component at the top of the dashboard.
Move the **Logo** and new **Notification Bell** from the Sidebar to this Header.
This prepares the layout for future scalability (adding more global actions).

## Proposed Changes

### Components
#### [NEW] `components/layout/header.tsx`
- **Layout**: `flex row items-center justify-between`
- **Left**: Logo (Image)
- **Right**: NotificationBellMock, User Profile (optional/future)
- **Styling**: Fixed height (e.g., `h-16`), border-bottom, background white/glass.

#### [MODIFY] `components/layout/sidebar.tsx`
- Remove: Logo Image code.
- Remove: Notification Bell code.
- Cleanup: Adjust spacing/padding since top element is gone.

### Layout
#### [MODIFY] `app/(dashboard)/layout.tsx`
- Change outer container to `flex-col`.
- Insert `<Header />` at top.
- Wrap Sidebar + Main in a `flex-1 flex-row` container.
- **Adjustment**: Ensure `h-screen` is maintained and scrolling works only in Main.

## Visual Structure
```
[ HEADER (h-16) -------------------------------------- ]
[ Logo           (Spacer)                     Bell   ]
--------------------------------------------------------
[ SIDEBAR (w-64) ] [ MAIN CONTENT (flex-1)             ]
[                ] [                                   ]
[                ] [                                   ]
```
