// Files stay in memory until form submission. Successful uploads are cached so a
// failed record save can be retried without uploading the same photo again.
export class PendingPhotos {
  private files = new Map<
    string,
    { file: File; alt: string; saved?: string; poster?: string }
  >();
  stage(file: File, alt: string) {
    const id = crypto.randomUUID();
    this.files.set(id, { file, alt });
    return id;
  }
  stageVideo(file: File, poster: File, alt: string) {
    const posterId = this.stage(poster, alt);
    const id = crypto.randomUUID();
    this.files.set(id, { file, alt, poster: posterId });
    return { id, posterId };
  }
  file(id: string | null) {
    return id ? this.files.get(id)?.file : undefined;
  }
  async prepare<T extends Record<string, unknown>>(
    values: T,
    upload: (file: File, alt: string) => Promise<string>,
    uploadVideo?: (file: File, posterId: string) => Promise<string>,
  ): Promise<T> {
    const result = { ...values };
    const resolve = async (id: string): Promise<string> => {
      const entry = this.files.get(id);
      if (!entry) return id;
      if (!entry.saved) {
        if (entry.poster) {
          if (!uploadVideo) throw new Error("VIDEO_UPLOAD_UNAVAILABLE");
          entry.saved = await uploadVideo(
            entry.file,
            await resolve(entry.poster),
          );
        } else entry.saved = await upload(entry.file, entry.alt);
      }
      return entry.saved;
    };
    const walk = async (value: unknown): Promise<unknown> => {
      if (typeof value === "string" && this.files.has(value))
        return resolve(value);
      if (Array.isArray(value)) {
        const rows = [];
        for (const row of value) rows.push(await walk(row));
        return rows;
      }
      if (value && typeof value === "object") {
        const rows: Record<string, unknown> = {};
        for (const [key, item] of Object.entries(value))
          rows[key] = await walk(item);
        return rows;
      }
      return value;
    };
    return (await walk(result)) as T;
  }
}
