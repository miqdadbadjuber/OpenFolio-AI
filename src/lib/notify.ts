type Listener = (message: string) => void;
let listener: Listener | null = null;
export function setToastListener(fn: Listener) { listener = fn; }
export function showToast(message: string) { listener?.(message); }
