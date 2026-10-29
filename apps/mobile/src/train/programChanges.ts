/**
 * "The program changed" (ADR-090 Ek 1), told from the services (which see every program the server answers to a change) to the
 * screens (which read again on the saved-changes count, ProgramChanges.tsx). A module of its own: the services are built outside
 * React, the saved-changes channel lives inside it, and neither knows the other.
 */
const listeners = new Set<() => void>();

export function programChanged(): void {
  listeners.forEach((listener) => listener());
}

/** Answers the function that stops listening. */
export function onProgramChanged(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
