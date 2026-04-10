'use client';

import { getFormProps, type SubmissionResult, useForm } from '@conform-to/react';
import { parseWithZod } from '@conform-to/zod/v4';
import { useActionState, useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { submitApplicationAction } from '@/app/actions';
import { MaskedInput } from '@/components/MaskedInput';
import {
  addressCountryOptions,
  apostilleCountryOptions,
  applicationSchema,
  educationOptions,
  emptyApplicationValues,
  genderOptions,
  marriageEndOptions,
  normalizeFormValues,
  raceOptions,
  separationDocumentOptions,
  spouseCountryOptions,
  type ApplicationFormDefaults,
  type SpousePrefix,
  usShippingOptions,
  usStateOptions,
} from '@/lib/schema';

type MultiStepFormProps = {
  initialValues?: Partial<Record<string, unknown>>;
  initialSavedAt?: string | null;
  submissionCount: number;
};

type StepDefinition = {
  id: string;
  label: string;
  fields: string[];
};

type SectionDefinition = {
  id: string;
  label: string;
  stepIndexes: number[];
};

type StepStatus = 'complete' | 'in-progress' | 'disabled' | 'unstarted';

type SidebarStep = StepDefinition & {
  completed: boolean;
  disabled: boolean;
  index: number;
  message?: string;
  status: StepStatus;
};

type SidebarSection = SectionDefinition & {
  completedCount: number;
  progressPercent: number;
  steps: SidebarStep[];
};

type FieldErrorMap = Record<string, string>;

const spouseStepFields = (prefix: SpousePrefix) => ({
  vital: [
    `${prefix}FirstName`,
    `${prefix}LastName`,
    `${prefix}Email`,
    `${prefix}DateOfBirth`,
    `${prefix}SurnameAtBirth`,
    `${prefix}CountryOfBirth`,
    `${prefix}StateOfBirth`,
    `${prefix}Gender`,
    `${prefix}PhoneNumber`,
    `${prefix}SocialSecurityNumber`,
    `${prefix}NoSsn`,
  ],
  address: [
    `${prefix}AddressLineOne`,
    `${prefix}AddressLineTwo`,
    `${prefix}AddressCity`,
    `${prefix}AddressStateProvince`,
    `${prefix}AddressZipPostal`,
    `${prefix}AddressCountry`,
    `${prefix}AddressCounty`,
  ],
  parent: [
    `${prefix}FatherFirstName`,
    `${prefix}FatherLastName`,
    `${prefix}FatherCountryOfBirth`,
    `${prefix}FatherStateOfBirth`,
    `${prefix}MotherFirstName`,
    `${prefix}MotherLastName`,
    `${prefix}MotherCountryOfBirth`,
    `${prefix}MotherStateOfBirth`,
  ],
  stats: [
    `${prefix}MarriedBefore`,
    `${prefix}NumberOfMarriages`,
    `${prefix}LastMarriageEndedBy`,
    `${prefix}LastMarriageEndDate`,
    `${prefix}SeparationDocumentNames`,
    `${prefix}HighestLevelOfEducation`,
    `${prefix}Race`,
  ],
  signature: [
    `${prefix}AffidavitPhotoSubmitted`,
    `${prefix}AffidavitCurrentlyMarried`,
    `${prefix}AffidavitRelatedToIntended`,
    `${prefix}AffidavitCertifyTruth`,
    `${prefix}AffidavitJurisdiction`,
    `${prefix}AffidavitDivorce`,
    `${prefix}AffidavitAccuracy`,
    `${prefix}AffidavitActingOnOwnBehalf`,
    `${prefix}Signature`,
  ],
});

const spouse1Fields = spouseStepFields('spouse1');
const spouse2Fields = spouseStepFields('spouse2');

const steps: StepDefinition[] = [
  {
    id: 'couple-names',
    label: 'Couple Names',
    fields: ['coupleEmail', 'spouse1FirstName', 'spouse1LastName', 'spouse2FirstName', 'spouse2LastName'],
  },
  { id: 'spouse1-vital', label: 'Personal Information', fields: spouse1Fields.vital },
  { id: 'spouse1-address', label: 'Address', fields: spouse1Fields.address },
  { id: 'spouse1-parent', label: 'Parent Information', fields: spouse1Fields.parent },
  { id: 'spouse1-stats', label: 'Statistical Information', fields: spouse1Fields.stats },
  { id: 'spouse1-signature', label: 'Digital Signature', fields: spouse1Fields.signature },
  { id: 'spouse2-vital', label: 'Personal Information', fields: spouse2Fields.vital },
  { id: 'spouse2-address', label: 'Address', fields: spouse2Fields.address },
  { id: 'spouse2-parent', label: 'Parent Information', fields: spouse2Fields.parent },
  { id: 'spouse2-stats', label: 'Statistical Information', fields: spouse2Fields.stats },
  { id: 'spouse2-signature', label: 'Digital Signature', fields: spouse2Fields.signature },
  {
    id: 'shipping',
    label: 'Shipping Address',
    fields: [
      'shippingShipToName',
      'shippingLineOne',
      'shippingLineTwo',
      'shippingCity',
      'shippingStateProvince',
      'shippingZipPostal',
      'shippingCountry',
    ],
  },
  {
    id: 'documents-services',
    label: 'Documents & Services',
    fields: [
      'additionalCertQuantity',
      'includeApplicationSummary',
      'apostilleCountries',
      'apostilleQuantity',
      'includeFullCopy',
      'usShippingOption',
      'specialInstructions',
    ],
  },
  {
    id: 'payment',
    label: 'Payment',
    fields: [
      'victimDonationOptIn',
      'commissionFeeWaiver',
      'courseCode',
      'nameOnCard',
      'cardNumber',
      'expirationMonth',
      'expirationYear',
      'cardZipPostalCode',
      'cvv',
    ],
  },
  {
    id: 'review-submit',
    label: 'Review & Submit',
    fields: ['finalConsent'],
  },
];

const sidebarSections: SectionDefinition[] = [
  { id: 'setup', label: 'Application Start', stepIndexes: [0] },
  { id: 'spouse1', label: 'Applicant 1', stepIndexes: [1, 2, 3, 4, 5] },
  { id: 'spouse2', label: 'Applicant 2', stepIndexes: [6, 7, 8, 9, 10] },
  { id: 'order', label: 'Order', stepIndexes: [11, 12, 13, 14] },
];

const monthOptions = [
  '01',
  '02',
  '03',
  '04',
  '05',
  '06',
  '07',
  '08',
  '09',
  '10',
  '11',
  '12',
];

const yearOptions = (() => {
  const currentYear = new Date().getFullYear() % 100;
  const options: string[] = [];

  for (let value = currentYear; value < currentYear + 20; value += 1) {
    options.push(String(value));
  }

  return options;
})();

const yesNoText = [
  { value: 'yes', label: 'Yes' },
  { value: 'no', label: 'No' },
] as const;

const statusLabels: Record<StepStatus, string> = {
  complete: 'Complete',
  'in-progress': 'In Progress',
  disabled: 'Disabled',
  unstarted: 'Unstarted',
};

function valuesMatchDefault(name: string, values: ApplicationFormDefaults): boolean {
  const currentValue = values[name];
  const defaultValue = emptyApplicationValues[name];

  if (Array.isArray(defaultValue) || Array.isArray(currentValue)) {
    if (!Array.isArray(defaultValue) || !Array.isArray(currentValue)) {
      return false;
    }

    return (
      defaultValue.length === currentValue.length &&
      defaultValue.every((value, index) => value === currentValue[index])
    );
  }

  return (currentValue ?? '') === (defaultValue ?? '');
}

function hasStepStarted(step: StepDefinition, values: ApplicationFormDefaults): boolean {
  return step.fields.some((field) => !valuesMatchDefault(field, values));
}

function getStepIssues(
  step: StepDefinition,
  parsed:
    | ReturnType<typeof applicationSchema.safeParse>
    | { success: true; data: ApplicationFormDefaults },
): FieldErrorMap {
  if (parsed.success) {
    return {};
  }

  const stepFieldSet = new Set(step.fields);
  const nextErrors: FieldErrorMap = {};

  for (const issue of parsed.error.issues) {
    const topLevel = issue.path[0];

    if (typeof topLevel !== 'string' || !stepFieldSet.has(topLevel) || nextErrors[topLevel]) {
      continue;
    }

    nextErrors[topLevel] = issue.message;
  }

  return nextErrors;
}

function formatApplicantLabel(
  firstName: ApplicationFormDefaults[string] | undefined,
  lastName: ApplicationFormDefaults[string] | undefined,
  fallback: string,
): string {
  const name = [firstName, lastName].filter((value): value is string => typeof value === 'string' && value.length > 0).join(' ');
  return name || fallback;
}

export function MultiStepForm({ initialValues, initialSavedAt, submissionCount }: MultiStepFormProps) {
  const defaultValues = useMemo(
    () => normalizeFormValues({ ...emptyApplicationValues, ...(initialValues ?? {}) }),
    [initialValues],
  );

  const [formValues, setFormValues] = useState<ApplicationFormDefaults>(defaultValues);
  const [currentStep, setCurrentStep] = useState(0);
  const [stepErrors, setStepErrors] = useState<FieldErrorMap>({});
  const [autosaveStatus, setAutosaveStatus] = useState(() => {
    if (initialSavedAt) {
      return `Draft loaded from ${formatDateTime(initialSavedAt)}.`;
    }

    return 'Draft autosave is enabled.';
  });

  const [lastResult, submitAction, isSubmitting] = useActionState<SubmissionResult<string[]> | null, FormData>(
    submitApplicationAction,
    null,
  );

  const [form] = useForm({
    lastResult: lastResult ?? undefined,
    onValidate({ formData }) {
      return parseWithZod(formData, {
        schema: applicationSchema,
      });
    },
    shouldValidate: 'onSubmit',
    shouldRevalidate: 'onInput',
  });

  const autosaveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const firstAutosavePassRef = useRef(true);

  const serverErrors = useMemo(() => {
    if (!lastResult?.error) {
      return {} as Record<string, string[] | null>;
    }

    return lastResult.error;
  }, [lastResult]);

  const submittedSuccessfully = lastResult?.status === 'success';
  const parsedApplication = useMemo(() => applicationSchema.safeParse(formValues), [formValues]);
  const stepIssueMaps = useMemo(
    () => steps.map((step) => getStepIssues(step, parsedApplication)),
    [parsedApplication],
  );
  const completedSteps = useMemo(
    () => stepIssueMaps.map((issues) => Object.keys(issues).length === 0),
    [stepIssueMaps],
  );
  const startedSteps = useMemo(
    () => steps.map((step) => hasStepStarted(step, formValues)),
    [formValues],
  );

  const namesComplete = completedSteps[0] ?? false;
  const spouse1ReadyForSignature =
    (completedSteps[1] ?? false) &&
    (completedSteps[2] ?? false) &&
    (completedSteps[3] ?? false) &&
    (completedSteps[4] ?? false);
  const spouse2ReadyForSignature =
    (completedSteps[6] ?? false) &&
    (completedSteps[7] ?? false) &&
    (completedSteps[8] ?? false) &&
    (completedSteps[9] ?? false);
  const shippingComplete = completedSteps[11] ?? false;
  const documentsComplete = completedSteps[12] ?? false;
  const paymentComplete = completedSteps[13] ?? false;
  const readyToPay =
    spouse1ReadyForSignature &&
    spouse2ReadyForSignature &&
    (completedSteps[5] ?? false) &&
    (completedSteps[10] ?? false) &&
    shippingComplete &&
    documentsComplete;
  const reviewReady = readyToPay && paymentComplete;

  const sidebarSteps = useMemo<SidebarStep[]>(() => {
    return steps.map((step, index) => {
      const completed = completedSteps[index] ?? false;
      const started = startedSteps[index] ?? false;
      let disabled = false;
      let message: string | undefined;

      if (index !== 0 && !namesComplete) {
        disabled = true;
        message = 'Enter the couple email and both applicant names first.';
      } else if (step.id === 'spouse1-signature' && !spouse1ReadyForSignature) {
        disabled = true;
        message = 'Finish Applicant 1 personal, address, parent, and statistical information first.';
      } else if (step.id === 'spouse2-signature' && !spouse2ReadyForSignature) {
        disabled = true;
        message = 'Finish Applicant 2 personal, address, parent, and statistical information first.';
      } else if (step.id === 'documents-services' && !shippingComplete) {
        disabled = true;
        message = 'Add the shipping address before documents and services.';
      } else if (step.id === 'payment' && !readyToPay) {
        disabled = true;
        message = 'Both applicants must sign and the order must be ready before payment.';
      } else if (step.id === 'review-submit' && !reviewReady) {
        disabled = true;
        message = 'Enter valid payment details before review and submission.';
      }

      if (index === currentStep) {
        disabled = false;
      }

      const status: StepStatus = completed
        ? 'complete'
        : disabled
          ? 'disabled'
          : started
            ? 'in-progress'
            : 'unstarted';

      return {
        ...step,
        completed,
        disabled,
        index,
        message,
        status,
      };
    });
  }, [
    completedSteps,
    currentStep,
    namesComplete,
    readyToPay,
    reviewReady,
    shippingComplete,
    spouse1ReadyForSignature,
    spouse2ReadyForSignature,
    startedSteps,
  ]);

  const navigationSections = useMemo<SidebarSection[]>(() => {
    return sidebarSections.map((section) => {
      const sectionSteps = section.stepIndexes.map((stepIndex) => sidebarSteps[stepIndex]);
      const completedCount = sectionSteps.filter((step) => step.completed).length;
      const label =
        section.id === 'spouse1'
          ? formatApplicantLabel(
              formValues.spouse1FirstName,
              formValues.spouse1LastName,
              section.label,
            )
          : section.id === 'spouse2'
            ? formatApplicantLabel(
                formValues.spouse2FirstName,
                formValues.spouse2LastName,
                section.label,
              )
            : section.label;

      return {
        ...section,
        completedCount,
        label,
        progressPercent:
          sectionSteps.length === 0 ? 0 : (completedCount / sectionSteps.length) * 100,
        steps: sectionSteps,
      };
    });
  }, [formValues, sidebarSteps]);

  const nextAvailableStepIndex = useMemo(
    () =>
      sidebarSteps.find((step) => step.index > currentStep && !step.disabled)?.index ?? null,
    [currentStep, sidebarSteps],
  );
  const previousAvailableStepIndex = useMemo(
    () =>
      [...sidebarSteps]
        .reverse()
        .find((step) => step.index < currentStep && !step.disabled)?.index ?? null,
    [currentStep, sidebarSteps],
  );

  useEffect(() => {
    setFormValues(defaultValues);
  }, [defaultValues]);

  useEffect(() => {
    if (!submittedSuccessfully) {
      return;
    }

    setCurrentStep(0);
    setStepErrors({});
    setFormValues(emptyApplicationValues);
    setAutosaveStatus('Application submitted. Draft cleared.');
  }, [submittedSuccessfully]);

  useEffect(() => {
    if (firstAutosavePassRef.current) {
      firstAutosavePassRef.current = false;
      return;
    }

    if (autosaveTimeoutRef.current) {
      clearTimeout(autosaveTimeoutRef.current);
    }

    autosaveTimeoutRef.current = setTimeout(async () => {
      setAutosaveStatus('Saving draft...');

      try {
        const response = await fetch('/api/autosave', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(formValues),
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
    }, 700);

    return () => {
      if (autosaveTimeoutRef.current) {
        clearTimeout(autosaveTimeoutRef.current);
      }
    };
  }, [formValues]);

  const setFieldValue = useCallback((name: string, value: string) => {
    setFormValues((current) => ({
      ...current,
      [name]: value,
    }));

    setStepErrors((currentErrors) => {
      if (!currentErrors[name]) {
        return currentErrors;
      }

      const nextErrors = { ...currentErrors };
      delete nextErrors[name];
      return nextErrors;
    });
  }, []);

  const toggleArrayField = useCallback((name: string, value: string, checked: boolean) => {
    setFormValues((current) => {
      const existingRaw = current[name];
      const existing = Array.isArray(existingRaw) ? existingRaw : [];

      const next = checked
        ? Array.from(new Set([...existing, value]))
        : existing.filter((entry) => entry !== value);

      return {
        ...current,
        [name]: next,
      };
    });

    setStepErrors((currentErrors) => {
      if (!currentErrors[name]) {
        return currentErrors;
      }

      const nextErrors = { ...currentErrors };
      delete nextErrors[name];
      return nextErrors;
    });
  }, []);

  const getFieldValue = useCallback(
    (name: string): string => {
      const value = formValues[name];
      return typeof value === 'string' ? value : '';
    },
    [formValues],
  );

  const getArrayValue = useCallback(
    (name: string): string[] => {
      const value = formValues[name];
      return Array.isArray(value) ? value : [];
    },
    [formValues],
  );

  const getFieldError = useCallback(
    (name: string): string | undefined => {
      if (stepErrors[name]) {
        return stepErrors[name];
      }

      const serverError = serverErrors[name];
      if (!serverError || serverError.length === 0) {
        return undefined;
      }

      return serverError[0] ?? undefined;
    },
    [serverErrors, stepErrors],
  );

  const validateStep = useCallback(
    (stepIndex: number): boolean => {
      const nextErrors = stepIssueMaps[stepIndex] ?? {};

      setStepErrors(nextErrors);

      return Object.keys(nextErrors).length === 0;
    },
    [stepIssueMaps],
  );

  const validateAllSteps = useCallback((): boolean => {
    for (let stepIndex = 0; stepIndex < stepIssueMaps.length; stepIndex += 1) {
      const nextErrors = stepIssueMaps[stepIndex] ?? {};

      if (Object.keys(nextErrors).length > 0) {
        setCurrentStep(stepIndex);
        setStepErrors(nextErrors);
        return false;
      }
    }

    setStepErrors({});
    return true;
  }, [stepIssueMaps]);

  const goToStep = useCallback(
    (nextStep: number) => {
      const nextTab = sidebarSteps[nextStep];

      if (!nextTab || nextTab.disabled) {
        return;
      }

      setStepErrors({});
      setCurrentStep(nextStep);
    },
    [sidebarSteps],
  );

  const handleNext = useCallback(() => {
    if (!validateStep(currentStep)) {
      return;
    }

    if (nextAvailableStepIndex !== null) {
      setStepErrors({});
      setCurrentStep(nextAvailableStepIndex);
    }
  }, [currentStep, nextAvailableStepIndex, validateStep]);

  const handleBack = useCallback(() => {
    if (previousAvailableStepIndex !== null) {
      setStepErrors({});
      setCurrentStep(previousAvailableStepIndex);
    }
  }, [previousAvailableStepIndex]);

  const isLastStep = currentStep === steps.length - 1;

  return (
    <section className="form-shell">
      <header className="form-header">
        <p className="eyebrow">Conform + Zod + IMask + Next.js</p>
        <h1>Utah Marriage License Application</h1>
        <p>
          This demo now follows the CLERK-marriage navigation model more closely: grouped side tabs,
          mostly free page ordering, and only a few locked steps where the original flow requires
          prerequisites.
        </p>
        <p className="meta">Submitted records in backend store: {submissionCount}</p>
      </header>

      <p className="status-line">{autosaveStatus}</p>

      {submittedSuccessfully ? (
        <p className="notice success">
          Submission complete. Saved to <code>.data/applications.json</code>.
        </p>
      ) : null}

      <div className="application-layout">
        <aside className="side-tabs" aria-label="Application Navigation">
          {navigationSections.map((section) => {
            const sectionActive = section.steps.some((step) => step.index === currentStep);

            return (
              <section
                key={section.id}
                className={sectionActive ? 'side-section active' : 'side-section'}
              >
                <div className="side-section-header">
                  <div>
                    <p>{section.label}</p>
                    <strong>
                      {section.completedCount}/{section.steps.length} complete
                    </strong>
                  </div>
                  <div className="side-progress" aria-hidden="true">
                    <span
                      className="side-progress-bar"
                      style={{ width: `${section.progressPercent}%` }}
                    />
                  </div>
                </div>

                <div className="side-section-steps" role="tablist" aria-label={section.label}>
                  {section.steps.map((step) => {
                    const selected = step.index === currentStep;

                    return (
                      <button
                        key={step.id}
                        type="button"
                        role="tab"
                        aria-selected={selected}
                        aria-disabled={step.disabled}
                        className={
                          selected
                            ? `side-step ${step.status} active`
                            : `side-step ${step.status}`
                        }
                        onClick={() => {
                          goToStep(step.index);
                        }}
                        title={step.message}
                      >
                        <span className="side-step-copy">
                          <span className="side-step-label">{step.label}</span>
                          {step.message ? (
                            <span className="side-step-message">{step.message}</span>
                          ) : null}
                        </span>
                        <span className={`side-step-status ${step.status}`}>
                          {statusLabels[step.status]}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </section>
            );
          })}
        </aside>

        <form
          {...getFormProps(form)}
          action={submitAction}
          className="form-grid"
          onSubmit={(event) => {
            if (!isLastStep) {
              event.preventDefault();
              return;
            }

            if (!validateAllSteps()) {
              event.preventDefault();
            }
          }}
        >
        {renderCoupleNamesStep({
          active: currentStep === 0,
          getFieldValue,
          getFieldError,
          setFieldValue,
        })}

        {renderSpouseVitalStep({
          active: currentStep === 1,
          heading: 'Spouse 1 Vital Information',
          prefix: 'spouse1',
          getFieldValue,
          getFieldError,
          setFieldValue,
        })}

        {renderSpouseAddressStep({
          active: currentStep === 2,
          heading: 'Spouse 1 Residential Address',
          prefix: 'spouse1',
          getFieldValue,
          getFieldError,
          setFieldValue,
        })}

        {renderSpouseParentStep({
          active: currentStep === 3,
          heading: 'Spouse 1 Parent Information',
          prefix: 'spouse1',
          getFieldValue,
          getFieldError,
          setFieldValue,
        })}

        {renderSpouseStatsStep({
          active: currentStep === 4,
          heading: 'Spouse 1 Statistical Information',
          prefix: 'spouse1',
          getFieldValue,
          getArrayValue,
          getFieldError,
          setFieldValue,
          toggleArrayField,
        })}

        {renderSpouseSignatureStep({
          active: currentStep === 5,
          heading: 'Spouse 1 Signature Affidavit',
          prefix: 'spouse1',
          getFieldValue,
          getFieldError,
          setFieldValue,
        })}

        {renderSpouseVitalStep({
          active: currentStep === 6,
          heading: 'Spouse 2 Vital Information',
          prefix: 'spouse2',
          getFieldValue,
          getFieldError,
          setFieldValue,
        })}

        {renderSpouseAddressStep({
          active: currentStep === 7,
          heading: 'Spouse 2 Residential Address',
          prefix: 'spouse2',
          getFieldValue,
          getFieldError,
          setFieldValue,
        })}

        {renderSpouseParentStep({
          active: currentStep === 8,
          heading: 'Spouse 2 Parent Information',
          prefix: 'spouse2',
          getFieldValue,
          getFieldError,
          setFieldValue,
        })}

        {renderSpouseStatsStep({
          active: currentStep === 9,
          heading: 'Spouse 2 Statistical Information',
          prefix: 'spouse2',
          getFieldValue,
          getArrayValue,
          getFieldError,
          setFieldValue,
          toggleArrayField,
        })}

        {renderSpouseSignatureStep({
          active: currentStep === 10,
          heading: 'Spouse 2 Signature Affidavit',
          prefix: 'spouse2',
          getFieldValue,
          getFieldError,
          setFieldValue,
        })}

        {renderShippingStep({
          active: currentStep === 11,
          getFieldValue,
          getFieldError,
          setFieldValue,
        })}

        {renderDocumentsStep({
          active: currentStep === 12,
          getFieldValue,
          getArrayValue,
          getFieldError,
          setFieldValue,
          toggleArrayField,
        })}

        {renderPaymentStep({
          active: currentStep === 13,
          getFieldValue,
          getFieldError,
          setFieldValue,
        })}

        {renderReviewStep({
          active: currentStep === 14,
          getFieldValue,
          getFieldError,
          setFieldValue,
        })}

        <div className="actions">
          <button
            type="button"
            onClick={handleBack}
            disabled={previousAvailableStepIndex === null}
          >
            Back
          </button>

          {isLastStep ? (
            <button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Submitting...' : 'Submit Application'}
            </button>
          ) : (
            <button
              type="button"
              onClick={handleNext}
              disabled={nextAvailableStepIndex === null}
            >
              Continue
            </button>
          )}
        </div>
        </form>
      </div>
    </section>
  );
}

type RenderStepProps = {
  active: boolean;
  getFieldValue: (name: string) => string;
  getFieldError: (name: string) => string | undefined;
  setFieldValue: (name: string, value: string) => void;
};

type RenderArrayStepProps = RenderStepProps & {
  getArrayValue: (name: string) => string[];
  toggleArrayField: (name: string, value: string, checked: boolean) => void;
};

type RenderSpouseStepProps = RenderStepProps & {
  heading: string;
  prefix: SpousePrefix;
};

type RenderSpouseArrayStepProps = RenderArrayStepProps & {
  heading: string;
  prefix: SpousePrefix;
};

function renderCoupleNamesStep(props: RenderStepProps): React.JSX.Element {
  const { active, getFieldValue, getFieldError, setFieldValue } = props;

  return (
    <div className={active ? 'step-panel active' : 'step-panel'}>
      <h2>Couple Names</h2>

      <FormField label="Couple Email" error={getFieldError('coupleEmail')}>
        <input
          name="coupleEmail"
          type="email"
          value={getFieldValue('coupleEmail')}
          onChange={(event) => {
            setFieldValue('coupleEmail', event.target.value);
          }}
          placeholder="couple@example.com"
        />
      </FormField>

      <h3>Applicant 1</h3>
      <div className="grid-two">
        <FormField label="First Name" error={getFieldError('spouse1FirstName')}>
          <input
            name="spouse1FirstName"
            value={getFieldValue('spouse1FirstName')}
            onChange={(event) => {
              setFieldValue('spouse1FirstName', event.target.value);
            }}
          />
        </FormField>

        <FormField label="Last Name" error={getFieldError('spouse1LastName')}>
          <input
            name="spouse1LastName"
            value={getFieldValue('spouse1LastName')}
            onChange={(event) => {
              setFieldValue('spouse1LastName', event.target.value);
            }}
          />
        </FormField>
      </div>

      <h3>Applicant 2</h3>
      <div className="grid-two">
        <FormField label="First Name" error={getFieldError('spouse2FirstName')}>
          <input
            name="spouse2FirstName"
            value={getFieldValue('spouse2FirstName')}
            onChange={(event) => {
              setFieldValue('spouse2FirstName', event.target.value);
            }}
          />
        </FormField>

        <FormField label="Last Name" error={getFieldError('spouse2LastName')}>
          <input
            name="spouse2LastName"
            value={getFieldValue('spouse2LastName')}
            onChange={(event) => {
              setFieldValue('spouse2LastName', event.target.value);
            }}
          />
        </FormField>
      </div>
    </div>
  );
}

function renderSpouseVitalStep(props: RenderSpouseStepProps): React.JSX.Element {
  const { active, heading, prefix, getFieldValue, getFieldError, setFieldValue } = props;
  const countryOfBirth = getFieldValue(`${prefix}CountryOfBirth`);
  const noSsn = getFieldValue(`${prefix}NoSsn`) === 'yes';

  return (
    <div className={active ? 'step-panel active' : 'step-panel'}>
      <h2>{heading}</h2>

      <div className="grid-two">
        <FormField label="First Name" error={getFieldError(`${prefix}FirstName`)}>
          <input
            name={`${prefix}FirstName`}
            value={getFieldValue(`${prefix}FirstName`)}
            onChange={(event) => {
              setFieldValue(`${prefix}FirstName`, event.target.value);
            }}
          />
        </FormField>

        <FormField label="Last Name" error={getFieldError(`${prefix}LastName`)}>
          <input
            name={`${prefix}LastName`}
            value={getFieldValue(`${prefix}LastName`)}
            onChange={(event) => {
              setFieldValue(`${prefix}LastName`, event.target.value);
            }}
          />
        </FormField>
      </div>

      <FormField label="Email" error={getFieldError(`${prefix}Email`)}>
        <input
          type="email"
          name={`${prefix}Email`}
          value={getFieldValue(`${prefix}Email`)}
          onChange={(event) => {
            setFieldValue(`${prefix}Email`, event.target.value);
          }}
        />
      </FormField>

      <div className="grid-two">
        <FormField label="Date of Birth" error={getFieldError(`${prefix}DateOfBirth`)}>
          <input
            type="date"
            name={`${prefix}DateOfBirth`}
            value={getFieldValue(`${prefix}DateOfBirth`)}
            onChange={(event) => {
              setFieldValue(`${prefix}DateOfBirth`, event.target.value);
            }}
          />
        </FormField>

        <FormField label="Surname at Birth" error={getFieldError(`${prefix}SurnameAtBirth`)}>
          <input
            name={`${prefix}SurnameAtBirth`}
            value={getFieldValue(`${prefix}SurnameAtBirth`)}
            onChange={(event) => {
              setFieldValue(`${prefix}SurnameAtBirth`, event.target.value);
            }}
          />
        </FormField>
      </div>

      <div className="grid-two">
        <FormField label="Country of Birth" error={getFieldError(`${prefix}CountryOfBirth`)}>
          <select
            name={`${prefix}CountryOfBirth`}
            value={countryOfBirth}
            onChange={(event) => {
              setFieldValue(`${prefix}CountryOfBirth`, event.target.value);
            }}
          >
            <option value="">Select one</option>
            {spouseCountryOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </FormField>

        {countryOfBirth === 'United States' ? (
          <FormField label="State of Birth" error={getFieldError(`${prefix}StateOfBirth`)}>
            <select
              name={`${prefix}StateOfBirth`}
              value={getFieldValue(`${prefix}StateOfBirth`)}
              onChange={(event) => {
                setFieldValue(`${prefix}StateOfBirth`, event.target.value);
              }}
            >
              <option value="">Select one</option>
              {usStateOptions.map((state) => (
                <option key={state} value={state}>
                  {state}
                </option>
              ))}
            </select>
          </FormField>
        ) : null}
      </div>

      <fieldset className="field-group">
        <legend>Gender</legend>
        <div className="choice-row">
          {genderOptions.map((option) => (
            <label key={option.value} className="choice">
              <input
                type="radio"
                name={`${prefix}Gender`}
                value={option.value}
                checked={getFieldValue(`${prefix}Gender`) === option.value}
                onChange={(event) => {
                  setFieldValue(`${prefix}Gender`, event.target.value);
                }}
              />
              <span>{option.label}</span>
            </label>
          ))}
        </div>
        {getFieldError(`${prefix}Gender`) ? <span className="error">{getFieldError(`${prefix}Gender`)}</span> : null}
      </fieldset>

      <FormField label="Phone Number" error={getFieldError(`${prefix}PhoneNumber`)}>
        <MaskedInput
          name={`${prefix}PhoneNumber`}
          mask="(000) 000-0000"
          value={getFieldValue(`${prefix}PhoneNumber`)}
          onChange={(event) => {
            setFieldValue(`${prefix}PhoneNumber`, event.target.value);
          }}
          placeholder="(801) 555-1212"
        />
      </FormField>

      <fieldset className="field-group">
        <legend>No Social Security Number?</legend>
        <div className="choice-row">
          {yesNoText.map((option) => (
            <label key={option.value} className="choice">
              <input
                type="radio"
                name={`${prefix}NoSsn`}
                value={option.value}
                checked={getFieldValue(`${prefix}NoSsn`) === option.value}
                onChange={(event) => {
                  const next = event.target.value;
                  setFieldValue(`${prefix}NoSsn`, next);
                  setFieldValue(
                    `${prefix}SocialSecurityNumber`,
                    next === 'yes' ? '000-00-0000' : '',
                  );
                }}
              />
              <span>{option.label}</span>
            </label>
          ))}
        </div>
        {getFieldError(`${prefix}NoSsn`) ? <span className="error">{getFieldError(`${prefix}NoSsn`)}</span> : null}
      </fieldset>

      <FormField
        label={noSsn ? 'Social Security Number (Auto-filled for No SSN)' : 'Social Security Number'}
        error={getFieldError(`${prefix}SocialSecurityNumber`)}
      >
        <MaskedInput
          name={`${prefix}SocialSecurityNumber`}
          mask="000-00-0000"
          value={getFieldValue(`${prefix}SocialSecurityNumber`)}
          onChange={(event) => {
            setFieldValue(`${prefix}SocialSecurityNumber`, event.target.value);
          }}
          disabled={noSsn}
          placeholder="123-45-6789"
        />
      </FormField>
    </div>
  );
}

function renderSpouseAddressStep(props: RenderSpouseStepProps): React.JSX.Element {
  const { active, heading, prefix, getFieldValue, getFieldError, setFieldValue } = props;
  const country = getFieldValue(`${prefix}AddressCountry`);
  const state = getFieldValue(`${prefix}AddressStateProvince`);

  return (
    <div className={active ? 'step-panel active' : 'step-panel'}>
      <h2>{heading}</h2>

      <FormField label="Country" error={getFieldError(`${prefix}AddressCountry`)}>
        <select
          name={`${prefix}AddressCountry`}
          value={country}
          onChange={(event) => {
            const nextCountry = event.target.value;
            setFieldValue(`${prefix}AddressCountry`, nextCountry);

            if (nextCountry !== 'US') {
              setFieldValue(`${prefix}AddressStateProvince`, '');
              setFieldValue(`${prefix}AddressCounty`, '');
            }
          }}
        >
          <option value="">Select one</option>
          {addressCountryOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </FormField>

      <FormField label="Address Line 1" error={getFieldError(`${prefix}AddressLineOne`)}>
        <input
          name={`${prefix}AddressLineOne`}
          value={getFieldValue(`${prefix}AddressLineOne`)}
          onChange={(event) => {
            setFieldValue(`${prefix}AddressLineOne`, event.target.value);
          }}
        />
      </FormField>

      <FormField label="Address Line 2" error={getFieldError(`${prefix}AddressLineTwo`)}>
        <input
          name={`${prefix}AddressLineTwo`}
          value={getFieldValue(`${prefix}AddressLineTwo`)}
          onChange={(event) => {
            setFieldValue(`${prefix}AddressLineTwo`, event.target.value);
          }}
        />
      </FormField>

      <div className="grid-two">
        <FormField label="City" error={getFieldError(`${prefix}AddressCity`)}>
          <input
            name={`${prefix}AddressCity`}
            value={getFieldValue(`${prefix}AddressCity`)}
            onChange={(event) => {
              setFieldValue(`${prefix}AddressCity`, event.target.value);
            }}
          />
        </FormField>

        <FormField label="ZIP/Postal" error={getFieldError(`${prefix}AddressZipPostal`)}>
          <input
            name={`${prefix}AddressZipPostal`}
            value={getFieldValue(`${prefix}AddressZipPostal`)}
            onChange={(event) => {
              setFieldValue(`${prefix}AddressZipPostal`, event.target.value);
            }}
          />
        </FormField>
      </div>

      {country === 'US' ? (
        <div className="grid-two">
          <FormField label="State" error={getFieldError(`${prefix}AddressStateProvince`)}>
            <select
              name={`${prefix}AddressStateProvince`}
              value={state}
              onChange={(event) => {
                const nextState = event.target.value;
                setFieldValue(`${prefix}AddressStateProvince`, nextState);

                if (nextState !== 'Utah') {
                  setFieldValue(`${prefix}AddressCounty`, '');
                }
              }}
            >
              <option value="">Select one</option>
              {usStateOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </FormField>

          {state === 'Utah' ? (
            <FormField label="County" error={getFieldError(`${prefix}AddressCounty`)}>
              <input
                name={`${prefix}AddressCounty`}
                value={getFieldValue(`${prefix}AddressCounty`)}
                onChange={(event) => {
                  setFieldValue(`${prefix}AddressCounty`, event.target.value);
                }}
              />
            </FormField>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function renderSpouseParentStep(props: RenderSpouseStepProps): React.JSX.Element {
  const { active, heading, prefix, getFieldValue, getFieldError, setFieldValue } = props;
  const fatherCountry = getFieldValue(`${prefix}FatherCountryOfBirth`);
  const motherCountry = getFieldValue(`${prefix}MotherCountryOfBirth`);

  return (
    <div className={active ? 'step-panel active' : 'step-panel'}>
      <h2>{heading}</h2>

      <h3>Father / Parent 1</h3>
      <div className="grid-two">
        <FormField label="First Name" error={getFieldError(`${prefix}FatherFirstName`)}>
          <input
            name={`${prefix}FatherFirstName`}
            value={getFieldValue(`${prefix}FatherFirstName`)}
            onChange={(event) => {
              setFieldValue(`${prefix}FatherFirstName`, event.target.value);
            }}
          />
        </FormField>

        <FormField label="Last Name" error={getFieldError(`${prefix}FatherLastName`)}>
          <input
            name={`${prefix}FatherLastName`}
            value={getFieldValue(`${prefix}FatherLastName`)}
            onChange={(event) => {
              setFieldValue(`${prefix}FatherLastName`, event.target.value);
            }}
          />
        </FormField>
      </div>

      <div className="grid-two">
        <FormField label="Country of Birth" error={getFieldError(`${prefix}FatherCountryOfBirth`)}>
          <select
            name={`${prefix}FatherCountryOfBirth`}
            value={fatherCountry}
            onChange={(event) => {
              setFieldValue(`${prefix}FatherCountryOfBirth`, event.target.value);
            }}
          >
            <option value="">Select one</option>
            {spouseCountryOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </FormField>

        {fatherCountry === 'United States' ? (
          <FormField label="State of Birth" error={getFieldError(`${prefix}FatherStateOfBirth`)}>
            <select
              name={`${prefix}FatherStateOfBirth`}
              value={getFieldValue(`${prefix}FatherStateOfBirth`)}
              onChange={(event) => {
                setFieldValue(`${prefix}FatherStateOfBirth`, event.target.value);
              }}
            >
              <option value="">Select one</option>
              {usStateOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </FormField>
        ) : null}
      </div>

      <h3>Mother / Parent 2</h3>
      <div className="grid-two">
        <FormField label="First Name" error={getFieldError(`${prefix}MotherFirstName`)}>
          <input
            name={`${prefix}MotherFirstName`}
            value={getFieldValue(`${prefix}MotherFirstName`)}
            onChange={(event) => {
              setFieldValue(`${prefix}MotherFirstName`, event.target.value);
            }}
          />
        </FormField>

        <FormField label="Last Name" error={getFieldError(`${prefix}MotherLastName`)}>
          <input
            name={`${prefix}MotherLastName`}
            value={getFieldValue(`${prefix}MotherLastName`)}
            onChange={(event) => {
              setFieldValue(`${prefix}MotherLastName`, event.target.value);
            }}
          />
        </FormField>
      </div>

      <div className="grid-two">
        <FormField label="Country of Birth" error={getFieldError(`${prefix}MotherCountryOfBirth`)}>
          <select
            name={`${prefix}MotherCountryOfBirth`}
            value={motherCountry}
            onChange={(event) => {
              setFieldValue(`${prefix}MotherCountryOfBirth`, event.target.value);
            }}
          >
            <option value="">Select one</option>
            {spouseCountryOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </FormField>

        {motherCountry === 'United States' ? (
          <FormField label="State of Birth" error={getFieldError(`${prefix}MotherStateOfBirth`)}>
            <select
              name={`${prefix}MotherStateOfBirth`}
              value={getFieldValue(`${prefix}MotherStateOfBirth`)}
              onChange={(event) => {
                setFieldValue(`${prefix}MotherStateOfBirth`, event.target.value);
              }}
            >
              <option value="">Select one</option>
              {usStateOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </FormField>
        ) : null}
      </div>
    </div>
  );
}

function renderSpouseStatsStep(props: RenderSpouseArrayStepProps): React.JSX.Element {
  const {
    active,
    heading,
    prefix,
    getFieldValue,
    getArrayValue,
    getFieldError,
    setFieldValue,
    toggleArrayField,
  } = props;

  const marriedBefore = getFieldValue(`${prefix}MarriedBefore`);
  const marriageEndedBy = getFieldValue(`${prefix}LastMarriageEndedBy`);
  const lastMarriageEndDate = getFieldValue(`${prefix}LastMarriageEndDate`);

  const needsSeparationDocuments = shouldRequireSeparationDocuments(marriageEndedBy, lastMarriageEndDate);

  return (
    <div className={active ? 'step-panel active' : 'step-panel'}>
      <h2>{heading}</h2>

      <fieldset className="field-group">
        <legend>Have you been married before?</legend>
        <div className="choice-row">
          {yesNoText.map((option) => (
            <label key={option.value} className="choice">
              <input
                type="radio"
                name={`${prefix}MarriedBefore`}
                value={option.value}
                checked={marriedBefore === option.value}
                onChange={(event) => {
                  const next = event.target.value;
                  setFieldValue(`${prefix}MarriedBefore`, next);

                  if (next === 'no') {
                    setFieldValue(`${prefix}NumberOfMarriages`, '1');
                    setFieldValue(`${prefix}LastMarriageEndedBy`, '');
                    setFieldValue(`${prefix}LastMarriageEndDate`, '');
                  }
                }}
              />
              <span>{option.label}</span>
            </label>
          ))}
        </div>
        {getFieldError(`${prefix}MarriedBefore`) ? (
          <span className="error">{getFieldError(`${prefix}MarriedBefore`)}</span>
        ) : null}
      </fieldset>

      {marriedBefore === 'yes' ? (
        <>
          <FormField label="Number of Marriages" error={getFieldError(`${prefix}NumberOfMarriages`)}>
            <select
              name={`${prefix}NumberOfMarriages`}
              value={getFieldValue(`${prefix}NumberOfMarriages`)}
              onChange={(event) => {
                setFieldValue(`${prefix}NumberOfMarriages`, event.target.value);
              }}
            >
              <option value="">Select one</option>
              {[2, 3, 4, 5, 6, 7, 8, 9].map((option) => (
                <option key={option} value={String(option)}>
                  {option}
                </option>
              ))}
            </select>
          </FormField>

          <FormField label="How did the last marriage end?" error={getFieldError(`${prefix}LastMarriageEndedBy`)}>
            <select
              name={`${prefix}LastMarriageEndedBy`}
              value={marriageEndedBy}
              onChange={(event) => {
                setFieldValue(`${prefix}LastMarriageEndedBy`, event.target.value);
              }}
            >
              <option value="">Select one</option>
              {marriageEndOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </FormField>

          <FormField label="Date Last Marriage Ended" error={getFieldError(`${prefix}LastMarriageEndDate`)}>
            <input
              type="date"
              name={`${prefix}LastMarriageEndDate`}
              value={lastMarriageEndDate}
              onChange={(event) => {
                setFieldValue(`${prefix}LastMarriageEndDate`, event.target.value);
              }}
            />
          </FormField>

          {needsSeparationDocuments ? (
            <fieldset className="field-group">
              <legend>Separation Documents (Required within 60 days)</legend>
              <div className="choice-grid">
                {separationDocumentOptions.map((option) => {
                  const fieldName = `${prefix}SeparationDocumentNames`;
                  const currentValues = getArrayValue(fieldName);
                  const checked = currentValues.includes(option.value);

                  return (
                    <label key={option.value} className="choice chip">
                      <input
                        type="checkbox"
                        name={fieldName}
                        value={option.value}
                        checked={checked}
                        onChange={(event) => {
                          toggleArrayField(fieldName, option.value, event.target.checked);
                        }}
                      />
                      <span>{option.label}</span>
                    </label>
                  );
                })}
              </div>
              {getFieldError(`${prefix}SeparationDocumentNames`) ? (
                <span className="error">{getFieldError(`${prefix}SeparationDocumentNames`)}</span>
              ) : null}
            </fieldset>
          ) : null}
        </>
      ) : null}

      <div className="grid-two">
        <FormField
          label="Highest Level of Education"
          error={getFieldError(`${prefix}HighestLevelOfEducation`)}
        >
          <select
            name={`${prefix}HighestLevelOfEducation`}
            value={getFieldValue(`${prefix}HighestLevelOfEducation`)}
            onChange={(event) => {
              setFieldValue(`${prefix}HighestLevelOfEducation`, event.target.value);
            }}
          >
            <option value="">Select one</option>
            {educationOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </FormField>

        <FormField label="Race" error={getFieldError(`${prefix}Race`)}>
          <select
            name={`${prefix}Race`}
            value={getFieldValue(`${prefix}Race`)}
            onChange={(event) => {
              setFieldValue(`${prefix}Race`, event.target.value);
            }}
          >
            <option value="">Select one</option>
            {raceOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </FormField>
      </div>
    </div>
  );
}

function renderSpouseSignatureStep(props: RenderSpouseStepProps): React.JSX.Element {
  const { active, heading, prefix, getFieldValue, getFieldError, setFieldValue } = props;

  const affidavitFields = [
    { name: `${prefix}AffidavitPhotoSubmitted`, label: 'I submitted proper photo identification.' },
    { name: `${prefix}AffidavitCurrentlyMarried`, label: 'I am not currently married to anyone else.' },
    { name: `${prefix}AffidavitRelatedToIntended`, label: 'I am not prohibited by relation to my intended spouse.' },
    { name: `${prefix}AffidavitCertifyTruth`, label: 'I certify all statements are true and complete.' },
    { name: `${prefix}AffidavitJurisdiction`, label: 'I understand Utah County has jurisdiction for this application.' },
    { name: `${prefix}AffidavitDivorce`, label: 'I understand divorce documentation requirements.' },
    { name: `${prefix}AffidavitAccuracy`, label: 'I reviewed this record for accuracy.' },
    { name: `${prefix}AffidavitActingOnOwnBehalf`, label: 'I am acting on my own behalf.' },
  ];

  return (
    <div className={active ? 'step-panel active' : 'step-panel'}>
      <h2>{heading}</h2>

      {affidavitFields.map((field) => (
        <fieldset key={field.name} className="field-group">
          <legend>{field.label}</legend>
          <div className="choice-row">
            {yesNoText.map((option) => (
              <label key={option.value} className="choice">
                <input
                  type="radio"
                  name={field.name}
                  value={option.value}
                  checked={getFieldValue(field.name) === option.value}
                  onChange={(event) => {
                    setFieldValue(field.name, event.target.value);
                  }}
                />
                <span>{option.label}</span>
              </label>
            ))}
          </div>
          {getFieldError(field.name) ? <span className="error">{getFieldError(field.name)}</span> : null}
        </fieldset>
      ))}

      <FormField label="Digital Signature (Type Full Legal Name)" error={getFieldError(`${prefix}Signature`)}>
        <input
          name={`${prefix}Signature`}
          value={getFieldValue(`${prefix}Signature`)}
          onChange={(event) => {
            setFieldValue(`${prefix}Signature`, event.target.value);
          }}
        />
      </FormField>
    </div>
  );
}

function renderShippingStep(props: RenderStepProps): React.JSX.Element {
  const { active, getFieldValue, getFieldError, setFieldValue } = props;
  const country = getFieldValue('shippingCountry');

  return (
    <div className={active ? 'step-panel active' : 'step-panel'}>
      <h2>Shipping Address</h2>

      <FormField label="Ship To Name" error={getFieldError('shippingShipToName')}>
        <input
          name="shippingShipToName"
          value={getFieldValue('shippingShipToName')}
          onChange={(event) => {
            setFieldValue('shippingShipToName', event.target.value);
          }}
        />
      </FormField>

      <FormField label="Country" error={getFieldError('shippingCountry')}>
        <select
          name="shippingCountry"
          value={country}
          onChange={(event) => {
            const nextCountry = event.target.value;
            setFieldValue('shippingCountry', nextCountry);
            if (nextCountry !== 'US') {
              setFieldValue('shippingStateProvince', '');
              setFieldValue('usShippingOption', '');
            }
          }}
        >
          <option value="">Select one</option>
          {addressCountryOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </FormField>

      <FormField label="Address Line 1" error={getFieldError('shippingLineOne')}>
        <input
          name="shippingLineOne"
          value={getFieldValue('shippingLineOne')}
          onChange={(event) => {
            setFieldValue('shippingLineOne', event.target.value);
          }}
        />
      </FormField>

      <FormField label="Address Line 2" error={getFieldError('shippingLineTwo')}>
        <input
          name="shippingLineTwo"
          value={getFieldValue('shippingLineTwo')}
          onChange={(event) => {
            setFieldValue('shippingLineTwo', event.target.value);
          }}
        />
      </FormField>

      <div className="grid-two">
        <FormField label="City" error={getFieldError('shippingCity')}>
          <input
            name="shippingCity"
            value={getFieldValue('shippingCity')}
            onChange={(event) => {
              setFieldValue('shippingCity', event.target.value);
            }}
          />
        </FormField>

        <FormField label="ZIP/Postal" error={getFieldError('shippingZipPostal')}>
          <input
            name="shippingZipPostal"
            value={getFieldValue('shippingZipPostal')}
            onChange={(event) => {
              setFieldValue('shippingZipPostal', event.target.value);
            }}
          />
        </FormField>
      </div>

      {country === 'US' ? (
        <FormField label="State" error={getFieldError('shippingStateProvince')}>
          <select
            name="shippingStateProvince"
            value={getFieldValue('shippingStateProvince')}
            onChange={(event) => {
              setFieldValue('shippingStateProvince', event.target.value);
            }}
          >
            <option value="">Select one</option>
            {usStateOptions.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </FormField>
      ) : null}
    </div>
  );
}

function renderDocumentsStep(props: RenderArrayStepProps): React.JSX.Element {
  const {
    active,
    getFieldValue,
    getArrayValue,
    getFieldError,
    setFieldValue,
    toggleArrayField,
  } = props;

  const additionalCertQuantity = Number(getFieldValue('additionalCertQuantity'));
  const apostilleCountries = getArrayValue('apostilleCountries');
  const shippingCountry = getFieldValue('shippingCountry');
  const needsUsShippingChoice = shippingCountry === 'US' && (apostilleCountries.length > 0 || additionalCertQuantity > 0);

  return (
    <div className={active ? 'step-panel active' : 'step-panel'}>
      <h2>Documents and Services</h2>

      <FormField label="Additional Certified Copies" error={getFieldError('additionalCertQuantity')}>
        <select
          name="additionalCertQuantity"
          value={getFieldValue('additionalCertQuantity')}
          onChange={(event) => {
            setFieldValue('additionalCertQuantity', event.target.value);
          }}
        >
          {Array.from({ length: 10 }, (_, index) => (
            <option key={index} value={String(index)}>
              {index}
            </option>
          ))}
        </select>
      </FormField>

      <fieldset className="field-group">
        <legend>Include Application Summary with certified copies?</legend>
        <div className="choice-row">
          {yesNoText.map((option) => (
            <label key={option.value} className="choice">
              <input
                type="radio"
                name="includeApplicationSummary"
                value={option.value}
                checked={getFieldValue('includeApplicationSummary') === option.value}
                onChange={(event) => {
                  setFieldValue('includeApplicationSummary', event.target.value);
                }}
              />
              <span>{option.label}</span>
            </label>
          ))}
        </div>
        {getFieldError('includeApplicationSummary') ? (
          <span className="error">{getFieldError('includeApplicationSummary')}</span>
        ) : null}
      </fieldset>

      <fieldset className="field-group">
        <legend>Apostille Countries (Multi-select)</legend>
        <div className="choice-grid">
          {apostilleCountryOptions.map((option) => (
            <label key={option.value} className="choice chip">
              <input
                type="checkbox"
                name="apostilleCountries"
                value={option.value}
                checked={apostilleCountries.includes(option.value)}
                onChange={(event) => {
                  toggleArrayField('apostilleCountries', option.value, event.target.checked);
                }}
              />
              <span>{option.label}</span>
            </label>
          ))}
        </div>
        {getFieldError('apostilleCountries') ? <span className="error">{getFieldError('apostilleCountries')}</span> : null}
      </fieldset>

      {apostilleCountries.length > 0 ? (
        <>
          <FormField label="Apostille Quantity" error={getFieldError('apostilleQuantity')}>
            <input
              type="number"
              min={1}
              max={99}
              name="apostilleQuantity"
              value={getFieldValue('apostilleQuantity')}
              onChange={(event) => {
                setFieldValue('apostilleQuantity', event.target.value);
              }}
            />
          </FormField>

          <fieldset className="field-group">
            <legend>Include full copy with apostille?</legend>
            <div className="choice-row">
              {yesNoText.map((option) => (
                <label key={option.value} className="choice">
                  <input
                    type="radio"
                    name="includeFullCopy"
                    value={option.value}
                    checked={getFieldValue('includeFullCopy') === option.value}
                    onChange={(event) => {
                      setFieldValue('includeFullCopy', event.target.value);
                    }}
                  />
                  <span>{option.label}</span>
                </label>
              ))}
            </div>
            {getFieldError('includeFullCopy') ? <span className="error">{getFieldError('includeFullCopy')}</span> : null}
          </fieldset>
        </>
      ) : null}

      {needsUsShippingChoice ? (
        <fieldset className="field-group">
          <legend>US Shipping Option</legend>
          <div className="choice-grid">
            {usShippingOptions.map((option) => (
              <label key={option.value} className="choice chip">
                <input
                  type="radio"
                  name="usShippingOption"
                  value={option.value}
                  checked={getFieldValue('usShippingOption') === option.value}
                  onChange={(event) => {
                    setFieldValue('usShippingOption', event.target.value);
                  }}
                />
                <span>{option.label}</span>
              </label>
            ))}
          </div>
          {getFieldError('usShippingOption') ? <span className="error">{getFieldError('usShippingOption')}</span> : null}
        </fieldset>
      ) : null}

      {apostilleCountries.length > 0 || additionalCertQuantity > 0 ? (
        <FormField label="Special Instructions" error={getFieldError('specialInstructions')}>
          <textarea
            name="specialInstructions"
            rows={4}
            value={getFieldValue('specialInstructions')}
            onChange={(event) => {
              setFieldValue('specialInstructions', event.target.value);
            }}
            placeholder="Optional instructions for processing and shipping"
          />
        </FormField>
      ) : null}
    </div>
  );
}

function renderPaymentStep(props: RenderStepProps): React.JSX.Element {
  const { active, getFieldValue, getFieldError, setFieldValue } = props;
  const commissionFeeWaiver = getFieldValue('commissionFeeWaiver') === 'yes';

  return (
    <div className={active ? 'step-panel active' : 'step-panel'}>
      <h2>Payment Details</h2>

      <fieldset className="field-group">
        <legend>Victim Donation Opt-In</legend>
        <div className="choice-row">
          {yesNoText.map((option) => (
            <label key={option.value} className="choice">
              <input
                type="radio"
                name="victimDonationOptIn"
                value={option.value}
                checked={getFieldValue('victimDonationOptIn') === option.value}
                onChange={(event) => {
                  setFieldValue('victimDonationOptIn', event.target.value);
                }}
              />
              <span>{option.label}</span>
            </label>
          ))}
        </div>
        {getFieldError('victimDonationOptIn') ? <span className="error">{getFieldError('victimDonationOptIn')}</span> : null}
      </fieldset>

      <fieldset className="field-group">
        <legend>Commission Fee Waiver</legend>
        <div className="choice-row">
          {yesNoText.map((option) => (
            <label key={option.value} className="choice">
              <input
                type="radio"
                name="commissionFeeWaiver"
                value={option.value}
                checked={getFieldValue('commissionFeeWaiver') === option.value}
                onChange={(event) => {
                  const next = event.target.value;
                  setFieldValue('commissionFeeWaiver', next);

                  if (next !== 'yes') {
                    setFieldValue('courseCode', '');
                  }
                }}
              />
              <span>{option.label}</span>
            </label>
          ))}
        </div>
        {getFieldError('commissionFeeWaiver') ? <span className="error">{getFieldError('commissionFeeWaiver')}</span> : null}
      </fieldset>

      {commissionFeeWaiver ? (
        <FormField label="Course Code" error={getFieldError('courseCode')}>
          <input
            name="courseCode"
            value={getFieldValue('courseCode')}
            onChange={(event) => {
              setFieldValue('courseCode', event.target.value);
            }}
          />
        </FormField>
      ) : null}

      <FormField label="Name on Card" error={getFieldError('nameOnCard')}>
        <input
          name="nameOnCard"
          value={getFieldValue('nameOnCard')}
          onChange={(event) => {
            setFieldValue('nameOnCard', event.target.value);
          }}
        />
      </FormField>

      <FormField label="Card Number" error={getFieldError('cardNumber')}>
        <MaskedInput
          name="cardNumber"
          mask="0000 0000 0000 0000"
          value={getFieldValue('cardNumber')}
          onChange={(event) => {
            setFieldValue('cardNumber', event.target.value);
          }}
          placeholder="4111 1111 1111 1111"
        />
      </FormField>

      <div className="grid-three">
        <FormField label="Exp. Month" error={getFieldError('expirationMonth')}>
          <select
            name="expirationMonth"
            value={getFieldValue('expirationMonth')}
            onChange={(event) => {
              setFieldValue('expirationMonth', event.target.value);
            }}
          >
            <option value="">MM</option>
            {monthOptions.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </FormField>

        <FormField label="Exp. Year" error={getFieldError('expirationYear')}>
          <select
            name="expirationYear"
            value={getFieldValue('expirationYear')}
            onChange={(event) => {
              setFieldValue('expirationYear', event.target.value);
            }}
          >
            <option value="">YY</option>
            {yearOptions.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </FormField>

        <FormField label="CVV" error={getFieldError('cvv')}>
          <input
            name="cvv"
            maxLength={4}
            value={getFieldValue('cvv')}
            onChange={(event) => {
              setFieldValue('cvv', event.target.value);
            }}
          />
        </FormField>
      </div>

      <FormField label="Billing ZIP/Postal" error={getFieldError('cardZipPostalCode')}>
        <input
          name="cardZipPostalCode"
          value={getFieldValue('cardZipPostalCode')}
          onChange={(event) => {
            setFieldValue('cardZipPostalCode', event.target.value);
          }}
        />
      </FormField>
    </div>
  );
}

function renderReviewStep(props: RenderStepProps): React.JSX.Element {
  const { active, getFieldValue, getFieldError, setFieldValue } = props;

  return (
    <div className={active ? 'step-panel active' : 'step-panel'}>
      <h2>Review and Submit</h2>

      <p>
        This submission mirrors the original CLERK flow and validates all required sections before
        final submit.
      </p>

      <ul className="summary-list">
        <li>Couple Email: {getFieldValue('coupleEmail') || '(missing)'}</li>
        <li>
          Spouse 1: {getFieldValue('spouse1FirstName')} {getFieldValue('spouse1LastName')}
        </li>
        <li>
          Spouse 2: {getFieldValue('spouse2FirstName')} {getFieldValue('spouse2LastName')}
        </li>
        <li>Shipping Country: {getFieldValue('shippingCountry') || '(missing)'}</li>
        <li>Additional Certified Copies: {getFieldValue('additionalCertQuantity') || '0'}</li>
      </ul>

      <fieldset className="field-group">
        <legend>Final Consent</legend>
        <div className="choice-row">
          {yesNoText.map((option) => (
            <label key={option.value} className="choice">
              <input
                type="radio"
                name="finalConsent"
                value={option.value}
                checked={getFieldValue('finalConsent') === option.value}
                onChange={(event) => {
                  setFieldValue('finalConsent', event.target.value);
                }}
              />
              <span>{option.label}</span>
            </label>
          ))}
        </div>
        {getFieldError('finalConsent') ? <span className="error">{getFieldError('finalConsent')}</span> : null}
      </fieldset>
    </div>
  );
}

type FormFieldProps = {
  label: string;
  error?: string;
  children: React.ReactNode;
};

function FormField({ label, error, children }: FormFieldProps): React.JSX.Element {
  return (
    <label className="field">
      <span>{label}</span>
      {children}
      {error ? <span className="error">{error}</span> : null}
    </label>
  );
}

function shouldRequireSeparationDocuments(lastMarriageEndedBy: string, lastMarriageEndDate: string): boolean {
  if (!['DIV', 'ANUL', 'DISS'].includes(lastMarriageEndedBy)) {
    return false;
  }

  const parsedDate = new Date(lastMarriageEndDate);
  if (Number.isNaN(parsedDate.getTime())) {
    return false;
  }

  const today = new Date();
  const sixtyDaysAgo = new Date(today);
  sixtyDaysAgo.setDate(today.getDate() - 60);

  return parsedDate >= sixtyDaysAgo && parsedDate <= today;
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
