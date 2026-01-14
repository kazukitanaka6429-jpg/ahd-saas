# System Inventory & Audit Task

- [x] **Step 1: Sitemap & Route Analysis**
    - [ ] List all `page.tsx` routes in `app/`.
    - [ ] Identiy route parameters and hierarchy.

- [x] **Step 2: Feature & Component Mapping**
    - [ ] Analyze each page to identify main components (`components/features/*`).
    - [ ] Identify linked Server Actions in those components.
    - [ ] Determine feature status (Complete/WIP/Empty).

- [x] **Step 3: Deep Dive into Complex Logic**
    - [ ] **Unit Management**: Trace usage in Residents/Stack/Dashboard.
    - [ ] **History Management**: Check Resident Documents/History logic.
    - [ ] **Medical Coordination**: Analyze IV/V logic and automation.
    - [ ] **HQ Check**: Analyze matrix verification and CSV reconciliation.

- [x] **Step 4: Audit for Unused/Zombie Code**
    - [ ] Check for defined but unused routes.
    - [ ] Check for components without references.

- [x] **Step 5: Report Generation**
    - [ ] Compile data into `docs/system_inventory/system_inventory_report.md`.
