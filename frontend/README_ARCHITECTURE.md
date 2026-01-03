# HRM Pipeline - Frontend Architecture

## Overview
Optimized React architecture for the HRM Pipeline Neural Interface. This application follows a modular, component-based structure to ensure scalability and maintainability.

## Directory Structure
- **src/components/layout**: Core layout components (Sidebar, etc).
- **src/components/modals**: Feature-specific complex modals.
- **src/views**: Main application views (Dashboard, Studio, etc).
- **src/App.jsx**: Main orchestrator and state container.

## Key Components

### Views
- **DashboardView (`src/views/DashboardView.jsx`)**: Central command center.
- **AutoLabView (`src/views/AutoLabView.jsx`)**: Project creation and initialization wizard.
- **StudioView (`src/views/StudioView.jsx`)**: Code transcription neural studio (Monaco Editor).
- **MigrationView (`src/views/MigrationView.jsx`)**: Full migration pipeline management (Plan, Dataset, Review).
- **SettingsView (`src/views/SettingsView.jsx`)**: API keys, caching, and repository management.

### Modals
- **HuggingFaceUploadModal (`src/components/modals/HuggingFaceUploadModal.jsx`)**: Integration with HF Hub.
- **ReviewModal**: (Planned for extraction) Code review interface.

### Layout
- **Sidebar (`src/components/layout/Sidebar.jsx`)**: Navigation and system status.

## State Management
- `App.jsx` acts as the Controller, holding global state (projects, logs, API keys) and passing them down to Views via props.
- Views are mostly presentational but may handle local UI state.

## Styling
- Glassmorphism design system using CSS modules and inline styles.
- Framer Motion for page transitions.
