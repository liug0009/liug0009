# FM Synth Lab

An interactive browser-based FM synthesis playground built with the Web Audio API.

## Features
- Play notes using your keyboard (`A W S E D F T G Y H U J K`) or click on-screen keys.
- Live FM controls for modulator ratio and modulation index.
- ADSR envelope controls for shaping each note.
- Carrier/modulator waveform selectors.
- Panic button to stop all sounding notes.

## Run locally
Because this uses ES modules and browser audio APIs, run it from a local HTTP server:

```bash
python3 -m http.server 8000
```

Then open `http://localhost:8000` in your browser.
