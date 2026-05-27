# RaceTechAssistant Collaboration & Architecture Guide

This document serves as a persistent context and reference guide for AI collaborators and developers. It outlines the core architecture, technical stack, styling standards, and critical lessons learned throughout the development of **RaceTechAssistant**.

---

## Project Overview

**RaceTechAssistant** is a premium, client-side engineering utility designed for sim racers to compute exact fuel strategies and estimate optimal cold tyre pressures based on ambient weather shifts and brake duct configurations.

### Core User Flows
1. **Fuel Calculation Strategy**:
   * **Basic Mode**: Simple lap-count multiplication for quick, straightforward strategizing.
   * **Normal Mode (Default)**: Advanced time-based strategy converting duration and pace into total fuel requirements, featuring custom safety margins.
   * **Pro Mode**: A multi-stint planning engine incorporating mandatory pitstops, physical tank capacities, and custom lap offsets (Formation and Cool-down laps). Runs either a **Greedy Maximum-Stint** or **Equal-Split** distribution strategy.
2. **Tyre Pressure Adjustments**:
   * Unified axle adjustment calculating precise compensation (`-0.1 psi` per `+1°C` increase, or `+0.1 psi` per `-1°C` decrease) paired with non-linear brake duct step-change modeling (using a standard `0.2 psi / step` scale with a specialized `0.3 psi` shift between steps `2` and `3`).
3. **Clipboard Strategizing**:
   * Direct output formatting and copy capability to share logs in beautifully structured, distraction-free markdown templates.

---

## Technical Stack

The application is engineered as a zero-dependency, serverless, 100% static frontend application to guarantee sub-millisecond calculation speeds and bulletproof offline reliability.

| Layer | Component / Library | Version / Source | Purpose |
| :--- | :--- | :--- | :--- |
| **Markup & Structure** | HTML5 | Modern Standard | Clean, semantic layouts supporting accessibility (`aria-*` tags). |
| **Styling & Theme** | CSS3 Custom Properties | Native | Slate/Obsidian premium theme, brand variables, typography, layouts. |
| **Base UI Layouts** | Bootstrap CSS | v5.3.3 (CDN) | Layout grids, navigation components, and responsive grid wrappers. |
| **Logic & Calculations** | Vanilla JS (ES6+) | Native Browser Engine | Strategy formulation, tyre delta calculations, storage, hotkeys. |
| **Typography** | Google Fonts | Web Integration | **Outfit** (modern clean display) & **JetBrains Mono** (monospaced logs). |
| **Iconography** | Vector SVGs | Inline | Performance-optimized, responsive stroke illustrations. |

---

## Workflow & Rules

### Running the Application
* **Development / Production**: Fully static file delivery. Run locally by opening `index.html` in any browser or spinning up a simple static local web server:
  ```bash
  # Python 3 local server
  python3 -m http.server 8000
  
  # Node.js local server
  npx serve .
  ```

### Coding Standards
* **JavaScript Architecture**:
  * **Pure Math Engines**: Keep calculation routines (e.g. stint allocations, tyre pressure calculations) pure. They must accept raw numbers and return precise objects without interacting with the DOM.
  * **DOM Syncing**: Isolate HTML insertions and display toggles inside distinct, side-effect-heavy rendering functions (e.g., `calcFuel()`, `calcTemp()`, `setMode()`).
  * **Event Binding**: Maintain zero inline `on*` HTML attributes. All listeners must be dynamically bound via `addEventListener` in JavaScript.
* **Naming Conventions**:
  * **JavaScript variables/methods**: Strict `camelCase`.
  * **CSS Custom Properties**: Prefix with `--` using lowercase letters and dashes (e.g., `--brand`, `--background-card`).
  * **UI Classes**: Standard CSS `kebab-case`.
  * **Form Input IDs**: Maintain explicit camelCase mapped directly to object keys for rapid serialization (`lapsFixed_b`, `pFL`, `tBefore`).
* **Input Validation & UX**:
  * Form checking must trigger on all `input` events, calling `updateInputErrors()`.
  * Style invalid wrappers by appending the `.invalid` class to the `.input` element. Populated message text resides in adjacent `.error-message` containers.

### Documentation & Commits
* **Commit Guidelines**: Use standard imperative-style prefixes (e.g., `feat: add pro equal-split strategy`, `fix: isolate hotkey modifier keys`).
* **AI-Reference Free**: All commits, internal developer comments, and documentation must remain strictly technical, direct, and completely free of meta-references to "AI", "LLM", or "Copilot".

---

## Design System & UI

The visual language follows a **carbon-engineered instrumentation styling** featuring sleek dark modes, vibrant feedback accents, and deliberate layout structures.

### Colors & Variables
```css
:root {
    --brand: #e63c2e;             /* Vibrant accent brand red */
    --brand-glow: rgba(230, 60, 46, 0.15);
    
    --bg-dark: #0c0c0e;           /* Deep primary obsidian black */
    --bg-card: #16161a;           /* Sleek slate black card panels */
    
    --text-primary: #ffffff;      /* High contrast reading */
    --text-secondary: #a1a1aa;    /* Subtle descriptive labels */
    
    --border-dim: #27272a;        /* Sleek separating border boundaries */
}
```

### Typography
* Headings, inputs, and primary toggle buttons use **Outfit** to project a modern, premium aesthetic.
* Computed strategy charts, logs, and delta matrices use **JetBrains Mono** for clear, legible column alignment.

### Animated Interactions
* **Glow Transitions**: Clickable cards, input wrappers, and action buttons transition their borders and drop-shadows with smooth CSS keyframes or transitions (`transition: all 0.2s ease-in-out`).
* **Copy Trigger Glow**: Pressing the copy tools animates the button's border color to `var(--brand)` and transforms its label to `"Copied!"` for exactly `2000ms`.

---

## Architecture

The project maintains a lightweight, flat directory layout optimizing delivery speed and reducing logic lookup latency:

```
RaceTechAssistant/
├── assets/
│   ├── app.js       # Core logic engine: tab switching, forms logic, validation, calculators, and hotkey listeners
│   └── style.css    # Premium CSS design system: typography, variables, responsive forms, cards, animations
├── index.html       # Primary semantic single-page UI structure containing Fuel and Tyre panels
├── README.md        # Feature log, product description, and high-level developer specifications
├── GEMINI.md        # Persistent AI context & technical architecture guide (This file)
└── CLAUDE.md        # Persistent AI context & technical architecture guide (Identical mirror)
```

---

## Lessons Learned & Gotchas

### Secure Clipboard API Permission Block
* **Gotcha**: Modern browsers block `navigator.clipboard.writeText` programmatically when triggered via synthetic `.click()` functions from standard `keydown` listeners. 
* **Fix**: Invoke `copyToClipboard()` directly inside the synchronous execution path of the keydown event. Because the keydown event is a genuine user activation, the browser keeps the clipboard permission context active.

### Global Hotkey Modifier Interception
* **Gotcha**: Attaching global keyboard listeners for single-character actions like `r` (reset) and `c` (copy) will intercept critical browser hotkeys like page reloads (`Cmd+R` / `Ctrl+R`) and copying selected strings (`Cmd+C` / `Ctrl+C`).
* **Fix**: Ensure that all modifier keys are checked and rejected at the very start of the keydown handler:
  ```javascript
  if (e.ctrlKey || e.metaKey || e.altKey || e.shiftKey) return;
  ```

### Initialization Execution and the Temporal Dead Zone (TDZ)
* **Gotcha**: Calling dynamic layout setters (e.g. `setMode()`) on first load before their dependent state tracking variables (like `currentFuelMode`) are fully declared in JS causes immediate script failures.
* **Fix**: Declare all model state variables, array lookups, and global configuration definitions at the absolute top of the source file before binding elements or initializing tab selections.

### Layout Collapses on High-Aspect Ratios
* **Gotcha**: Setting fixed widths on calculation outputs causes horizontal clipping on smaller mobile displays.
* **Fix**: Build all card wrappers using Bootstrap responsive container columns combined with flexbox layouts (`d-flex flex-column`) to ensure strategic outputs wrap gracefully on vertical panels.
