import { promises as fs } from 'node:fs';
import path from 'node:path';

import type { ApplicationFormDefaults, ApplicationSubmissionValues } from '@/lib/schema';

const DATA_FILE = path.join(process.cwd(), '.data', 'applications.json');

type SavedDraft = {
  savedAt: string;
  values: ApplicationFormDefaults;
};

type StoredSubmission = {
  id: string;
  submittedAt: string;
  values: ApplicationSubmissionValues;
};

type Store = {
  draft: SavedDraft | null;
  submissions: StoredSubmission[];
};

const emptyStore: Store = {
  draft: null,
  submissions: [],
};

const readStore = async (): Promise<Store> => {
  try {
    const raw = await fs.readFile(DATA_FILE, 'utf-8');
    const parsed = JSON.parse(raw) as Partial<Store>;

    return {
      draft: parsed.draft ?? null,
      submissions: Array.isArray(parsed.submissions) ? parsed.submissions : [],
    };
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return emptyStore;
    }

    throw error;
  }
};

const writeStore = async (store: Store): Promise<void> => {
  await fs.mkdir(path.dirname(DATA_FILE), { recursive: true });
  await fs.writeFile(DATA_FILE, JSON.stringify(store, null, 2));
};

export const getLatestDraft = async (): Promise<SavedDraft | null> => {
  const store = await readStore();
  return store.draft;
};

export const saveDraft = async (values: ApplicationFormDefaults): Promise<SavedDraft> => {
  const store = await readStore();

  const draft: SavedDraft = {
    values,
    savedAt: new Date().toISOString(),
  };

  const nextStore: Store = {
    ...store,
    draft,
  };

  await writeStore(nextStore);

  return draft;
};

export const saveSubmission = async (
  values: ApplicationSubmissionValues,
): Promise<StoredSubmission> => {
  const store = await readStore();

  const submission: StoredSubmission = {
    id: crypto.randomUUID(),
    submittedAt: new Date().toISOString(),
    values,
  };

  const nextStore: Store = {
    draft: null,
    submissions: [submission, ...store.submissions],
  };

  await writeStore(nextStore);

  return submission;
};

export const getSubmissionCount = async (): Promise<number> => {
  const store = await readStore();
  return store.submissions.length;
};
