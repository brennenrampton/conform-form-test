import { MultiStepForm } from '@/components/MultiStepForm';
import { getLatestDraft, getSubmissionCount } from '@/lib/storage';

export default async function HomePage() {
  const [draft, submissionCount] = await Promise.all([
    getLatestDraft(),
    getSubmissionCount(),
  ]);

  return (
    <main className="page-shell">
      <MultiStepForm
        initialValues={draft?.values}
        initialSavedAt={draft?.savedAt ?? null}
        submissionCount={submissionCount}
      />
    </main>
  );
}
