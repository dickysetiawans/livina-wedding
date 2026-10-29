// Deklarasi minimum untuk pemeriksaan TypeScript lokal memakai compiler existing.
// Pada deployment, implementasi API disediakan Deno/Supabase Edge Runtime.
declare namespace Deno {
 const env: { get(name: string): string | undefined };
 function serve(handler: (request: Request) => Response | Promise<Response>): void;
}
