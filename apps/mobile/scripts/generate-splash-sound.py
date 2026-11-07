#!/usr/bin/env python3
"""Generate a short, original water-drop and soft splash WAV for the app splash screen."""

import math
import random
import struct
import wave
from pathlib import Path

SAMPLE_RATE = 44100
DURATION = 1.15
OUTPUT = Path(__file__).resolve().parent.parent / "assets" / "water-drop-splash.wav"


def make_sample(t: float, rng: random.Random, state: dict) -> float:
    value = 0.0

    # A clear, falling droplet with a quick downward pitch glide.
    if t < 0.30:
        progress = t / 0.30
        envelope = math.exp(-t * 12.0) * (1.0 - math.exp(-t * 90.0))
        frequency = 1120.0 - 560.0 * progress
        value += math.sin(2.0 * math.pi * frequency * t) * envelope * 0.38

    # A soft splash burst, followed by a low, rounded watery resonance.
    splash_t = t - 0.27
    if 0.0 <= splash_t < 0.78:
        noise = rng.uniform(-1.0, 1.0)
        state["filtered"] = state["filtered"] * 0.78 + noise * 0.22
        burst = math.exp(-splash_t * 7.2) * min(1.0, splash_t * 55.0)
        value += state["filtered"] * burst * 0.30
        value += math.sin(2.0 * math.pi * (185.0 - 78.0 * min(1.0, splash_t / 0.78)) * splash_t) * math.exp(-splash_t * 5.0) * 0.20

    # Two very quiet ripples add a natural liquid tail.
    for start, amplitude, decay in ((0.43, 0.075, 10.0), (0.62, 0.045, 12.0)):
        ripple_t = t - start
        if ripple_t >= 0:
            value += math.sin(2.0 * math.pi * (720.0 - ripple_t * 390.0) * ripple_t) * math.exp(-ripple_t * decay) * amplitude

    return value


def main() -> None:
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    rng = random.Random(20261107)
    state = {"filtered": 0.0}
    frame_count = int(SAMPLE_RATE * DURATION)
    samples = [make_sample(i / SAMPLE_RATE, rng, state) for i in range(frame_count)]
    peak = max(max(abs(sample) for sample in samples), 1e-9)
    gain = 0.72 / peak

    with wave.open(str(OUTPUT), "wb") as wav:
        wav.setnchannels(1)
        wav.setsampwidth(2)
        wav.setframerate(SAMPLE_RATE)
        wav.writeframes(
            b"".join(
                struct.pack("<h", int(max(-1.0, min(1.0, sample * gain)) * 32767))
                for sample in samples
            )
        )

    print(f"Generated {OUTPUT} ({frame_count} samples)")


if __name__ == "__main__":
    main()
