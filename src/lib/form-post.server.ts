export type FormPostResult =
  | { ok: true; form: FormData }
  | { ok: false; status: 400 | 403 | 405 };

// Validates same-origin POST form submissions and safely parses FormData so
// malformed bodies or cross-origin form posts never 500 or trigger side effects.
export async function readFormPost(request: Request): Promise<FormPostResult> {
  if (request.method !== 'POST') return { ok: false, status: 405 };
  if (request.headers.get('Origin') !== new URL(request.url).origin) return { ok: false, status: 403 };
  try {
    return { ok: true, form: await request.formData() };
  } catch {
    return { ok: false, status: 400 };
  }
}
