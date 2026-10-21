First public release of Weather Station Card, following private testing through V1.3.0.

### Included

- Animated rain collector, side-view cup anemometer and wind vane.
- Optional rain, wind, temperature and pressure mappings with sensor-supplied units.
- Responsive 12-hour history panel with time and value scales; updates every 60 seconds.
- Reading history taps, keyboard activation and reduced-motion support.
- HACS manifest, configuration examples, build checks and browser tests.

### Install

Add `https://github.com/tiaanv/weather-station-card` as a HACS custom repository of type **Dashboard**, then download Weather Station Card. Install **Mini Graph Card** separately for wide history graphs, or set `show_history: false`.

For manual installation, download the attached `weather-station-card.js`, place it in `<config>/www/`, and register `/local/weather-station-card.js?v=1.3.0` as a JavaScript module.

See the README for sensor mappings and examples. All entities are optional. This release is HACS custom-repository compatible; default-catalogue inclusion is a separate process.

The attached `SHA256SUMS` verifies the JavaScript asset.
