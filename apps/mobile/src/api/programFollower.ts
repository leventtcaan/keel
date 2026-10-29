/**
 * Every Program the server answers, followed (ADR-090 Ek 1). Training days, the week off and the offline copy are the
 * program's, and a day can be changed by many paths (the edit, a day added from Train or the first week's call, a rebuild,
 * an undo, today's change): one place sees them all, so no path can forget the reminders, the kept copy or the screens in
 * view. The response is read from a copy; what the caller receives is untouched.
 */
import type { Middleware } from 'openapi-fetch';

import type { components } from './schema';

type Program = components['schemas']['Program'];

/** The program endpoints that answer the program (GET included: a read keeps the reminders right too) or, for an undo, it inside. */
const PROGRAM_PATHS = /^\/v1\/program(\/(generate|days|today|swap|starting-weights|cardio|review\/apply|review\/undo))?$/;

const isProgram = (value: unknown): value is Program =>
  typeof value === 'object' && value !== null && Array.isArray((value as { days?: unknown }).days) && typeof (value as { id?: unknown }).id === 'string';

/**
 * `follow(program, changed)`: `changed` is false for a plain read (GET), true for the answer to a change.
 * A failure of the follower is its own: it never reaches the request.
 */
export function programFollower(follow: (program: Program, changed: boolean, era: number) => void | Promise<void>, era: () => number): Middleware {
  // The account's era when each request began: an answer that comes once the account has left must keep nothing.
  const began = new Map<string, number>();
  return {
    onRequest({ id }) {
      began.set(id, era());
      return undefined;
    },
    onError({ id }) {
      began.delete(id);
      return undefined;
    },
    async onResponse({ request, response, id }) {
      const startedIn = began.get(id) ?? era();
      began.delete(id);
      try {
        if (!response.ok) return undefined;
        const path = new URL(request.url).pathname;
        if (!PROGRAM_PATHS.test(path)) return undefined;
        const body: unknown = await response.clone().json();
        const program = isProgram(body) ? body : isProgram((body as { program?: unknown } | null)?.program) ? (body as { program: Program }).program : null;
        if (program !== null) await follow(program, request.method !== 'GET', startedIn);
      } catch {
        // Not a program, not JSON, or the follower failed: nothing here is the request's concern.
      }
      return undefined;
    },
  };
}
