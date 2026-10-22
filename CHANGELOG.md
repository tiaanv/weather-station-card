# Changelog

## 1.3.2 — 2026-10-22

- Make rainfall more natural with independently timed drops, uneven spacing, varied lengths and subtle brightness differences.
- Preserve live rain-rate visibility and reduced-motion support.

## 1.3.1 — 2026-10-22

- Fix rain animation visibility when the rain-rate sensor changes after initial load.
- Add browser regression checks for dry/wet transitions and unavailable sensor recovery.

## 1.3.0 — 2026-10-21

First public release after private dashboard testing.

- Animated weather station with side-view wind cups, rain collector and projected wind vane.
- Optional rain, wind, temperature and pressure sensors with entity-defined units.
- Optional wide history panel with a 12-hour window, time/value labels and 60-second updates.
- Responsive graph sizing that preserves the station graphic height.
- Omitted sensors hide their instruments; unavailable configured readings display a dash.
- Reading taps open Home Assistant more-info; reduced-motion preferences are respected.
- HACS custom repository installation, manual installation and example configurations.
