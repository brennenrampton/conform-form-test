'use client';

import {
  getCollectionProps,
  getFormProps,
  getInputProps,
  getSelectProps,
  getTextareaProps,
  type SubmissionResult,
  useForm,
} from '@conform-to/react';
import { parseWithZod } from '@conform-to/zod/v4';
import {
  useActionState,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
} from 'react';

import { submitApplicationAction } from '@/app/actions';
import { MaskedInput } from '@/components/MaskedInput';
import {
  applicationSchema,
  contactMethodOptions,
  dependentOptions,
  emptyApplicationValues,
  employmentStatusOptions,
  normalizeFormValues,
  programOptions,
  referralSourceOptions,
  stepOneSchema,
  stepThreeSchema,
  stepTwoSchema,
  type ApplicationFormDefaults,
} from '@/lib/schema';

type MultiStepFormProps = {
  initialValues?: Partial<Record<keyof ApplicationFormDefaults, unknown>>;
  initialSavedAt?: string | null;
  submissionCount: number;
};

type StepErrorState = Partial<Record<keyof ApplicationFormDefaults, string>>;

const steps = [
  { id: 'personal', label: 'Personal' },
  { id: 'details', label: 'Details' },
  { id: 'review', label: 'Review & Submit' },
] as const;

const contactMethodLabels: Record<(typeof contactMethodOptions)[number], string> = {
  email: 'Email',
  phone: 'Phone',
};

const programLabels: Record<(typeof programOptions)[number], string> = {
  housing: 'Housing Support',
  food: 'Food Assistance',
  medical: 'Medical Help',
  education: 'Education Benefits',
};

const dependentLabels: Record<(typeof dependentOptions)[number], string> = {
  yes: 'Yes',
  no: 'No',
};

const employmentLabels: Record<(typeof employmentStatusOptions)[number], string> = {
  employed: 'Employed',
  student: 'Student',
  unemployed: 'Unemployed',
  other: 'Other',
};

const referralLabels: Record<(typeof referralSourceOptions)[number], string> = {
  friend: 'Friend or Family',
  social: 'Social Media',
  agency: 'Partner Agency',
  other: 'Other',
};

export function MultiStepForm({
  initialValues,
  initialSavedAt,
  submissionCount,
}: MultiStepFormProps) {
  const defaultValues = useMemo(
    () => normalizeFormValues({ ...emptyApplicationValues, ...(initialValues ?? {}) }),
    [initialValues],
  );

  const [lastResult, submitAction, isSubmitting] = useActionState(
    submitApplicationAction,
    null,
  );

  const [form, fields] = useForm({
    defaultValue: defaultValues as unknown as { [key: string]: string | null | undefined },
    lastResult: (lastResult as SubmissionResult<string[]> | null) ?? undefined,
    onValidate({ formData }) {
      return parseWithZod(formData, {
        schema: applicationSchema,
      });
    },
    shouldValidate: 'onBlur',
    shouldRevalidate: 'onInput',
  });

  const [currentStep, setCurrentStep] = useState(0);
  const [contactMethod, setContactMethod] = useState(defaultValues.contactMethod);
  const [employmentStatus, setEmploymentStatus] = useState(defaultValues.employmentStatus);
  const [hasDependents, setHasDependents] = useState(defaultValues.hasDependents);
  const [stepErrors, setStepErrors] = useState<StepErrorState>({});
  const [autosaveStatus, setAutosaveStatus] = useState(() => {
    if (initialSavedAt) {
      return `Draft loaded from ${formatDateTime(initialSavedAt)}.`;
    }

    return 'Draft autosave is enabled.';
  });

  const formRef = useRef<HTMLFormElement | null>(null);
  const autosaveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const submissionStatus = (lastResult as { status?: 'success' | 'error' } | null)?.status;
  const submittedSuccessfully = submissionStatus === 'success';

  useEffect(() => {
    if (!submittedSuccessfully) {
      return;
    }

    setCurrentStep(0);
    setContactMethod('');
    setEmploymentStatus('');
    setHasDependents('');
    setStepErrors({});
    setAutosaveStatus('Application submitted. Draft cleared.');
  }, [submittedSuccessfully]);

  useEffect(() => {
    return () => {
      if (autosaveTimeoutRef.current) {
        clearTimeout(autosaveTimeoutRef.current);
      }
    };
  }, []);

  const scheduleAutosave = useCallback(() => {
    if (autosaveTimeoutRef.current) {
      clearTimeout(autosaveTimeoutRef.current);
    }

    autosaveTimeoutRef.current = setTimeout(async () => {
      if (!formRef.current) {
        return;
      }

      const payload = normalizeFormValues(
        formDataToObject(new FormData(formRef.current)) as Partial<
          Record<keyof ApplicationFormDefaults, unknown>
        >,
      );

      setAutosaveStatus('Saving draft...');

      try {
        const response = await fetch('/api/autosave', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
        });

        if (!response.ok) {
          throw new Error('Autosave request failed');
        }

        const result = (await response.json()) as { savedAt?: string };

        if (result.savedAt) {
          setAutosaveStatus(`Draft saved at ${formatDateTime(result.savedAt)}.`);
        } else {
          setAutosaveStatus('Draft saved.');
        }
      } catch {
        setAutosaveStatus('Autosave failed. Keep editing and retry later.');
      }
    }, 800);
  }, []);

  const handleFormInput = useCallback(
    (event: FormEvent<HTMLFormElement>) => {
      const target = event.target;

      if (
        !(target instanceof HTMLInputElement) &&
        !(target instanceof HTMLSelectElement) &&
        !(target instanceof HTMLTextAreaElement)
      ) {
        return;
      }

      const fieldName = target.name as keyof ApplicationFormDefaults;

      if (fieldName in stepErrors) {
        setStepErrors((current) => {
          if (!current[fieldName]) {
            return current;
          }

          const next = { ...current };
          delete next[fieldName];
          return next;
        });
      }

      if (fieldName === 'contactMethod') {
        setContactMethod(target.value);
      }

      if (fieldName === 'employmentStatus') {
        setEmploymentStatus(target.value);
      }

      if (fieldName === 'hasDependents') {
        setHasDependents(target.value);
      }

      scheduleAutosave();
    },
    [scheduleAutosave, stepErrors],
  );

  const validateStep = useCallback((stepIndex: number): boolean => {
    if (!formRef.current) {
      return true;
    }

    const values = formDataToObject(new FormData(formRef.current));

    const result =
      stepIndex === 0
        ? stepOneSchema.safeParse(values)
        : stepIndex === 1
          ? stepTwoSchema.safeParse(values)
          : stepThreeSchema.safeParse(values);

    if (result.success) {
      setStepErrors({});
      return true;
    }

    const nextErrors: StepErrorState = {};

    for (const issue of result.error.issues) {
      const key = issue.path[0];

      if (typeof key === 'string' && !nextErrors[key as keyof ApplicationFormDefaults]) {
        nextErrors[key as keyof ApplicationFormDefaults] = issue.message;
      }
    }

    setStepErrors(nextErrors);
    return false;
  }, []);

  const goToStep = useCallback(
    (nextStep: number) => {
      if (nextStep <= currentStep) {
        setCurrentStep(nextStep);
        return;
      }

      if (validateStep(currentStep)) {
        setCurrentStep(nextStep);
      }
    },
    [currentStep, validateStep],
  );

  const handleNext = useCallback(() => {
    if (validateStep(currentStep)) {
      setCurrentStep((current) => Math.min(current + 1, steps.length - 1));
    }
  }, [currentStep, validateStep]);

  const handleBack = useCallback(() => {
    setCurrentStep((current) => Math.max(current - 1, 0));
  }, []);

  const getFieldError = useCallback(
    (name: keyof ApplicationFormDefaults, conformError: string[] | undefined): string | undefined => {
      return stepErrors[name] ?? conformError?.[0];
    },
    [stepErrors],
  );

  const contactMethodProps = getCollectionProps(fields.contactMethod, {
    type: 'radio',
    options: [...contactMethodOptions],
  });

  const preferredProgramProps = getCollectionProps(fields.preferredPrograms, {
    type: 'checkbox',
    options: [...programOptions],
  });

  const dependentProps = getCollectionProps(fields.hasDependents, {
    type: 'radio',
    options: [...dependentOptions],
  });

  const firstNameError = getFieldError('firstName', fields.firstName.errors);
  const lastNameError = getFieldError('lastName', fields.lastName.errors);
  const ssnError = getFieldError('ssn', fields.ssn.errors);
  const contactMethodError = getFieldError('contactMethod', fields.contactMethod.errors);
  const emailError = getFieldError('email', fields.email.errors);
  const phoneError = getFieldError('phone', fields.phone.errors);
  const employmentStatusError = getFieldError(
    'employmentStatus',
    fields.employmentStatus.errors,
  );
  const schoolNameError = getFieldError('schoolName', fields.schoolName.errors);
  const preferredProgramsError = getFieldError(
    'preferredPrograms',
    fields.preferredPrograms.errors,
  );
  const hasDependentsError = getFieldError('hasDependents', fields.hasDependents.errors);
  const dependentCountError = getFieldError('dependentCount', fields.dependentCount.errors);
  const referralSourceError = getFieldError('referralSource', fields.referralSource.errors);
  const consentError = getFieldError('consent', fields.consent.errors);
  const additionalNotesError = getFieldError(
    'additionalNotes',
    fields.additionalNotes.errors,
  );

  return (
    <section className="form-shell">
      <header className="form-header">
        <p className="eyebrow">Conform + Zod + IMask + Next.js</p>
        <h1>Benefits Intake Form</h1>
        <p>
          This form demonstrates tabbed steps, conditional fields, conditional requirements,
          autosave, and server-action submission.
        </p>
        <p className="meta">Submitted records in backend store: {submissionCount}</p>
      </header>

      <div className="tabs" role="tablist" aria-label="Form Steps">
        {steps.map((step, index) => (
          <button
            key={step.id}
            type="button"
            role="tab"
            aria-selected={currentStep === index}
            className={currentStep === index ? 'tab active' : 'tab'}
            onClick={() => {
              goToStep(index);
            }}
          >
            <span className="tab-index">{index + 1}</span>
            <span>{step.label}</span>
          </button>
        ))}
      </div>

      <p className="status-line">{autosaveStatus}</p>

      {submittedSuccessfully ? (
        <p className="notice success">
          Submission complete. Check <code>.data/applications.json</code> for persisted records.
        </p>
      ) : null}

      <form
        {...getFormProps(form)}
        ref={formRef}
        action={submitAction}
        onInput={handleFormInput}
        className="form-grid"
      >
        <div className={currentStep === 0 ? 'step-panel active' : 'step-panel'}>
          <h2>Personal Information</h2>

          <label className="field">
            <span>First Name</span>
            <input
              {...getInputProps(fields.firstName, { type: 'text' })}
              placeholder="Jane"
              aria-invalid={firstNameError ? true : undefined}
            />
            {firstNameError ? <span className="error">{firstNameError}</span> : null}
          </label>

          <label className="field">
            <span>Last Name</span>
            <input
              {...getInputProps(fields.lastName, { type: 'text' })}
              placeholder="Doe"
              aria-invalid={lastNameError ? true : undefined}
            />
            {lastNameError ? <span className="error">{lastNameError}</span> : null}
          </label>

          <label className="field">
            <span>Social Security Number</span>
            <MaskedInput
              {...getInputProps(fields.ssn, { type: 'text' })}
              mask="000-00-0000"
              inputMode="numeric"
              placeholder="123-45-6789"
              aria-invalid={ssnError ? true : undefined}
            />
            {ssnError ? <span className="error">{ssnError}</span> : null}
          </label>

          <fieldset className="field-group">
            <legend>Preferred Contact Method</legend>
            <div className="choice-row">
              {contactMethodProps.map((input) => {
                const { key, ...inputProps } = input;
                void key;

                return (
                  <label key={input.id} className="choice">
                    <input {...inputProps} />
                    <span>{contactMethodLabels[input.value as keyof typeof contactMethodLabels]}</span>
                  </label>
                );
              })}
            </div>
            {contactMethodError ? <span className="error">{contactMethodError}</span> : null}
          </fieldset>

          {contactMethod === 'email' ? (
            <label className="field">
              <span>Email (Required when Email is selected)</span>
              <input
                {...getInputProps(fields.email, { type: 'email' })}
                required
                placeholder="jane@example.com"
                aria-invalid={emailError ? true : undefined}
              />
              {emailError ? <span className="error">{emailError}</span> : null}
            </label>
          ) : null}

          {contactMethod === 'phone' ? (
            <label className="field">
              <span>Phone (Required when Phone is selected)</span>
              <MaskedInput
                {...getInputProps(fields.phone, { type: 'tel' })}
                mask="(000) 000-0000"
                inputMode="tel"
                required
                placeholder="(555) 123-4567"
                aria-invalid={phoneError ? true : undefined}
              />
              {phoneError ? <span className="error">{phoneError}</span> : null}
            </label>
          ) : null}
        </div>

        <div className={currentStep === 1 ? 'step-panel active' : 'step-panel'}>
          <h2>Program Details</h2>

          <label className="field">
            <span>Employment Status</span>
            <select
              {...getSelectProps(fields.employmentStatus)}
              aria-invalid={employmentStatusError ? true : undefined}
            >
              <option value="">Select one</option>
              {employmentStatusOptions.map((option) => (
                <option key={option} value={option}>
                  {employmentLabels[option]}
                </option>
              ))}
            </select>
            {employmentStatusError ? <span className="error">{employmentStatusError}</span> : null}
          </label>

          {employmentStatus === 'student' ? (
            <label className="field">
              <span>School Name (Required for students)</span>
              <input
                {...getInputProps(fields.schoolName, { type: 'text' })}
                required
                placeholder="Western Community College"
                aria-invalid={schoolNameError ? true : undefined}
              />
              {schoolNameError ? <span className="error">{schoolNameError}</span> : null}
            </label>
          ) : null}

          <fieldset className="field-group">
            <legend>Select Programs (Multi-select)</legend>
            <div className="choice-grid">
              {preferredProgramProps.map((input) => {
                const { key, ...inputProps } = input;
                void key;

                return (
                  <label key={input.id} className="choice chip">
                    <input {...inputProps} />
                    <span>{programLabels[input.value as keyof typeof programLabels]}</span>
                  </label>
                );
              })}
            </div>
            {preferredProgramsError ? <span className="error">{preferredProgramsError}</span> : null}
          </fieldset>

          <fieldset className="field-group">
            <legend>Do you have dependents?</legend>
            <div className="choice-row">
              {dependentProps.map((input) => {
                const { key, ...inputProps } = input;
                void key;

                return (
                  <label key={input.id} className="choice">
                    <input {...inputProps} />
                    <span>{dependentLabels[input.value as keyof typeof dependentLabels]}</span>
                  </label>
                );
              })}
            </div>
            {hasDependentsError ? <span className="error">{hasDependentsError}</span> : null}
          </fieldset>

          {hasDependents === 'yes' ? (
            <label className="field">
              <span>Number of Dependents (Required when Yes)</span>
              <input
                {...getInputProps(fields.dependentCount, { type: 'number' })}
                required
                min={1}
                step={1}
                aria-invalid={dependentCountError ? true : undefined}
              />
              {dependentCountError ? <span className="error">{dependentCountError}</span> : null}
            </label>
          ) : null}

          <label className="field">
            <span>How did you hear about us?</span>
            <select
              {...getSelectProps(fields.referralSource)}
              aria-invalid={referralSourceError ? true : undefined}
            >
              <option value="">Select one</option>
              {referralSourceOptions.map((option) => (
                <option key={option} value={option}>
                  {referralLabels[option]}
                </option>
              ))}
            </select>
            {referralSourceError ? <span className="error">{referralSourceError}</span> : null}
          </label>
        </div>

        <div className={currentStep === 2 ? 'step-panel active' : 'step-panel'}>
          <h2>Review and Submit</h2>

          <label className="field">
            <span>Additional Notes</span>
            <textarea
              {...getTextareaProps(fields.additionalNotes)}
              rows={4}
              placeholder="Add any context that can help review your application."
              aria-invalid={additionalNotesError ? true : undefined}
            />
            {additionalNotesError ? <span className="error">{additionalNotesError}</span> : null}
          </label>

          <label className="choice consent">
            <input
              {...getInputProps(fields.consent, {
                type: 'checkbox',
                value: 'yes',
              })}
              aria-invalid={consentError ? true : undefined}
            />
            <span>I confirm this information is accurate and I want to submit.</span>
          </label>
          {consentError ? <span className="error">{consentError}</span> : null}
        </div>

        <div className="actions">
          <button type="button" onClick={handleBack} disabled={currentStep === 0}>
            Back
          </button>

          {currentStep < steps.length - 1 ? (
            <button type="button" onClick={handleNext}>
              Next
            </button>
          ) : (
            <button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Submitting...' : 'Submit Application'}
            </button>
          )}
        </div>
      </form>
    </section>
  );
}

function formDataToObject(formData: FormData): Record<string, string | string[]> {
  const next: Record<string, string | string[]> = {};

  for (const [key, value] of formData.entries()) {
    if (typeof value !== 'string') {
      continue;
    }

    const existing = next[key];

    if (existing === undefined) {
      next[key] = value;
      continue;
    }

    if (Array.isArray(existing)) {
      next[key] = [...existing, value];
      continue;
    }

    next[key] = [existing, value];
  }

  return next;
}

function formatDateTime(value: string): string {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString([], {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    month: 'short',
    day: 'numeric',
  });
}
