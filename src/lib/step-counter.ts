// Lightweight step counter using DeviceMotionEvent (mobile).
// Detects acceleration peaks above a threshold with a minimum interval.
// Falls back to "unsupported" when the API isn't available (most desktops).

export type StepCounterState = {
  steps: number;
  active: boolean;
  supported: boolean;
};

type Listener = (s: StepCounterState) => void;

const STRIDE_KM = 0.000762; // ~0.76m per step
const PEAK_THRESHOLD = 11.5; // m/s^2 (includes gravity ~9.8)
const MIN_INTERVAL_MS = 300;

class StepCounter {
  private steps = 0;
  private active = false;
  private lastPeakTs = 0;
  private listeners = new Set<Listener>();
  private handler = (e: DeviceMotionEvent) => this.onMotion(e);

  get supported(): boolean {
    return typeof window !== "undefined" && "DeviceMotionEvent" in window;
  }

  subscribe(fn: Listener) {
    this.listeners.add(fn);
    fn(this.snapshot());
    return () => this.listeners.delete(fn);
  }

  snapshot(): StepCounterState {
    return { steps: this.steps, active: this.active, supported: this.supported };
  }

  reset() {
    this.steps = 0;
    this.emit();
  }

  setSteps(n: number) {
    this.steps = Math.max(0, Math.floor(n));
    this.emit();
  }

  async start(): Promise<boolean> {
    if (!this.supported) return false;
    // iOS 13+ permission
    const anyDM = DeviceMotionEvent as unknown as { requestPermission?: () => Promise<string> };
    if (typeof anyDM.requestPermission === "function") {
      try {
        const res = await anyDM.requestPermission();
        if (res !== "granted") return false;
      } catch { return false; }
    }
    if (this.active) return true;
    window.addEventListener("devicemotion", this.handler);
    this.active = true;
    this.emit();
    return true;
  }

  stop() {
    if (!this.active) return;
    window.removeEventListener("devicemotion", this.handler);
    this.active = false;
    this.emit();
  }

  private onMotion(e: DeviceMotionEvent) {
    const a = e.accelerationIncludingGravity;
    if (!a) return;
    const mag = Math.sqrt((a.x ?? 0) ** 2 + (a.y ?? 0) ** 2 + (a.z ?? 0) ** 2);
    const now = Date.now();
    if (mag > PEAK_THRESHOLD && now - this.lastPeakTs > MIN_INTERVAL_MS) {
      this.lastPeakTs = now;
      this.steps += 1;
      this.emit();
    }
  }

  private emit() {
    const s = this.snapshot();
    this.listeners.forEach((l) => l(s));
  }
}

export const stepCounter = new StepCounter();

export function stepsToKm(steps: number) {
  return steps * STRIDE_KM;
}
