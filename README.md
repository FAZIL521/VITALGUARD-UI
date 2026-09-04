# VITALGUARD AI UI

Modern frontend dashboard for the VITALGUARD_AI backend.

## Run

Because browsers block some local file requests, run a local server:

```bash
cd VITALGUARD_UI
python -m http.server 5500
```

Open:

`http://127.0.0.1:5500`

## Backend connection

The default backend URL is:

`http://127.0.0.1:8000`

The UI tries these endpoints:

- `/api/live`
- `/live`
- `/status`
- `/api/status`

Change the API URL from the sidebar if required.

## Recommended FastAPI response

```json
{
  "available": true,
  "environment": {
    "temperature": 31.2,
    "humidity": 68.4,
    "heat_index": 36.1,
    "available": true,
    "source": "ESP32+DHT11"
  },
  "rppg": {
    "heart_rate": 82,
    "available": true,
    "quality": "good"
  },
  "hardware": {
    "esp32_connected": true,
    "rppg_connected": true,
    "fusion_available": true
  },
  "risk": {
    "score": 42,
    "level": "MODERATE",
    "confidence": 87,
    "explanation": "Risk explanation"
  },
  "forecast": {
    "summary": "Forecast text"
  },
  "recommendations": [
    "Hydrate",
    "Continue monitoring"
  ]
}
```

## Hardware display

Yes. When the ESP32/DHT hardware is connected and your backend publishes
`environment.available: true` or `hardware.esp32_connected: true`, the UI
shows the hardware as connected.

For rPPG, publish `rppg.available: true` or
`hardware.rppg_connected: true`.

The frontend refreshes live data every 5 seconds.

## What-if API

The simulation button expects:

`POST /whatif`

with:

```json
{
  "temperature": 30,
  "humidity": 60,
  "heart_rate": 75
}
```

## Important

Enable CORS in FastAPI when running the UI on a different port.
