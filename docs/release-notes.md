## Humidity support

Add an optional humidity reading above temperature, beside the environmental sensor housing. The card keeps its existing height. Units come from the entity; tap or keyboard-activate humidity to open its Home Assistant history. Omitted humidity is hidden, and unavailable humidity shows a dash. The wide history panel remains four tiles.

```yaml
entities:
  humidity: sensor.outdoor_humidity
```

Existing configurations continue to work unchanged. The README and full/no-history examples now include humidity, with a new humidity-only example.

Download through HACS or use the attached `weather-station-card.js` for manual installation. For manual resources, update the URL to `/local/weather-station-card.js?v=1.4.0`, then refresh the dashboard.
