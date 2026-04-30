# Homeo-X UI Component Reference

> **Design System**: Paperplane v2.0 — Kreed.health  
> **Strategy**: Mobile-first, CSS Variables, Vanilla CSS  
> **Font**: Geist (sans) + Geist Mono  
> **Icon Library**: Lucide React

---

## 1. Design Tokens

**File**: [index.css](file:///c:/Users/hp/Desktop/Github/homeo-x/apps/web/src/index.css#L124-L234)

### Colors
| Token | Value | Usage |
|---|---|---|
| `--pp-blue` | `#2563EB` | Primary brand |
| `--pp-blue-tint` | `#EFF6FF` | Light blue backgrounds |
| `--pp-blue-border` | `#BFDBFE` | Blue borders |
| `--pp-blue-hover` | `#1D4ED8` | Hover state |
| `--pp-ink` | `#0F0F0E` | Primary text |
| `--pp-text-2` | `#4A4A47` | Body text |
| `--pp-text-3` | `#888786` | Muted text |
| `--pp-text-4` | `#CECDCA` | Placeholders |

### Warm Neutrals (Surfaces)
| Token | Value | Usage |
|---|---|---|
| `--pp-warm-1` | `#FAFAF8` | Page background |
| `--pp-warm-2` | `#F4F3F1` | Surface 2 / hover |
| `--pp-warm-3` | `#EEECEA` | Surface 3 |
| `--pp-warm-4` | `#E3E2DF` | Borders |

### Semantic Colors
| Token | Value | Usage |
|---|---|---|
| `--pp-success-bg / fg` | `#F0FDF4 / #16A34A` | Success states |
| `--pp-danger-bg / fg` | `#FEF2F2 / #DC2626` | Error / danger |
| `--pp-warning-bg / fg` | `#FFFBEB / #D97706` | Warning states |

### Spacing (4px base)
`--pp-space-1` (4px) → `--pp-space-12` (48px)

### Radii
| Token | Value |
|---|---|
| `--pp-radius-btn` | `6px` |
| `--pp-radius-card` | `10px` |
| `--pp-radius-sm` | `4px` |
| `--pp-radius-lg` | `14px` |

### Shadows
| Token | Usage |
|---|---|
| `--pp-shadow-sm` | Cards at rest |
| `--pp-shadow-md` | Hover / elevated |
| `--pp-shadow-lg` | Modals / dropdowns |
| `--pp-premium-shadow` | Premium card effect |

### Dark Mode
All tokens auto-switch via `.dark` class on `<html>`. See [index.css L240-L280](file:///c:/Users/hp/Desktop/Github/homeo-x/apps/web/src/index.css#L240-L280).

---

## 2. Table UI

**Files**: [index.css](file:///c:/Users/hp/Desktop/Github/homeo-x/apps/web/src/index.css#L486-L550) · [patient-list-page.tsx](file:///c:/Users/hp/Desktop/Github/homeo-x/apps/web/src/features/patients/pages/patient-list-page.tsx#L178-L252)

### Structure
```html
<div class="pp-card pp-table-scroll">
  <table class="pp-table">
    <thead><tr><th>Column</th></tr></thead>
    <tbody>
      <tr class="hover-row"><td>Data</td></tr>
    </tbody>
  </table>
</div>
```

### Key Classes
| Class | Purpose |
|---|---|
| `.pp-table-scroll` | Horizontal scroll wrapper with touch support |
| `.pp-table` | Base table styling, `min-width: 540px` |
| `.pp-table th` | Uppercase label headers, `--pp-warm-2` bg |
| `.pp-table td` | 13px body text, bottom border |
| `.hover-row` | Row hover → `--pp-warm-1` background |

### Scrollbar
Custom scrollbar via `.pp-table-scroll::-webkit-scrollbar` — 6px height, `#e2e8f0` thumb.

---

## 3. Form Inputs

**File**: [index.css](file:///c:/Users/hp/Desktop/Github/homeo-x/apps/web/src/index.css#L555-L615)

### Classes
| Class | Description |
|---|---|
| `.pp-input` | Standard text input — 40px height, `--pp-radius-btn` |
| `.pp-textarea` | Multiline — min-height 80px, resizable |
| `.pp-select` | Dropdown with custom chevron arrow |

### Focus State
All inputs: `border-color: --pp-blue` + `box-shadow: 0 0 0 3px --pp-blue-tint`

### Drawer Form Inputs
| Class | Description |
|---|---|
| `.drawer-input` | Drawer-specific input — 10px/12px padding, `#cbd5e1` border |
| `.drawer-label` | 13px bold label |
| `.drawer-grid-2` | 2-column grid (stacks on mobile < 640px) |
| `.drawer-grid-3` | 3-column grid (stacks on mobile < 640px) |
| `.drawer-name-row` | Flex row for title+first+middle+surname (stacks on mobile) |

### Form Grid Layouts
| Class | Columns |
|---|---|
| `.pp-form-grid` | `repeat(auto-fit, minmax(240px, 1fr))` |
| `.pp-form-grid-2` | `repeat(auto-fit, minmax(200px, 1fr))` |
| `.pp-form-cols` | 1col mobile → 2col at 1024px |
| `.pp-name-grid` | 1col → `80px 1fr` at 480px → `80px 1fr 1fr 1fr` at 768px |

### Numeric Input Component
**File**: [NumericInput.tsx](file:///c:/Users/hp/Desktop/Github/homeo-x/apps/web/src/shared/components/NumericInput.tsx)  
Wraps `<input>` to allow only numeric characters. Used for phone, fee, PIN fields.

---

## 4. Right-Side Drawer Panel

**Files**: [patients.css](file:///c:/Users/hp/Desktop/Github/homeo-x/apps/web/src/features/patients/styles/patients.css#L556-L731) · [patient-form-drawer.tsx](file:///c:/Users/hp/Desktop/Github/homeo-x/apps/web/src/features/patients/components/patient-form-drawer.tsx)

### Structure
```html
<!-- Portal to document.body -->
<div class="drawer-overlay" />        <!-- Backdrop blur -->
<div class="drawer-panel">            <!-- Slides from right -->
  <div class="drawer-header">
    <h2 class="drawer-title">Title</h2>
    <button class="drawer-close"><X /></button>
  </div>
  <div class="drawer-body">
    <form class="drawer-form">...</form>
  </div>
</div>
```

### Key Styles
| Property | Value |
|---|---|
| Width | `100%` mobile, `max-width: 500px` |
| Background | `#ffffff` |
| Shadow | `-4px 0 24px rgba(0,0,0,0.1)` |
| Animation | `slideInRight 0.3s cubic-bezier(0.16, 1, 0.3, 1)` |
| Overlay | `rgba(17,24,39,0.6)` + `backdrop-filter: blur(4px)` |
| Z-index | Overlay `9999`, Panel `10000` |

### Submit Button
`.drawer-submit-btn` — Full width, `#0f172a` bg, hover → `#334155`.

---

## 5. Buttons

**File**: [index.css](file:///c:/Users/hp/Desktop/Github/homeo-x/apps/web/src/index.css#L620-L697) · [role-dashboards.css](file:///c:/Users/hp/Desktop/Github/homeo-x/apps/web/src/features/dashboard/pages/role-dashboards.css#L649-L736)

| Class | Style |
|---|---|
| `.btn-primary` | Blue bg, white text, blue shadow hover |
| `.btn-secondary` | White bg, gray border, subtle hover |
| `.btn-ghost` | Transparent, icon-friendly |
| `.btn-danger` | Red bg/border, danger states |
| `.btn-skip` | Orange border, used for skip actions |
| `.btn-checkin` | Green, check-in actions |
| `.btn-call` | Amber, call-to-consultation |
| `.dash-view-btn` | Small blue pill — view details |
| `.dash-action-btn` | Compact 11px action button |
| `.pp-btn-primary` | Tailwind utility layer variant |
| `.pp-btn-secondary` | Tailwind utility layer variant |

### Segmented Toggle (List/Grid)
**File**: [appointments.css](file:///c:/Users/hp/Desktop/Github/homeo-x/apps/web/src/features/appointments/styles/appointments.css)
```html
<div class="appt-segmented-toggle">
  <button class="appt-segmented-btn active"><ListIcon /> List</button>
  <button class="appt-segmented-btn"><Grid /> Grid</button>
</div>
```

---

## 6. Cards

### Standard Card
```html
<div class="pp-card">Content</div>
```
White bg, `--pp-warm-4` border, `--pp-radius-card`, `--pp-shadow-sm`.

### Premium Card
```html
<div class="pp-card-premium">Elevated content</div>
```
Adds `--pp-premium-shadow`, hover lifts with blue border.

### Dashboard Cards
| Class | Usage |
|---|---|
| `.dash-card` | Section card with header/body |
| `.dash-card-header` | `--pp-warm-1` bg, bottom border |
| `.dash-card-body` | 20px padding content area |
| `.dash-sidebar-card` | Sidebar widget card |
| `.sa-kpi-card` | Admin KPI — glassmorphism effect |
| `.sa-stat-card` | Secondary stat — compact |
| `.sa-action-card` | Quick action button card |

### Grid Card (Patient/Appointment)
```html
<div class="appt-card appt-grid-card">
  <div class="appt-grid-card-header">...</div>
  <div class="appt-grid-card-detail">...</div>
  <div class="appt-grid-card-actions-minimal">...</div>
</div>
```

---

## 7. Pagination

**File**: [patients.css](file:///c:/Users/hp/Desktop/Github/homeo-x/apps/web/src/features/patients/styles/patients.css#L406-L538)

### Structure
```html
<div class="pat-pagination-bar">
  <div class="pat-pagination-info-wrap">
    <span class="pat-pagination-info">Showing 1-10 of 50</span>
    <select class="pat-pagination-limit">...</select>
  </div>
  <div class="pat-pagination-controls">
    <button class="pat-pagination-btn"><ChevronLeft /></button>
    <button class="pat-pagination-page is-active">1</button>
    <button class="pat-pagination-page">2</button>
    <button class="pat-pagination-btn"><ChevronRight /></button>
  </div>
</div>
```

### Key Styles
- Active page: `#334155` bg, white text
- Page buttons: 32×32px, `#e2e8f0` border, 8px radius
- **Mobile**: Stacks vertically, centers controls, full-width select

---

## 8. Shimmer Skeleton Loader

**File**: [role-dashboards.css](file:///c:/Users/hp/Desktop/Github/homeo-x/apps/web/src/features/dashboard/pages/role-dashboards.css#L893-L926)

### Animation
```css
@keyframes shimmer {
  0%   { background-position: -1000px 0; }
  100% { background-position: 1000px 0; }
}
```

### Classes
| Class | Description |
|---|---|
| `.skeleton-box` | Base shimmer — gradient sweep animation, 2s infinite |
| `.skeleton-text` | 12px height text placeholder |
| `.skeleton-text.title` | 24px height, 40% width heading |
| `.skeleton-circle` | 40×40px circle for avatars |

### Usage (Table Skeleton)
```jsx
{isLoading && (
  <table class="pp-table">
    <thead><tr>
      {Array.from({length: 6}).map((_, i) => (
        <th><div class="skeleton-box" style={{height:12, width:40}} /></th>
      ))}
    </tr></thead>
    <tbody>
      {Array.from({length: 10}).map((_, row) => (
        <tr>{Array.from({length: 6}).map((_, col) => (
          <td><div class="skeleton-box" style={{height:24, width: col===0 ? 120 : 80}} /></td>
        ))}</tr>
      ))}
    </tbody>
  </table>
)}
```

### Usage (Dashboard Skeleton)
See [doctor-dashboard.tsx L187-L268](file:///c:/Users/hp/Desktop/Github/homeo-x/apps/web/src/features/dashboard/pages/doctor-dashboard.tsx#L187-L268) — KPI cards, HUD, queue rows, sidebar all use skeleton layout.

---

## 9. Search Bar

### Dashboard Header Search
**File**: [index.css](file:///c:/Users/hp/Desktop/Github/homeo-x/apps/web/src/index.css#L1332-L1403)

Mobile: Icon-only (36×36px button) → Desktop (768px+): Full input with icon.

| Class | Description |
|---|---|
| `.dh-search-wrap` | Container — adapts mobile/desktop |
| `.dh-search-input` | Hidden on mobile, block on 768px+ |
| `.dh-search-icon` | Absolute positioned magnifier |
| `.dh-kbd` | Keyboard shortcut badge (desktop only) |

### Patient List Search
**File**: [patients.css](file:///c:/Users/hp/Desktop/Github/homeo-x/apps/web/src/features/patients/styles/patients.css#L800-L900)

```html
<div class="mmc-pl-search-wrap">
  <Search class="mmc-pl-search-icon" />
  <input class="mmc-pl-search-input" placeholder="Search..." />
</div>
```

---

## 10. List / Grid Toggle

**File**: [patient-list-page.tsx](file:///c:/Users/hp/Desktop/Github/homeo-x/apps/web/src/features/patients/pages/patient-list-page.tsx#L97-L112)

```jsx
<div className="appt-segmented-toggle">
  <button className={`appt-segmented-btn ${viewMode === 'list' ? 'active' : ''}`}>
    <ListIcon size={16} /> List
  </button>
  <button className={`appt-segmented-btn ${viewMode === 'grid' ? 'active' : ''}`}>
    <Grid size={16} /> Grid
  </button>
</div>
```

**List mode** → `<table class="pp-table">` inside `.pp-table-scroll`  
**Grid mode** → `<div class="appt-card-grid">` with `.appt-grid-card` children

Grid layout: `1fr` mobile → `repeat(2, 1fr)` at 640px → `repeat(3, 1fr)` at 1024px

---

## 11. Kebab Menu (3-dot Dropdown)

**File**: [appointments.css](file:///c:/Users/hp/Desktop/Github/homeo-x/apps/web/src/features/appointments/styles/appointments.css)

```html
<div class="appt-kebab-wrap">
  <button class="appt-kebab-btn"><MoreVertical /></button>
  <div class="appt-kebab-menu">
    <button class="appt-kebab-item"><Edit2 /> Edit</button>
    <div class="appt-kebab-divider" />
    <button class="appt-kebab-item text-danger"><Trash2 /> Delete</button>
  </div>
</div>
```

---

## 12. KPI Strips

### Doctor/Receptionist Dashboard
**File**: [role-dashboards.css](file:///c:/Users/hp/Desktop/Github/homeo-x/apps/web/src/features/dashboard/pages/role-dashboards.css#L16-L78)

```html
<div class="dash-kpi-strip">
  <div class="dash-kpi-item">
    <span class="dash-kpi-label">DAILY VISITS</span>
    <div class="dash-kpi-value-row">
      <span class="dash-kpi-value">24</span>
      <span class="dash-kpi-trend trend-up">+12%</span>
    </div>
  </div>
</div>
```
Grid: 2-col mobile → 4-col at 768px.

### Admin Dashboard
**File**: [admin-dashboard.css](file:///c:/Users/hp/Desktop/Github/homeo-x/apps/web/src/features/dashboard/pages/admin-dashboard.css#L110-L194)

`.sa-kpi-card` — Glassmorphism: `rgba(255,255,255,0.03)` bg + `backdrop-filter: blur(12px)`. Hover lifts -4px.

---

## 13. Badges

| Class | Colors |
|---|---|
| `.badge-success` / `.db-badge-success` | Green bg/text |
| `.badge-primary` / `.db-badge-primary` | Blue bg/text |
| `.badge-warning` | Amber bg/text |
| `.badge-danger` / `.db-badge-danger` | Red bg/text |
| `.pp-badge-blue/green/red/amber/neutral` | Tailwind utility variants |
| `.pat-reg-badge` | Mono font registration ID pill |
| `.pat-relation-badge` | Family relation tag |
| `.token-badge` | Dark token number badge |

All badges: 10px font, 800 weight, uppercase, pill radius.

---

## 14. Modals

**File**: [role-dashboards.css](file:///c:/Users/hp/Desktop/Github/homeo-x/apps/web/src/features/dashboard/pages/role-dashboards.css#L564-L647)

```html
<div class="modal-overlay">
  <div class="modal-box">
    <div class="modal-header">
      <h3 class="modal-title">Title</h3>
      <button class="modal-close"><X /></button>
    </div>
    <div class="modal-body">Content</div>
    <div class="modal-footer">
      <button class="btn-secondary">Cancel</button>
      <button class="btn-primary">Confirm</button>
    </div>
  </div>
</div>
```

Overlay: `rgba(15,23,42,0.4)` + blur(8px). Box: max-width 440px, `modalIn` animation.

---

## 15. Sidebar Navigation

**File**: [index.css](file:///c:/Users/hp/Desktop/Github/homeo-x/apps/web/src/index.css#L1514-L1705) · [sidebar.tsx](file:///c:/Users/hp/Desktop/Github/homeo-x/apps/web/src/shared/components/sidebar.tsx)

| Class | Description |
|---|---|
| `.sb-backdrop` | Mobile overlay |
| `.sb-container` | Fixed sidebar, slides from left on mobile, sticky on 1024px+ |
| `.sb-brand` | Logo + app name header |
| `.sb-nav-link` | Nav item — 14px, 500 weight, 12px radius |
| `.sb-nav-link--active` | Active: blue tint bg, blue text |
| `.sb-folder-btn` | Collapsible section header |
| `.sb-sub-nav` | Indented sub-items |
| `.sb-logout-btn` | Red danger logout at footer |

---

## 16. Command Palette (⌘K)

**File**: [index.css](file:///c:/Users/hp/Desktop/Github/homeo-x/apps/web/src/index.css#L1820-L2038) · [command-palette.tsx](file:///c:/Users/hp/Desktop/Github/homeo-x/apps/web/src/shared/components/command-palette.tsx)

| Class | Description |
|---|---|
| `.cp-backdrop` | Blur overlay, z-index 100 |
| `.cp-modal` | 560px centered modal, top 15vh |
| `.cp-search-wrap` | Search input row with icon |
| `.cp-results` | Scrollable results, max-height 380px |
| `.cp-group` | Section group with label |
| `.cp-item` | Result item row with icon + label + arrow |
| `.cp-footer` | Keyboard hints bar |

---

## 17. Dashboard Header

**File**: [index.css](file:///c:/Users/hp/Desktop/Github/homeo-x/apps/web/src/index.css#L1083-L1512) · [dashboard-header.tsx](file:///c:/Users/hp/Desktop/Github/homeo-x/apps/web/src/shared/components/dashboard-header.tsx)

| Class | Description |
|---|---|
| `.dh-bar` | Sticky top header, 56px height |
| `.dh-menu-btn` | Hamburger (mobile) |
| `.dh-breadcrumb` | Hidden mobile, flex on 768px+ |
| `.dh-live-badge` | Green pulse dot + "LIVE" text |
| `.dh-date` | Date display (1024px+ only) |
| `.dh-icon-btn` | Circular icon button (bell, etc.) |
| `.dh-cta-btn` | Primary CTA, collapses to icon-only on 480px |

---

## 18. Avatars

**File**: [patients.css](file:///c:/Users/hp/Desktop/Github/homeo-x/apps/web/src/features/patients/styles/patients.css#L5-L46)

| Class | Size | Radius |
|---|---|---|
| `.pat-avatar` (base) | 32×32 | 8px |
| `.pat-avatar--sm` | 32×32 | 8px |
| `.pat-avatar--md` | 42×42 | 10px |
| `.pat-avatar--lg` | 64×64 | 12px |
| `.pat-avatar--warm` | — | Warm neutral colors |
| `.dash-avatar` | 32×32 | 8px |

---

## 19. Animations

| Name | Duration | Usage |
|---|---|---|
| `fadeIn` | 0.25s | General entrance |
| `shimmer` | 2s infinite | Skeleton loading |
| `pulse` / `pulse-dot` | 1.5–2s infinite | Active indicators |
| `spin` | 1s infinite | Loading spinners |
| `slideInRight` | 0.3s | Drawer entrance |
| `modalIn` | 0.25s | Modal entrance |
| `cp-slide-in` | 0.15s | Command palette |
| `db-fadeIn` | 0.35s | Dashboard page entrance |

---

## 20. Responsive Breakpoints

| Breakpoint | Target |
|---|---|
| `< 480px` | Small mobile — single column, icon-only buttons |
| `≥ 480px` | Large mobile — 2-col grids |
| `≥ 640px` | Small tablet — drawer grids expand |
| `≥ 768px` | Tablet — tables side-by-side, search expands |
| `≥ 1024px` | Desktop — sidebar sticky, 2-col dashboard grid |

### Visibility Helpers
| Class | Behavior |
|---|---|
| `.hide-mobile` | Hidden < 768px |
| `.show-mobile` | Visible < 768px only |

---

## 21. File Map

| Component Area | CSS File | TSX File |
|---|---|---|
| Design tokens & base | `src/index.css` | — |
| Patient list/form | `features/patients/styles/patients.css` | `pages/patient-list-page.tsx` |
| Patient drawer | `features/patients/styles/patients.css` | `components/patient-form-drawer.tsx` |
| Appointments | `features/appointments/styles/appointments.css` | `pages/`, `components/` |
| Dashboard shared | `features/dashboard/pages/role-dashboards.css` | — |
| Admin dashboard | `features/dashboard/pages/admin-dashboard.css` | `pages/admin-dashboard.tsx` |
| Doctor dashboard | `features/dashboard/pages/role-dashboards.css` | `pages/doctor-dashboard.tsx` |
| Clinic admin dashboard | `features/dashboard/pages/clinic-admin-dashboard.css` | `pages/clinic-admin-dashboard.tsx` |
| Sidebar | `src/index.css` | `shared/components/sidebar.tsx` |
| Header | `src/index.css` | `shared/components/dashboard-header.tsx` |
| Command palette | `src/index.css` | `shared/components/command-palette.tsx` |
