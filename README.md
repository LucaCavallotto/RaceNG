# RaceTechAssistant

A lightweight engineering tool for sim racers to calculate fuel strategy and tyre pressure adjustments.

## Features

### Fuel Calculator
- **Normal Mode**: Basic race time and consumption calculations.
- **Pro Mode**: Adds tank capacity, formation/cool-down laps, mandatory pitstops, and detailed pitstop scheduling.
- **Safety Margin**: Customizable fuel buffer percentage.

### Tyre Pressures Calculator
- **Unified Adjustments**: Input starting cold pressures once and apply ambient temperature changes, brake duct shifts, or both together in a single view.
- **Ambient Temperature Compensation**: Adjusts all 4 tyres by `-0.1 psi` for every `+1°C` of ambient temperature increase (and `+0.1 psi` for every `-1°C` decrease).
- **Coupled Front & Rear Brake Ducts**: Independently scale Front brake ducts (affecting Front Left/Right tyres) and Rear brake ducts (affecting Rear Left/Right tyres).
- **Advanced Brake Duct Step Math**: Applies standard step shifts (`0.2 psi / step`) with advanced transition math for the crucial step between `2` and `3` (`0.3 psi`).

## Disclaimer
Calculations are estimates based on standard physics models. Results may vary by simulator and conditions. Validate with a test stint before competitive use.
