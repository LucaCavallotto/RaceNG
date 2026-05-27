# RaceTechAssistant

A premium, responsive engineering assistant for sim racers to calculate optimal fuel strategy and precise tyre cold pressure adjustments. Designed with a retro-futuristic engineering-style interface, harmonized dark-mode color scheme, and smooth interactive micro-animations.

## Features

### Fuel Calculator
Three dedicated calculation modes to plan your race with optimal efficiency:

- **Basic Mode**: Simple lap-count multiply. Enter fixed total laps and fuel consumption per lap. Displays total fuel and total laps in the results callout.
- **Normal Mode (Default)**: Time-based calculation. Input race duration, average lap pace, fuel consumption per lap, and safety margin. Dynamically computes and displays the total required fuel volume and total laps.
- **Pro Mode (Advanced)**: Comprehensive strategy engine incorporating tank capacity, mandatory pitstops, safety margin, and specialized lap options (Formation lap, Cool-down lap). Highlights include:
  - **Greedy Maximum-Stint Strategy (`mandStops = 0`)**: Calculates strategy by filling the tank to 100% capacity (safe maximum integer laps) for all initial stints, leaving only the exact remaining fuel required to finish the race in the final stint.
  - **Equal-Split Strategy (`mandStops > 0`)**: Distributes laps as evenly as possible across the stints while mathematically guaranteeing that no stint ever exceeds the physical tank capacity.
  - **Interactive Pitstop Schedule**: Renders results inside a card grid showing exact stint lap ranges, stint fuel targets, and a glowing Total Fuel summary card with total laps computed.

### Tyre Pressures Calculator
Calculate adjusted cold tyre pressures based on ambient weather shifts and brake duct configurations:

- **Unified Interface**: Enter current cold pressures once and preview the estimated targets in a realistic 2x2 tyre layout.
- **Ambient Temperature Compensation**: Calculates pressure delta across all four tyres (`-0.1 psi` per `+1°C` ambient temperature increase, or `+0.1 psi` per `-1°C` decrease).
- **Coupled Front & Rear Brake Ducts**: Adjusts tyre pressures based on brake duct sizing shifts before/after. Front brake ducts affect the front axle, and rear brake ducts affect the rear axle.
- **Non-Linear Step Math**: Implements standard step shifts (`0.2 psi / step`) with specialized transition logic for the crucial step between `2` and `3` (`0.3 psi`).

### Keyboard Controls & Hotkeys
RaceTechAssistant supports direct keyboard shortcuts to streamline your strategy formulation:
- **`Enter`**: Focus any input field and press `Enter` to instantly execute the calculation for the active panel.
- **`R` / `r`**: Press to reset the active calculator tab and clear stored configuration fields.
- **`C` / `c`**: Press to copy computed strategy or pressure targets directly to your clipboard (only when results are visible).
- **Shortcut Safety**: Shortcuts dynamically ignore standard modifier key groups (e.g. `Cmd`, `Ctrl`, `Alt`, `Shift`) to prevent overriding native browser commands such as page reload (`Cmd+R` / `Ctrl+R`) and highlighted text copying (`Cmd+C` / `Ctrl+C`).

## Disclaimer
Calculations are estimates based on standard physics models. Results may vary by simulator, car class, and track conditions. Validate your strategy with a practice stint before competitive use.
