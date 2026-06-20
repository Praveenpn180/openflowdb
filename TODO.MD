## Canvas & Interactions

- Add a minimap/overview panel for navigating large diagrams.
- Implement snap-to-grid (with toggle) when dragging tables instead of free-form positioning.
- Add arrow-key nudging of the selected table(s) for fine-grained positioning.
- Require a confirmation (or undo toast) before deleting a relationship via canvas click, since it currently deletes on a single click with no warning.
- Highlight valid/invalid drop targets (green/red) while dragging a relationship handle, instead of only showing a dashed line.
- Clamp the relationship "kind picker" popup position so it never renders off-screen near canvas edges.
- Add a "zoom to selection" action in addition to "fit view."
- Support pinch-to-zoom and two-finger pan for trackpad/touch users.
- Add a floating "+" button on the canvas for adding tables (in addition to double-click and sidebar).
- Add right-click context menus on tables and columns for quick actions (duplicate, delete, recolor, add column).
- Add table duplication (with a keyboard shortcut and context-menu entry).
- Add copy/paste support for tables within and across diagrams.
- Add alignment and distribution tools for multi-selected tables (align left/top, distribute evenly).
- Add a "lock position" toggle per table to prevent accidental dragging.
- Add a collapse/minimize toggle on table nodes to hide columns and declutter dense diagrams.
- Show a live count of selected tables/relationships somewhere persistent during multi-select.
- Add hover highlighting of all relationship lines connected to a hovered/selected table or column.
- Add an explicit "marquee select" toolbar mode/hint, since shift-drag selection is currently undiscoverable.

## Diagram Editing

- Support composite (multi-column) foreign keys, not just single-column relationships.
- Add support for parameterized types (e.g., `varchar(n)`, `numeric(p,s)`) instead of a flat type string.
- Add table-level "description/notes" and column-level "comment" fields for documentation.
- Add a custom color picker in addition to the 8 preset swatches.
- Add support for standalone indexes (separate from primary key/unique constraints).
- Add ENUM type support with an inline value editor.
- Add type-aware default-value helpers (boolean dropdown, `now()` suggestion for timestamps, etc.).
- Add drag-to-reorder columns via a drag handle instead of only up/down arrow buttons.
- Add "Enter to add new column" keyboard flow when focused on the last column name field.
- Add bulk column selection and deletion within the Inspector.
- Detect and warn about circular foreign-key references in validation.
- Add a "quick fix" action button next to validation warnings (e.g., auto-add missing primary key).

## SQL / Export / Import

- Add syntax highlighting to the SQL preview and edit panel.
- Show a diff preview before applying hand-edited SQL changes to the diagram.
- Support `ALTER TABLE`, indexes, and column/table comments in generated SQL, not just `CREATE TABLE`.
- Add a "copy single statement" action per table in the SQL panel, not just copy-all.
- Add drag-and-drop file support for importing `.sql`/`.json` files onto the canvas.
- Show an import preview (tables/relationships to be added) before committing an SQL import.
- Add CSV/spreadsheet import to infer a table structure from sample data.
- Add SVG export alongside PNG.
- Add an option to export PNG with a transparent background.
- Add an optional title/watermark overlay when exporting diagram images.
- Warn the user with a native `beforeunload` prompt if there are unsaved local changes.

## Sharing & Versioning

- Replace native `confirm()` dialogs (version restore, clear canvas) with styled in-app confirmation modals.
- Add a visual side-by-side diagram comparison between two versions, not just SQL diff.
- Add a one-click "compare with last saved version" shortcut.
- Convert the share-role picker buttons to proper radio inputs for full keyboard/screen-reader support.
- Show a toast/confirmation when a share link is about to be revoked.
- Add expiration dates/options for share links.

## Dashboard & Account

- Add a search/filter box on the dashboard for users with many diagrams.
- Add sort options (name, dialect, created date) beyond default "last updated."
- Generate and display a diagram thumbnail preview on dashboard cards.
- Add bulk select/delete for diagrams on the dashboard.
- Add a "duplicate diagram" action from the dashboard.
- Add a show/hide password toggle on the login form.
- Add a "forgot password" link/flow on the login page.
- Replace raw Supabase auth error messages with friendlier, user-facing copy.

## Onboarding & Empty States

- Add a "Load sample diagram" button directly inside the empty-canvas state, not only via Command Palette.
- Add a first-run interactive tour/tooltip walkthrough for new users.
- Add a keyboard-shortcuts cheat-sheet modal accessible from the toolbar.
- Make the landing-page mock preview an interactive (not static) demo.
- Add contextual empty states to the Inspector when no columns exist on a table (currently just a small italic line).

## Accessibility

- Add a keyboard-only path for creating relationships and moving tables (not pointer-only).
- Audit and add missing `aria-label`s on icon-only buttons (e.g., kind-picker, color swatches).
- Verify and fix focus-visible states across custom toggle/switch controls in the Inspector.
- Increase contrast on small muted/10px label text for WCAG AA compliance.
- Ensure focus returns to the triggering element after closing dialogs (Import SQL, Share, etc.).
- Replace the native `title` attribute tooltip on validation badges with an accessible, readable rich tooltip.

## Responsiveness

- Add a responsive/collapsible layout for the editor's three-pane view on tablet and mobile widths.
- Add a mobile-friendly read-only diagram viewer mode for share links.
- Make the landing page hero preview and feature grid scale better on very small screens (already mostly responsive, but verify breakpoints below 360px).

## Keyboard Shortcuts

- Add `+`/`-` shortcuts for zoom in/out.
- Add a shortcut for table duplication (e.g., `⌘D`).
- Add a shortcut to deselect/clear multi-select distinct from `Escape` closing the inspector.
- Display all available shortcuts in a dedicated, searchable shortcuts panel.

## Theming & Visual Polish

- Allow the editor to respect a user's light/dark theme preference instead of forcing `dark` mode always.
- Add subtle enter/exit animations when tables or relationships are added/removed.
- Animate the zoom-percentage indicator and viewport transitions for smoother feel.
- Add a toast confirmation for undo/redo and other non-visual state changes so users get feedback.
- Add full-name tooltips on truncated table names in the canvas header.

## Small Quality-of-Life Features

- Add a search/filter input to the table list in the left sidebar.
- Add persistent stats (table count, column count, relationship count) somewhere in the UI.
- Add a "recently opened diagrams" or favorites/pinning feature.
- Detect and warn about concurrent edits to the same diagram from multiple tabs/sessions.
- Surface a visible error/retry option when auto-save silently fails, instead of failing silently.
- Make the static "Tips" panel in the editor sidebar collapsible/dismissible.
- Add precision/scale customization UI for numeric column types instead of a fixed default.
- Warn when dropping a relationship onto a non-primary-key target column about potential ambiguity.