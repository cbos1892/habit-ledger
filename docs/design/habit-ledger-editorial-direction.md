# Habit Ledger editorial direction

## Design read

Habit Ledger is a private habit coach for people pursuing steady self-improvement. The interface should feel 60% like a clean modern café and 40% like a tactile paper journal. Calm describes the coach's manner, not the user's objective.

## Principles

1. Use typography, spacing, alignment, and quiet dividers before introducing a container.
2. Reserve elevated or tinted surfaces for information that benefits from grouping, such as daily progress.
3. Present individual habits as open rows rather than bordered cards.
4. Communicate completion through shape, value, text, and color so state never depends on color alone.
5. Keep color mineral and muted. Earth tones are supporting material, not the whole composition.
6. Keep coaching copy direct and specific. “Small steps build a good day.” is the ambient product line.
7. Preserve generous touch targets, visible focus, reduced-motion support, and readable contrast.

## Palette foundation

The first palette is named **Coffeehouse**. It provides coordinated light and dark appearances.

### Light

- Canvas: warm chalk
- Tonal field: oatmeal and putty
- Raised surface: parchment
- Primary text: charcoal-umber
- Muted text and rules: mushroom gray
- Primary interaction: dusty adobe, deliberately quieter than terracotta
- Supporting identity colors: deep muted teal, lichen sage, smoky mauve

### Dark

- Canvas: deep ink-slate with a subtle teal-gray undertone
- Tonal field: lichen-charcoal and smoked graphite
- Raised surface: soft slate
- Primary text: parchment gray
- Muted text and rules: fog and mineral gray
- Primary interaction: smoky mauve
- Supporting identity colors: subdued sage, mineral teal, and dusty adobe in small marks only

## Typography

- Display: Newsreader, using its optical-size axis and modest weights
- Interface and body: Manrope variable
- Numbers: tabular figures
- Sentence case is the default. Uppercase labels are reserved for compact metadata, not repeated as page decoration.

## Surface rules

- A card must communicate elevation, containment, or a distinct interaction boundary.
- Habit rows use whitespace and hairline dividers.
- Avoid colored left edges.
- Avoid pill shapes unless the control's compact, selectable nature benefits from them.
- Use tinted shadows sparingly and keep lighting direction consistent.

## Theme architecture

Appearance and palette are separate concepts:

- Appearance: light, dark, or system
- Palette: Coffeehouse initially, with room for future named palettes

The isolated Today prototype exercises all three appearance choices but does not persist them. Production persistence should be added only after the palette and components are approved.

## Approved reference

The current visual reference is `today-coffeehouse-concept.png` in this directory. It is directional rather than pixel-exact. The browser implementation is authoritative for responsive behavior, accessibility, and interaction.
