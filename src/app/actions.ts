'use server';

import { parseWithZod } from '@conform-to/zod/v4';

import { applicationSchema } from '@/lib/schema';
import { saveSubmission } from '@/lib/storage';

export async function submitApplicationAction(
  _prevState: unknown,
  formData: FormData,
): Promise<unknown> {
  const submission = parseWithZod(formData, {
    schema: applicationSchema,
  });

  if (submission.status !== 'success') {
    return submission.reply();
  }

  await saveSubmission(submission.value);

  return submission.reply({
    resetForm: true,
  });
}
