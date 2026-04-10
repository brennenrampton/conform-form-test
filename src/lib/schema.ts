import { z } from 'zod';

export const contactMethodOptions = ['email', 'phone'] as const;
export const employmentStatusOptions = ['employed', 'student', 'unemployed', 'other'] as const;
export const programOptions = ['housing', 'food', 'medical', 'education'] as const;
export const dependentOptions = ['yes', 'no'] as const;
export const referralSourceOptions = ['friend', 'social', 'agency', 'other'] as const;

const ssnPattern = /^\d{3}-\d{2}-\d{4}$/;
const phonePattern = /^\(\d{3}\) \d{3}-\d{4}$/;
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const toStringArray = (value: unknown): string[] => {
  if (Array.isArray(value)) {
    return value.filter((item): item is string => typeof item === 'string');
  }

  if (typeof value === 'string' && value.length > 0) {
    return [value];
  }

  return [];
};

const isOneOf = (value: string, options: readonly string[]): boolean => options.includes(value);

const applicationFields = {
  firstName: z.string().trim().min(1, 'First name is required'),
  lastName: z.string().trim().min(1, 'Last name is required'),
  ssn: z
    .string()
    .trim()
    .regex(ssnPattern, 'Enter SSN as XXX-XX-XXXX'),
  contactMethod: z.string().trim().min(1, 'Choose a contact method'),
  email: z.string().trim().optional(),
  phone: z.string().trim().optional(),
  employmentStatus: z.string().trim().min(1, 'Choose an employment status'),
  schoolName: z.string().trim().optional(),
  preferredPrograms: z.preprocess(
    toStringArray,
    z.array(z.string()).min(1, 'Select at least one program'),
  ),
  hasDependents: z.string().trim().min(1, 'Choose yes or no'),
  dependentCount: z.string().trim().optional(),
  referralSource: z.string().trim().min(1, 'Choose a referral source'),
  consent: z.string().trim().min(1, 'You must agree before submitting'),
  additionalNotes: z
    .string()
    .trim()
    .max(500, 'Notes must be 500 characters or fewer')
    .optional(),
};

const addContactRules = (
  value: {
    contactMethod: string;
    email?: string;
    phone?: string;
  },
  ctx: z.RefinementCtx,
): void => {
  if (!isOneOf(value.contactMethod, contactMethodOptions)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['contactMethod'],
      message: 'Choose a valid contact method',
    });
    return;
  }

  if (value.contactMethod === 'email') {
    if (!value.email || value.email.length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['email'],
        message: 'Email is required when email is your contact method',
      });
      return;
    }

    if (!emailPattern.test(value.email)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['email'],
        message: 'Enter a valid email address',
      });
    }
  }

  if (value.contactMethod === 'phone') {
    if (!value.phone || value.phone.length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['phone'],
        message: 'Phone is required when phone is your contact method',
      });
      return;
    }

    if (!phonePattern.test(value.phone)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['phone'],
        message: 'Enter phone as (XXX) XXX-XXXX',
      });
    }
  }
};

const addDetailsRules = (
  value: {
    employmentStatus: string;
    schoolName?: string;
    preferredPrograms: string[];
    hasDependents: string;
    dependentCount?: string;
    referralSource: string;
  },
  ctx: z.RefinementCtx,
): void => {
  if (!isOneOf(value.employmentStatus, employmentStatusOptions)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['employmentStatus'],
      message: 'Choose a valid employment status',
    });
  }

  if (value.employmentStatus === 'student' && (!value.schoolName || value.schoolName.length === 0)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['schoolName'],
      message: 'School name is required for students',
    });
  }

  if (!isOneOf(value.hasDependents, dependentOptions)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['hasDependents'],
      message: 'Choose yes or no for dependents',
    });
  }

  if (value.hasDependents === 'yes') {
    if (!value.dependentCount || value.dependentCount.length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['dependentCount'],
        message: 'Dependent count is required',
      });
    } else {
      const parsed = Number(value.dependentCount);

      if (!Number.isInteger(parsed) || parsed < 1) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['dependentCount'],
          message: 'Dependent count must be a whole number of 1 or more',
        });
      }
    }
  }

  if (!isOneOf(value.referralSource, referralSourceOptions)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['referralSource'],
      message: 'Choose a valid referral source',
    });
  }

  const invalidPrograms = value.preferredPrograms.filter(
    (item) => !isOneOf(item, programOptions),
  );

  if (invalidPrograms.length > 0) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['preferredPrograms'],
      message: 'One or more selected programs are invalid',
    });
  }
};

const addReviewRules = (
  value: {
    consent: string;
  },
  ctx: z.RefinementCtx,
): void => {
  if (value.consent !== 'yes') {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['consent'],
      message: 'You must agree before submitting',
    });
  }
};

const baseApplicationSchema = z.object(applicationFields);

export const stepOneSchema = z
  .object({
    firstName: applicationFields.firstName,
    lastName: applicationFields.lastName,
    ssn: applicationFields.ssn,
    contactMethod: applicationFields.contactMethod,
    email: applicationFields.email,
    phone: applicationFields.phone,
  })
  .superRefine((value, ctx) => {
    addContactRules(value, ctx);
  });

export const stepTwoSchema = z
  .object({
    employmentStatus: applicationFields.employmentStatus,
    schoolName: applicationFields.schoolName,
    preferredPrograms: applicationFields.preferredPrograms,
    hasDependents: applicationFields.hasDependents,
    dependentCount: applicationFields.dependentCount,
    referralSource: applicationFields.referralSource,
  })
  .superRefine((value, ctx) => {
    addDetailsRules(value, ctx);
  });

export const stepThreeSchema = z
  .object({
    consent: applicationFields.consent,
    additionalNotes: applicationFields.additionalNotes,
  })
  .superRefine((value, ctx) => {
    addReviewRules(value, ctx);
  });

export const applicationSchema = baseApplicationSchema.superRefine((value, ctx) => {
  addContactRules(value, ctx);
  addDetailsRules(value, ctx);
  addReviewRules(value, ctx);
});

export const autosavePayloadSchema = z.object({
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  ssn: z.string().optional(),
  contactMethod: z.string().optional(),
  email: z.string().optional(),
  phone: z.string().optional(),
  employmentStatus: z.string().optional(),
  schoolName: z.string().optional(),
  preferredPrograms: z.array(z.string()).optional(),
  hasDependents: z.string().optional(),
  dependentCount: z.string().optional(),
  referralSource: z.string().optional(),
  consent: z.string().optional(),
  additionalNotes: z.string().optional(),
});

export type ApplicationSubmissionValues = z.infer<typeof applicationSchema>;

export type ApplicationFormDefaults = {
  firstName: string;
  lastName: string;
  ssn: string;
  contactMethod: string;
  email: string;
  phone: string;
  employmentStatus: string;
  schoolName: string;
  preferredPrograms: string[];
  hasDependents: string;
  dependentCount: string;
  referralSource: string;
  consent: string;
  additionalNotes: string;
};

export const emptyApplicationValues: ApplicationFormDefaults = {
  firstName: '',
  lastName: '',
  ssn: '',
  contactMethod: '',
  email: '',
  phone: '',
  employmentStatus: '',
  schoolName: '',
  preferredPrograms: [],
  hasDependents: '',
  dependentCount: '',
  referralSource: '',
  consent: '',
  additionalNotes: '',
};

const asString = (value: unknown): string => (typeof value === 'string' ? value : '');

const asOption = (value: unknown, options: readonly string[]): string => {
  const next = asString(value);
  return isOneOf(next, options) ? next : '';
};

export const normalizeFormValues = (
  values: Partial<Record<keyof ApplicationFormDefaults, unknown>> | undefined,
): ApplicationFormDefaults => {
  const source = values ?? {};

  const preferredPrograms = toStringArray(source.preferredPrograms).filter((item) =>
    isOneOf(item, programOptions),
  );

  return {
    firstName: asString(source.firstName),
    lastName: asString(source.lastName),
    ssn: asString(source.ssn),
    contactMethod: asOption(source.contactMethod, contactMethodOptions),
    email: asString(source.email),
    phone: asString(source.phone),
    employmentStatus: asOption(source.employmentStatus, employmentStatusOptions),
    schoolName: asString(source.schoolName),
    preferredPrograms,
    hasDependents: asOption(source.hasDependents, dependentOptions),
    dependentCount: asString(source.dependentCount),
    referralSource: asOption(source.referralSource, referralSourceOptions),
    consent: source.consent === 'yes' ? 'yes' : '',
    additionalNotes: asString(source.additionalNotes),
  };
};
