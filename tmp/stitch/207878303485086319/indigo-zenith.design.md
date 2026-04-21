# Design System Specification: The Digital Atelier

## 1. Overview & Creative North Star
**Creative North Star: "The Neo-Classical Curator"**
This design system moves beyond the standard Material Design 3 implementation to create a high-end, editorial experience specifically optimized for the WeChat Mini Program environment. While it utilizes the MD3 logic of color roles and containment, it rejects the "template" look in favor of **The Neo-Classical Curator**—an aesthetic defined by aggressive whitespace, sophisticated Indigo depths, and a "paper-on-glass" layering philosophy.

We break the grid through intentional asymmetry: using large `display` typography to anchor layouts while metadata floats in a structured, airy hierarchy. The result is an interface that feels like a premium digital magazine rather than a utility app.

## 2. Colors & Surface Philosophy
The palette is rooted in a deep, vibrant Indigo (`primary: #4052b6`), balanced by a breathable, cool-tinted background (`background: #f9f5ff`).

### The "No-Line" Rule
**Explicit Instruction:** Designers are prohibited from using 1px solid borders for sectioning or containment.
- Boundaries: Defined solely through background color shifts. For example, a `surface_container_low` card must sit on a `surface` background.
- Signature Textures: Use subtle linear gradients for primary CTAs, transitioning from `primary (#4052b6)` at the top-left to `primary_dim (#3346a9)` at the bottom-right. This provides a "soul" and tactile depth that flat hex codes lack.

### Surface Hierarchy & Nesting
Treat the UI as a series of physical layers. Use the following tiers to define importance:
1. Base Layer: `surface` (#f9f5ff) - The canvas.
2. Structural Sections: `surface_container_low` (#f3eeff) - To group secondary content.
3. Interactive Cards: `surface_container_lowest` (#ffffff) - To make primary content "pop" against the tinted background.
4. Floating Elements: Use Glassmorphism. For overlays, use `surface` at 80% opacity with a `20px` backdrop-blur.

## 3. Typography: The Editorial Voice
We pair the geometric precision of **Plus Jakarta Sans** for headers with the high-readability of **Manrope** for utility.

- The Power Shift: Use `display-md` (2.75rem) for page headers, but set them with a `-2%` letter-spacing to create an authoritative, "locked-in" look.
- The Metadata Syntax: Metadata (Time, Location, Count) must always use `label-md` or `label-sm` in `on_surface_variant` (#595781). This creates a clear visual distinction between "Content" (Title) and "Context" (Meta).
- Hierarchy Note: Headline and Title styles should use a tighter line-height (1.1–1.2) to feel like intentional editorial blocks, while Body text should breathe at 1.5 line-height.

## 4. Elevation & Depth: Tonal Layering
Traditional drop shadows are a fallback, not a standard. We achieve depth through the **Layering Principle**.

- Stacking: Place a `surface_container_lowest` (White) card onto a `surface_container_low` background. This creates a natural "lift" without a single pixel of shadow.
- Ambient Shadows: If a floating action button or modal requires a shadow, use a "Tinted Ambient" approach:
  Blur: 24px | Spread: -4px | Color: `on_surface` (#2c2a51) at 6% opacity.
- Ghost Borders: For accessibility on high-brightness screens, use the `outline_variant` (#aca8d7) at 15% opacity. Never use 100% opaque outlines.

## 5. Components & List Specifications

### Elevated List Items (The Signature Component)
For the WeChat Mini Program context, lists must feel like "entries" in a ledger.
- Container: `surface_container_lowest` (#ffffff).
- Corner Radius: `xl` (1.5rem) for top-of-page featured items; `lg` (1rem) for standard list items.
- The Metadata Row:
  Time: Icon (16px) + `label-md` in `primary` (#4052b6).
  Location: Icon (16px) + `label-md` in `on_surface_variant`.
  Capacity: A "pill" using `secondary_container` (#d0ccff) with `on_secondary_container` (#3f37a0) text.
- Anti-Divider Rule: Never use a horizontal line between list items. Use a `spacing-4` (1rem) vertical gap to let the background color act as the separator.

### Buttons
- Primary: `primary` (#4052b6) background with `on_primary` (#f3f1ff) text. Shape: `full` (9999px) for a modern, friendly feel.
- Secondary: `surface_container_high` (#e3dfff) background. No border.
- Interaction: On press, transition to `primary_dim`.

### Input Fields
- Container: `surface_variant` (#ddd9ff) at 40% opacity.
- Active State: No thick border; instead, shift background to `surface_container_highest` (#ddd9ff) and change the label color to `primary`.

## 6. Do’s and Don’ts

### Do
- Use `display-lg` for empty states. A giant, faded number or word adds an editorial "Vibe" that an icon cannot.
- Use the `tertiary` (#923880) color sparingly for "Surprise and Delight" moments, such as a successful booking or a unique status tag.
- Lean into the `xl` (1.5rem) border radius for main containers to give the Mini Program a soft, premium feel.

### Don't
- Don't use pure black (#000000) for text. Always use `on_surface` (#2c2a51) to maintain the Indigo tonal depth.
- Don't use standard WeChat "Green" for success. Use `primary` or a custom blend to keep the user inside our specific brand world.
- Don't crowd the edges. WeChat users are accustomed to tight layouts; stand out by using `spacing-6` (1.5rem) as your standard page gutter.
