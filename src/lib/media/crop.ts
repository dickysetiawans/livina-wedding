export interface CropInput {
  imageWidth: number;
  imageHeight: number;
  frameWidth: number;
  frameHeight: number;
  zoom: number;
  x: number;
  y: number;
}

export function cropGeometry(input: CropInput) {
  const {
    imageWidth: iw,
    imageHeight: ih,
    frameWidth: fw,
    frameHeight: fh,
  } = input;
  if (
    ![iw, ih, fw, fh, input.zoom, input.x, input.y].every(Number.isFinite) ||
    Math.min(iw, ih, fw, fh) <= 0
  )
    throw new RangeError("INVALID_CROP");
  const scale =
    Math.max(fw / iw, fh / ih) * Math.max(1, Math.min(3, input.zoom));
  const x = Math.max(
    -(iw * scale - fw) / 2,
    Math.min((iw * scale - fw) / 2, input.x),
  );
  const y = Math.max(
    -(ih * scale - fh) / 2,
    Math.min((ih * scale - fh) / 2, input.y),
  );
  return {
    scale,
    x,
    y,
    sx: (iw - fw / scale) / 2 - x / scale,
    sy: (ih - fh / scale) / 2 - y / scale,
    sw: fw / scale,
    sh: fh / scale,
  };
}

export async function exportCrop(
  image: HTMLImageElement,
  input: CropInput,
  name: string,
): Promise<File> {
  const { sx, sy, sw, sh } = cropGeometry(input);
  const ratio = Math.min(1, 1600 / Math.max(sw, sh));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(sw * ratio));
  canvas.height = Math.max(1, Math.round(sh * ratio));
  const context = canvas.getContext("2d");
  if (!context) throw new Error("CROP_UNAVAILABLE");
  context.drawImage(image, sx, sy, sw, sh, 0, 0, canvas.width, canvas.height);
  const blob = await new Promise<Blob>((resolve, reject) =>
    canvas.toBlob(
      (result) =>
        result ? resolve(result) : reject(new Error("CROP_UNAVAILABLE")),
      "image/webp",
      0.9,
    ),
  );
  if (blob.type !== "image/webp") throw new Error("CROP_UNAVAILABLE");
  const extension = "webp";
  return new File(
    [blob],
    `${name.replace(/\.[^.]+$/, "") || "photo"}-crop.${extension}`,
    { type: blob.type },
  );
}
