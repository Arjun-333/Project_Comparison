# Permanent Design System & Theme Palette Guide
**Project:** Legal AI Institutional Evaluation & Analytics Suite (LegalEval)  
**Definitive Visual Identity:** Pure Pitch Black (`#0D0D0D`), Crisp Pure White (`#FFFFFF`), Deep Matte Charcoal (`#17181C`), and High-Energy Vibrant Canary Yellow (`#FFC700`).  
**Theme Policy:** **Strictly Light Executive Theme.** Dark mode has been intentionally removed from the project.  
**Visual Reference:** Extracted directly from user-supplied modern landing page design with curved geometric Canary Yellow and Pitch Black elements on a clean white/light canvas.

---

## 1. Master Palette

| Token Name | Hex Code | Primary Role | Usage Specifications |
| :--- | :--- | :--- | :--- |
| **Crisp Pure White** | `#FFFFFF` | Primary Card Surfaces | Card containers, interactive drawers, search inputs, modal dialogs. |
| **Light Canvas Background** | `#F8F9FA` | Page Body Canvas | The base desktop workspace background. |
| **Pitch Black** | `#0D0D0D` | Primary Headings & Bold Contrast | Primary text, navigation active pill backgrounds, high-contrast badges. |
| **Vibrant Canary Yellow** | `#FFC700` (Hover: `#E6B400`, Text: `#B38600`, Glow: `#FFD54F`) | High-Energy Brand Accent | Primary action buttons (`+ Add Run`, `+ Write Finding`), active indicator text, #1 winner crowns, visualizer curve and fill glow. |
| **Deep Matte Charcoal** | `#17181C` / `#22242B` | Structural Highlights & Buttons | Secondary buttons, hero banner background, pill hover states. |
| **Slate Border** | `#E5E7EB` | Surface Framing | Card borders, table dividers, input borders. |
| **Cool Zinc Silver** | `#9CA3AF` / `#52525B` | Secondary Typography | Metric units, parameter labels, author timestamps, chart gridlines. |

---

## 2. Pipeline Representation Colors

All 3 legal platforms strictly follow the Black / Charcoal / Canary Yellow harmony:

| Platform / Pipeline | Primary Hex | Theme Rationale |
| :--- | :--- | :--- |
| **AILQA** | `#FFC700` | **Vibrant Canary Yellow** — Directly embodies the hero accent color. Highlighted as the high-accuracy benchmark. |
| **LexVed** | `#334155` | **Slate Charcoal** — Stately dark slate tone matching the dark structural elements of the reference image. |
| **LexRAG** | `#4B5563` | **Cool Steel Graphite** — Modern metallic slate sitting harmoniously between pitch black and canary yellow. |

### LexVed Sub-Pipelines (Graduated Slate Family)
- `LEXVED-BGE-M3-ENHA`: `#334155`
- `LEXVED-BGE-M3-PRIM`: `#475569`
- `LEXVED-MPNET-ENHA`: `#1E293B`
- `LEXVED-MPNET-PRIM`: `#3B4252`
- `LEXVED-DISTILBERT-ENHA`: `#0F172A`
- `LEXVED-DISTILBERT-PRIM`: `#4C566A`
- `LEXVED-MINILM-ENHA`: `#090D16`
- `LEXVED-MINILM-PRIM`: `#5E697F`

---

## 3. Strict Typography & Contrast Rules

- **Yellow on Black:** Always use `#FFC700` text on `#0D0D0D` or `#17181C` surfaces for stunning contrast (>11:1).
- **Black on Yellow:** Any solid Canary Yellow button (`bg-[#FFC700]`) MUST use `#0D0D0D` text (`text-[#0D0D0D] font-black` or `font-extrabold`) for maximum readability.
- **Canvas & Cards:** Crisp white `#FFFFFF` cards on subtle `#F8F9FA` background with `#0D0D0D` headings and `#52525B` subtext.
- **No Mismatches:** Zero green, zero bright royal blue, zero dull antique brown. Everything belongs strictly to this palette.
