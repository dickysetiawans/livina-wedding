import type { MediaFile } from "@/lib/crew/types";
export class MediaWaitError extends Error {}
function pause(ms: number, signal: AbortSignal) {
  return new Promise<void>((resolve, reject) => {
    if (signal.aborted) {
      reject(new DOMException("Aborted", "AbortError"));
      return;
    }
    const abort = () => {
      clearTimeout(timer);
      reject(new DOMException("Aborted", "AbortError"));
    };
    const timer = setTimeout(() => {
      signal.removeEventListener("abort", abort);
      resolve();
    }, ms);
    signal.addEventListener("abort", abort, { once: true });
  });
}
export async function waitForMedia(
  id: string,
  kind: MediaFile["kind"],
  read: (id: string) => Promise<MediaFile[]>,
  signal: AbortSignal,
  attempts = 60,
  interval = 2500,
) {
  for (let count = 0; count < attempts; count++) {
    signal.throwIfAborted();
    const item = (await read(id)).find((row) => row.id === id);
    signal.throwIfAborted();
    if (!item || item.kind !== kind || item.status === "failed")
      throw new MediaWaitError("processingFailed");
    if (item.status === "ready") return item;
    if (count < attempts - 1) await pause(interval, signal);
  }
  throw new MediaWaitError("processingSlow");
}
