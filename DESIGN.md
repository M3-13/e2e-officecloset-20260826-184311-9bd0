# Design — Project Identity

> This document is project-long-lived. Tokens are not changed without
> the Architect's approval. Developers MUST use these tokens
> instead of improvising their own colors/spacings.

## Style Direction

Warmer, dunkler Hollywood-Look mit Champagner-Gold-Akzent und edler Serifen-Typografie — glamourös, hochwertig und bewusst zurückhaltend.

## Colors

- `--color-bg`: **#0F0C09**
- `--color-surface`: **#171310**
- `--color-surface_alt`: **#1E1915**
- `--color-fg`: **#F3ECE1**
- `--color-muted`: **#9A8F82**
- `--color-border`: **#2A241E**
- `--color-accent`: **#C6A15B**
- `--color-accent_hover`: **#D6B26E**
- `--color-accent_active`: **#B08A48**
- `--color-accent_soft`: **#2A2419**
- `--color-danger`: **#C0524A**
- `--color-success`: **#5E8C6A**

## Typography

- `font_family`: Georgia, 'Times New Roman', serif
- `body_font_family`: system-ui, -apple-system, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif
- `heading_weight`: 600
- `body_weight`: 400
- `size_scale`: xs: 12px; sm: 14px; base: 16px; lg: 20px; xl: 28px; xxl: 36px

## Spacing Scale

- `--space-0`: 4px
- `--space-1`: 8px
- `--space-2`: 12px
- `--space-3`: 16px
- `--space-4`: 24px
- `--space-5`: 32px
- `--space-6`: 48px

## Border-Radii

- `--radius-sm`: 4px
- `--radius-md`: 8px
- `--radius-lg`: 16px
- `--radius-pill`: 999px

## Components

### Button

min-height 44px (mobile tap), padding 12px 24px, radius md, font-family body stack, font-weight 600, bg=accent, color=bg, border none. Default: bg #C6A15B, color #0F0C09. Hover: bg #D6B26E. Active: bg #B08A48, transform translateY(1px). Disabled: opacity 0.5, cursor not-allowed, kein Hover. Focus-visible: 2px outline #D6B26E, offset 2px.

### Card

bg=surface #171310, border 1px solid #2A241E, radius lg 16px, padding 16px, Schatten 0 8px 24px rgba(0,0,0,0.25). Hover: border #C6A15B, transition 120ms ease.

### Input

min-height 44px, padding 10px 12px, radius md, bg=surface_alt #1E1915, border 1px solid #2A241E, color=fg, font-family body stack, font-size base. Placeholder: color #9A8F82. Focus: border #C6A15B, outline none, box-shadow 0 0 0 3px rgba(198,161,91,0.2). Invalid: border #C0524A.

### Select

wie Input, min-height 44px, padding 10px 12px, radius md, bg=surface_alt, border #2A241E, color=fg. Chevron in muted. Focus wie Input.

### Tag/Badge

Kategorie-Filter-Chip: padding 6px 14px, radius pill, bg=surface_alt, border 1px solid #2A241E, color=#F3ECE1, font-size sm. Aktiv: bg #C6A15B, color #0F0C09, border #C6A15B. Hover (inaktiv): border #9A8F82.

### Topbar

sticky oben, bg=bg mit 90% Deckkraft + backdrop-blur 8px, border-bottom 1px solid #2A241E, height 64px, padding 0 24px, Logo/App-Name in Serif, color=fg, font-size lg, letter-spacing 0.5px.

### ImageTile

Kleidungsstück-Karte: Card-Basis, Bildbereich 4:5 mit bg=surface_alt, object-fit cover, radius md. Unterhalb Name (font-weight 600, color fg) und Kategorie (font-size xs, color muted, uppercase letter-spacing 0.08em). Löschen-/Bearbeiten-Aktionen als dezent platzierte Icon-Buttons mit min-target 44px.

### Modal

Overlay bg rgba(15,12,9,0.7), Zentrierung auf Viewport. Dialog: bg=surface, border 1px solid #2A241E, radius lg, max-width 480px, padding 24px, Schatten 0 16px 48px rgba(0,0,0,0.4). Titel in Serif, font-size lg. Schließen-Button min-target 44px.

### FormError

Inline-Meldung: color #F3ECE1, bg rgba(192,82,74,0.12), border 1px solid #C0524A, radius sm, padding 8px 12px, font-size sm, margin-top 8px. Icon (Ausrufezeichen) in #C0524A.

### EmptyState

Zentriert im Container, padding 48px 24px. Überschrift in Serif, font-size lg, color fg; Beschreibung font-size base, color muted; darunter primärer Button mit 16px Abstand.

## Layout Principles

- Container max-width 1200px, horizontal zentriert, padding 0 16px (mobil) bzw. 0 24px (Desktop).
- Breakpoints: mobil < 640px, Tablet 640–1024px, Desktop > 1024px.
- Garderobe-/Outfit-Raster: CSS Grid mit repeat(auto-fill, minmax(200px, 1fr)), gap 16px.
- Vertikale Abstände zwischen Sektionen 32–48px, innerhalb von Karten 8–12px.
- Sticky Topbar mit z-index 100, Modals mit z-index 200.
- Formulare einspaltig mit max-width 480px, Label 8px über dem Input.
- Inhalte bleiben auf kleinen Bildschirmen einspaltig nutzbar; keine horizontal scrollenden Bereiche außer der Kategorie-Chip-Leiste.
