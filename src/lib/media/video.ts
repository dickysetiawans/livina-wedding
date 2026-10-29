export function validateVideoFile(file: File) {
  if (file.type !== "video/mp4") throw new Error("videoFormat");
  if (!file.size || file.size > 20971520) throw new Error("videoLimit");
}
export function validateVideoMetadata(
  width: number,
  height: number,
  duration: number,
) {
  if (
    ![width, height, duration].every(Number.isFinite) ||
    Math.min(width, height, duration) <= 0 ||
    Math.max(width, height) > 1920 ||
    Math.min(width, height) > 1080 ||
    duration > 60
  )
    throw new Error("videoLimit");
}
// Reading a local frame produces a poster; no cloud upload or transcoding.
export function videoPoster(file: File, signal: AbortSignal): Promise<File> {
  validateVideoFile(file);
  return new Promise((resolve, reject) => {
    const video = document.createElement("video"),
      url = URL.createObjectURL(file);
    let settled = false;
    const cleanup = () => {
      clearTimeout(timer);
      signal.removeEventListener("abort", abort);
      video.onloadedmetadata = null;
      video.onseeked = null;
      video.onerror = null;
      video.removeAttribute("src");
      video.load();
      URL.revokeObjectURL(url);
    };
    const fail = (reason: string) => {
      if (!settled) {
        settled = true;
        cleanup();
        reject(new Error(reason));
      }
    };
    const abort = () => fail("videoCancelled");
    const timer = setTimeout(() => fail("videoRead"), 20000);
    signal.addEventListener("abort", abort, { once: true });
    if (signal.aborted) {
      abort();
      return;
    }
    video.preload = "auto";
    video.muted = true;
    video.playsInline = true;
    video.onerror = () => fail("videoFormat");
    video.onloadedmetadata = () => {
      try {
        validateVideoMetadata(
          video.videoWidth,
          video.videoHeight,
          video.duration,
        );
      } catch {
        fail("videoLimit");
        return;
      }
      video.currentTime = Math.min(0.1, video.duration / 2);
    };
    video.onseeked = () => {
      if (settled) return;
      const canvas = document.createElement("canvas"),
        ratio = Math.min(
          1,
          1600 / Math.max(video.videoWidth, video.videoHeight),
        );
      canvas.width = Math.max(1, Math.round(video.videoWidth * ratio));
      canvas.height = Math.max(1, Math.round(video.videoHeight * ratio));
      const context = canvas.getContext("2d");
      if (!context) {
        fail("videoRead");
        return;
      }
      try {
        context.drawImage(video, 0, 0, canvas.width, canvas.height);
        canvas.toBlob(
          (blob) => {
            if (settled) return;
            if (!blob || blob.type !== "image/webp") {
              fail("videoRead");
              return;
            }
            settled = true;
            cleanup();
            resolve(
              new File([blob], "video-poster.webp", { type: "image/webp" }),
            );
          },
          "image/webp",
          0.85,
        );
      } catch {
        fail("videoRead");
      }
    };
    video.src = url;
    video.load();
  });
}
