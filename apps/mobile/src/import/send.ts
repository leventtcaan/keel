/**
 * Sending the built chunks (K-609, contract /v1/workout-imports): one after another, in order, each answer counted, and
 * how far it got told after each. A failure stops it and is named (V3: the name only, never what was in the file):
 * NoConnection, ConsentRequired (withdrawn meanwhile), ImportRefused. What was sent stays; trying again finds it there,
 * since a session's id comes from the file (build.ts).
 */
import type { ApiClient } from '@/api/client';
import type { components } from '@/api/schema';

type Deps = {
  api: ApiClient;
  chunks: components['schemas']['WorkoutImport'][];
  onProgress?: (done: number, of: number) => void;
};

const named = (name: 'NoConnection' | 'ConsentRequired' | 'ImportRefused', message: string) => Object.assign(new Error(message), { name });

export async function sendImport({ api, chunks, onProgress = () => {} }: Deps): Promise<{ imported: number; alreadyThere: number }> {
  let imported = 0;
  let alreadyThere = 0;
  for (const [i, body] of chunks.entries()) {
    let answer;
    try {
      answer = await api.POST('/v1/workout-imports', { body });
    } catch {
      throw named('NoConnection', 'import: no answer');
    }
    if (answer.data === undefined) {
      const code = answer.error?.code;
      throw code === 'CONSENT_REQUIRED' ? named('ConsentRequired', 'import: consent') : named('ImportRefused', `import refused: HTTP ${answer.response.status}`);
    }
    imported += answer.data.imported;
    alreadyThere += answer.data.alreadyThere;
    onProgress(i + 1, chunks.length);
  }
  return { imported, alreadyThere };
}
