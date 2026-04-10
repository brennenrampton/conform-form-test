import { z } from 'zod';

export const spousePrefixes = ['spouse1', 'spouse2'] as const;
export type SpousePrefix = (typeof spousePrefixes)[number];

export const genderOptions = [
  { value: 'M', label: 'Male' },
  { value: 'F', label: 'Female' },
  { value: 'O', label: 'Other' },
] as const;

export const spouseCountryOptions = [
  { value: 'United States', label: 'United States' },
  { value: 'Canada', label: 'Canada' },
  { value: 'Mexico', label: 'Mexico' },
  { value: 'Philippines', label: 'Philippines' },
  { value: 'Other', label: 'Other' },
] as const;

export const addressCountryOptions = [
  { value: 'US', label: 'United States' },
  { value: 'CA', label: 'Canada' },
  { value: 'MX', label: 'Mexico' },
  { value: 'GB', label: 'United Kingdom' },
  { value: 'PH', label: 'Philippines' },
] as const;

export const usStateOptions = [
  'Alabama',
  'Alaska',
  'Arizona',
  'California',
  'Colorado',
  'Florida',
  'Idaho',
  'Nevada',
  'New York',
  'Texas',
  'Utah',
  'Washington',
] as const;

export const marriageEndOptions = [
  { value: 'DIV', label: 'Divorce' },
  { value: 'ANUL', label: 'Annulment' },
  { value: 'DTH', label: 'Death' },
  { value: 'DISS', label: 'Dissolution' },
  { value: 'OTH', label: 'Other' },
] as const;

export const educationOptions = [
  { value: '0', label: 'No Schooling' },
  { value: '6', label: 'Grade School' },
  { value: '8', label: 'Middle School' },
  { value: '10', label: 'Some High School' },
  { value: '12', label: 'High School Graduate' },
  { value: '13', label: 'Some College' },
  { value: '14', label: 'Associate Degree' },
  { value: '16', label: 'Bachelor Degree' },
  { value: '18', label: 'Master Degree' },
  { value: '20', label: 'Doctorate/Professional' },
] as const;

export const raceOptions = [
  { value: 'WHITE', label: 'White' },
  { value: 'BLACK OR AFRICAN AMERICAN', label: 'Black or African American' },
  { value: 'ASIAN', label: 'Asian' },
  { value: 'AMERICAN INDIAN', label: 'American Indian' },
  { value: 'ALASKA NATIVE', label: 'Alaska Native' },
  { value: 'NATIVE HAWAIIAN', label: 'Native Hawaiian' },
  { value: 'PACIFIC ISLANDER', label: 'Pacific Islander' },
  { value: 'HISPANIC OR LATINO', label: 'Hispanic or Latino' },
  { value: 'OTHER', label: 'Other' },
] as const;

export const usShippingOptions = [
  { value: '1', label: 'USPS Priority Mail' },
  { value: '2', label: '2-Day Shipping' },
  { value: '3', label: 'Overnight Shipping' },
] as const;

export const apostilleCountryOptions = [
  { value: 'MX', label: 'Mexico' },
  { value: 'PH', label: 'Philippines' },
  { value: 'BR', label: 'Brazil' },
  { value: 'JP', label: 'Japan' },
  { value: 'KR', label: 'South Korea' },
  { value: 'ES', label: 'Spain' },
] as const;

export const separationDocumentOptions = [
  { value: 'DIVORCE_DECREE', label: 'Divorce Decree' },
  { value: 'ANNULMENT_ORDER', label: 'Annulment Order' },
  { value: 'DISSOLUTION_ORDER', label: 'Dissolution Order' },
  { value: 'OTHER_COURT_RECORD', label: 'Other Court Record' },
] as const;

const yesNoOptions = ['yes', 'no'] as const;
const genderValues: string[] = genderOptions.map((option) => option.value);
const spouseCountryValues: string[] = spouseCountryOptions.map((option) => option.value);
const addressCountryValues: string[] = addressCountryOptions.map((option) => option.value);
const marriageEndValues: string[] = marriageEndOptions.map((option) => option.value);
const educationValues: string[] = educationOptions.map((option) => option.value);
const raceValues: string[] = raceOptions.map((option) => option.value);
const usShippingValues: string[] = usShippingOptions.map((option) => option.value);
const apostilleCountryValues: string[] = apostilleCountryOptions.map((option) => option.value);

const ssnPattern = /^\d{3}-\d{2}-\d{4}$/;
const phonePattern = /^\(\d{3}\) \d{3}-\d{4}$/;
const alphaPattern = /^[a-zA-ZÀ-ž' -]+$/;
const alphaNumericPattern = /^[a-zA-ZÀ-ž0-9' .,#/-]*$/;
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const toStringArray = (value: unknown): string[] => {
  if (Array.isArray(value)) {
    return value.filter((item): item is string => typeof item === 'string' && item.length > 0);
  }

  if (typeof value === 'string' && value.length > 0) {
    return [value];
  }

  return [];
};

const stringField = z.string().trim().max(255);

const spouseShape = (prefix: SpousePrefix) => ({
  [`${prefix}FirstName`]: stringField.min(1, 'First name is required').max(60),
  [`${prefix}LastName`]: stringField.min(1, 'Last name is required').max(60),
  [`${prefix}Email`]: stringField.max(60).optional(),
  [`${prefix}DateOfBirth`]: z.string().trim().min(1, 'Date of birth is required'),
  [`${prefix}SurnameAtBirth`]: stringField.min(1, 'Surname at birth is required').max(40),
  [`${prefix}CountryOfBirth`]: stringField.min(1, 'Country of birth is required'),
  [`${prefix}StateOfBirth`]: stringField.optional(),
  [`${prefix}Gender`]: stringField.min(1, 'Gender is required'),
  [`${prefix}PhoneNumber`]: stringField.min(1, 'Phone number is required').max(17),
  [`${prefix}SocialSecurityNumber`]: stringField.min(1, 'Social security number is required').max(11),
  [`${prefix}NoSsn`]: stringField.min(1, 'Select yes or no'),

  [`${prefix}AddressLineOne`]: stringField.min(1, 'Address line one is required').max(100),
  [`${prefix}AddressLineTwo`]: stringField.optional(),
  [`${prefix}AddressCity`]: stringField.min(1, 'City is required').max(100),
  [`${prefix}AddressStateProvince`]: stringField.optional(),
  [`${prefix}AddressZipPostal`]: stringField.min(1, 'ZIP/Postal code is required').max(30),
  [`${prefix}AddressCountry`]: stringField.min(1, 'Country is required'),
  [`${prefix}AddressCounty`]: stringField.optional(),

  [`${prefix}FatherFirstName`]: stringField.min(1, 'Father first name is required').max(60),
  [`${prefix}FatherLastName`]: stringField.min(1, 'Father last name is required').max(60),
  [`${prefix}FatherCountryOfBirth`]: stringField.min(1, 'Father country of birth is required').max(60),
  [`${prefix}FatherStateOfBirth`]: stringField.optional(),
  [`${prefix}MotherFirstName`]: stringField.min(1, 'Mother first name is required').max(60),
  [`${prefix}MotherLastName`]: stringField.min(1, 'Mother last name is required').max(60),
  [`${prefix}MotherCountryOfBirth`]: stringField.min(1, 'Mother country of birth is required').max(60),
  [`${prefix}MotherStateOfBirth`]: stringField.optional(),

  [`${prefix}MarriedBefore`]: stringField.min(1, 'Select yes or no'),
  [`${prefix}NumberOfMarriages`]: stringField.optional(),
  [`${prefix}LastMarriageEndedBy`]: stringField.optional(),
  [`${prefix}LastMarriageEndDate`]: stringField.optional(),
  [`${prefix}SeparationDocumentNames`]: z.preprocess(toStringArray, z.array(z.string())),
  [`${prefix}HighestLevelOfEducation`]: stringField.min(1, 'Highest education is required'),
  [`${prefix}Race`]: stringField.min(1, 'Race is required'),

  [`${prefix}AffidavitPhotoSubmitted`]: stringField.min(1, 'Select yes or no'),
  [`${prefix}AffidavitCurrentlyMarried`]: stringField.min(1, 'Select yes or no'),
  [`${prefix}AffidavitRelatedToIntended`]: stringField.min(1, 'Select yes or no'),
  [`${prefix}AffidavitCertifyTruth`]: stringField.min(1, 'Select yes or no'),
  [`${prefix}AffidavitJurisdiction`]: stringField.min(1, 'Select yes or no'),
  [`${prefix}AffidavitDivorce`]: stringField.min(1, 'Select yes or no'),
  [`${prefix}AffidavitAccuracy`]: stringField.min(1, 'Select yes or no'),
  [`${prefix}AffidavitActingOnOwnBehalf`]: stringField.min(1, 'Select yes or no'),
  [`${prefix}Signature`]: stringField.min(1, 'Signature is required').max(60),
});

const baseApplicationSchema = z.object({
  coupleEmail: stringField.min(1, 'Couple email is required').max(60),

  ...spouseShape('spouse1'),
  ...spouseShape('spouse2'),

  shippingShipToName: stringField.min(1, 'Ship to name is required').max(100),
  shippingLineOne: stringField.min(1, 'Address line one is required').max(100),
  shippingLineTwo: stringField.optional(),
  shippingCity: stringField.min(1, 'City is required').max(100),
  shippingStateProvince: stringField.optional(),
  shippingZipPostal: stringField.min(1, 'ZIP/Postal code is required').max(30),
  shippingCountry: stringField.min(1, 'Shipping country is required'),

  additionalCertQuantity: stringField.min(1, 'Additional certified copies are required'),
  includeApplicationSummary: stringField.min(1, 'Select yes or no'),
  apostilleCountries: z.preprocess(toStringArray, z.array(z.string())),
  apostilleQuantity: stringField.optional(),
  includeFullCopy: stringField.min(1, 'Select yes or no'),
  usShippingOption: stringField.optional(),
  specialInstructions: z.string().trim().max(2000, 'Special instructions must be 2000 characters or fewer').optional(),

  victimDonationOptIn: stringField.min(1, 'Select yes or no'),
  commissionFeeWaiver: stringField.min(1, 'Select yes or no'),
  courseCode: stringField.optional(),
  nameOnCard: stringField.min(1, 'Name on card is required').max(60),
  cardNumber: stringField.min(1, 'Card number is required').max(25),
  expirationMonth: stringField.min(1, 'Expiration month is required'),
  expirationYear: stringField.min(1, 'Expiration year is required'),
  cardZipPostalCode: stringField.min(1, 'Billing ZIP/Postal code is required').max(20),
  cvv: stringField.min(1, 'CVV is required').max(4),

  finalConsent: stringField.min(1, 'You must agree before submitting'),
});

const isInLast60Days = (isoDate: string): boolean => {
  const date = new Date(isoDate);

  if (Number.isNaN(date.getTime())) {
    return false;
  }

  const today = new Date();
  const sixtyDaysAgo = new Date(today);
  sixtyDaysAgo.setDate(today.getDate() - 60);

  return date >= sixtyDaysAgo && date <= today;
};

const isValidDateWithinRange = (isoDate: string): boolean => {
  const date = new Date(isoDate);

  if (Number.isNaN(date.getTime())) {
    return false;
  }

  const today = new Date();
  const oldestAllowed = new Date(today);
  oldestAllowed.setFullYear(today.getFullYear() - 140);

  return date <= today && date >= oldestAllowed;
};

const getString = (payload: Record<string, unknown>, key: string): string => {
  const value = payload[key];
  return typeof value === 'string' ? value.trim() : '';
};

const getStringArray = (payload: Record<string, unknown>, key: string): string[] => {
  return toStringArray(payload[key]);
};

const addSpouseRefinements = (
  payload: Record<string, unknown>,
  prefix: SpousePrefix,
  ctx: z.RefinementCtx,
): void => {
  const firstName = getString(payload, `${prefix}FirstName`);
  const lastName = getString(payload, `${prefix}LastName`);
  const email = getString(payload, `${prefix}Email`);
  const dateOfBirth = getString(payload, `${prefix}DateOfBirth`);
  const surnameAtBirth = getString(payload, `${prefix}SurnameAtBirth`);
  const countryOfBirth = getString(payload, `${prefix}CountryOfBirth`);
  const stateOfBirth = getString(payload, `${prefix}StateOfBirth`);
  const gender = getString(payload, `${prefix}Gender`);
  const phoneNumber = getString(payload, `${prefix}PhoneNumber`);
  const socialSecurityNumber = getString(payload, `${prefix}SocialSecurityNumber`);
  const noSsn = getString(payload, `${prefix}NoSsn`);

  const addressCountry = getString(payload, `${prefix}AddressCountry`);
  const addressStateProvince = getString(payload, `${prefix}AddressStateProvince`);
  const addressCounty = getString(payload, `${prefix}AddressCounty`);

  const fatherFirstName = getString(payload, `${prefix}FatherFirstName`);
  const fatherLastName = getString(payload, `${prefix}FatherLastName`);
  const fatherCountryOfBirth = getString(payload, `${prefix}FatherCountryOfBirth`);
  const fatherStateOfBirth = getString(payload, `${prefix}FatherStateOfBirth`);
  const motherFirstName = getString(payload, `${prefix}MotherFirstName`);
  const motherLastName = getString(payload, `${prefix}MotherLastName`);
  const motherCountryOfBirth = getString(payload, `${prefix}MotherCountryOfBirth`);
  const motherStateOfBirth = getString(payload, `${prefix}MotherStateOfBirth`);

  const marriedBefore = getString(payload, `${prefix}MarriedBefore`);
  const numberOfMarriages = getString(payload, `${prefix}NumberOfMarriages`);
  const lastMarriageEndedBy = getString(payload, `${prefix}LastMarriageEndedBy`);
  const lastMarriageEndDate = getString(payload, `${prefix}LastMarriageEndDate`);
  const separationDocumentNames = getStringArray(payload, `${prefix}SeparationDocumentNames`);
  const highestLevelOfEducation = getString(payload, `${prefix}HighestLevelOfEducation`);
  const race = getString(payload, `${prefix}Race`);

  const signature = getString(payload, `${prefix}Signature`);

  const affidavitFieldNames = [
    `${prefix}AffidavitPhotoSubmitted`,
    `${prefix}AffidavitCurrentlyMarried`,
    `${prefix}AffidavitRelatedToIntended`,
    `${prefix}AffidavitCertifyTruth`,
    `${prefix}AffidavitJurisdiction`,
    `${prefix}AffidavitDivorce`,
    `${prefix}AffidavitAccuracy`,
    `${prefix}AffidavitActingOnOwnBehalf`,
  ];

  if (!alphaPattern.test(firstName)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: [`${prefix}FirstName`],
      message: 'First name can only contain letters, spaces, apostrophes, or hyphens',
    });
  }

  if (!alphaPattern.test(lastName)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: [`${prefix}LastName`],
      message: 'Last name can only contain letters, spaces, apostrophes, or hyphens',
    });
  }

  if (email.length > 0 && !emailPattern.test(email)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: [`${prefix}Email`],
      message: 'Enter a valid email address',
    });
  }

  if (!isValidDateWithinRange(dateOfBirth)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: [`${prefix}DateOfBirth`],
      message: 'Date of birth must be valid and within the last 140 years',
    });
  }

  if (!alphaPattern.test(surnameAtBirth)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: [`${prefix}SurnameAtBirth`],
      message: 'Surname at birth can only contain letters, spaces, apostrophes, or hyphens',
    });
  }

  if (!spouseCountryValues.includes(countryOfBirth)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: [`${prefix}CountryOfBirth`],
      message: 'Select a valid country of birth',
    });
  }

  if (countryOfBirth === 'United States' && stateOfBirth.length === 0) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: [`${prefix}StateOfBirth`],
      message: 'State of birth is required for United States',
    });
  }

  if (!genderValues.includes(gender)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: [`${prefix}Gender`],
      message: 'Select a valid gender option',
    });
  }

  if (!phonePattern.test(phoneNumber)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: [`${prefix}PhoneNumber`],
      message: 'Phone number must match (XXX) XXX-XXXX',
    });
  }

  if (!yesNoOptions.includes(noSsn as 'yes' | 'no')) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: [`${prefix}NoSsn`],
      message: 'Choose yes or no',
    });
  }

  if (noSsn === 'yes') {
    if (socialSecurityNumber !== '000-00-0000') {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: [`${prefix}SocialSecurityNumber`],
        message: 'No SSN selection requires value 000-00-0000',
      });
    }
  } else if (!ssnPattern.test(socialSecurityNumber)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: [`${prefix}SocialSecurityNumber`],
      message: 'Social security number must match XXX-XX-XXXX',
    });
  }

  if (!addressCountryValues.includes(addressCountry)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: [`${prefix}AddressCountry`],
      message: 'Select a valid address country',
    });
  }

  if (addressCountry === 'US' && addressStateProvince.length === 0) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: [`${prefix}AddressStateProvince`],
      message: 'State is required for United States addresses',
    });
  }

  if (addressCountry === 'US' && addressStateProvince === 'Utah' && addressCounty.length === 0) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: [`${prefix}AddressCounty`],
      message: 'County is required for Utah addresses',
    });
  }

  if (!alphaPattern.test(fatherFirstName)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: [`${prefix}FatherFirstName`],
      message: 'Father first name must be alphabetical',
    });
  }

  if (!alphaPattern.test(fatherLastName)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: [`${prefix}FatherLastName`],
      message: 'Father last name must be alphabetical',
    });
  }

  if (fatherCountryOfBirth === 'United States' && fatherStateOfBirth.length === 0) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: [`${prefix}FatherStateOfBirth`],
      message: 'Father state of birth is required for United States',
    });
  }

  if (!alphaPattern.test(motherFirstName)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: [`${prefix}MotherFirstName`],
      message: 'Mother first name must be alphabetical',
    });
  }

  if (!alphaPattern.test(motherLastName)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: [`${prefix}MotherLastName`],
      message: 'Mother last name must be alphabetical',
    });
  }

  if (motherCountryOfBirth === 'United States' && motherStateOfBirth.length === 0) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: [`${prefix}MotherStateOfBirth`],
      message: 'Mother state of birth is required for United States',
    });
  }

  if (!yesNoOptions.includes(marriedBefore as 'yes' | 'no')) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: [`${prefix}MarriedBefore`],
      message: 'Choose yes or no',
    });
  }

  if (marriedBefore === 'yes') {
    const parsedNumber = Number(numberOfMarriages);

    if (!Number.isInteger(parsedNumber) || parsedNumber < 2 || parsedNumber > 9) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: [`${prefix}NumberOfMarriages`],
        message: 'Number of marriages must be an integer between 2 and 9',
      });
    }

    if (!marriageEndValues.includes(lastMarriageEndedBy)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: [`${prefix}LastMarriageEndedBy`],
        message: 'Select how the last marriage ended',
      });
    }

    if (!isValidDateWithinRange(lastMarriageEndDate)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: [`${prefix}LastMarriageEndDate`],
        message: 'Last marriage end date must be valid and within the last 140 years',
      });
    }

    const needsSeparationDocs =
      isInLast60Days(lastMarriageEndDate) && ['DIV', 'ANUL', 'DISS'].includes(lastMarriageEndedBy);

    if (needsSeparationDocs && separationDocumentNames.length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: [`${prefix}SeparationDocumentNames`],
        message: 'Separation documents are required for recent divorce/annulment/dissolution',
      });
    }
  }

  if (!educationValues.includes(highestLevelOfEducation)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: [`${prefix}HighestLevelOfEducation`],
      message: 'Select a valid education option',
    });
  }

  if (!raceValues.includes(race)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: [`${prefix}Race`],
      message: 'Select a valid race option',
    });
  }

  for (const affidavitFieldName of affidavitFieldNames) {
    if (getString(payload, affidavitFieldName) !== 'yes') {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: [affidavitFieldName],
        message: 'You must agree to this affidavit statement',
      });
    }
  }

  if (!alphaPattern.test(signature)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: [`${prefix}Signature`],
      message: 'Signature can only contain letters, spaces, apostrophes, or hyphens',
    });
  }
};

export const applicationSchema = baseApplicationSchema.superRefine((values, ctx) => {
  const payload = values as Record<string, unknown>;

  const coupleEmail = getString(payload, 'coupleEmail');
  if (!emailPattern.test(coupleEmail)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['coupleEmail'],
      message: 'Enter a valid couple email address',
    });
  }

  addSpouseRefinements(payload, 'spouse1', ctx);
  addSpouseRefinements(payload, 'spouse2', ctx);

  const spouse1FirstName = getString(payload, 'spouse1FirstName').toLowerCase();
  const spouse1LastName = getString(payload, 'spouse1LastName').toLowerCase();
  const spouse2FirstName = getString(payload, 'spouse2FirstName').toLowerCase();
  const spouse2LastName = getString(payload, 'spouse2LastName').toLowerCase();

  if (
    spouse1FirstName.length > 0 &&
    spouse1LastName.length > 0 &&
    spouse1FirstName === spouse2FirstName &&
    spouse1LastName === spouse2LastName
  ) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['spouse2FirstName'],
      message: 'Spouses cannot have identical first and last names',
    });
  }

  const shippingCountry = getString(payload, 'shippingCountry');
  const shippingStateProvince = getString(payload, 'shippingStateProvince');
  const additionalCertQuantity = getString(payload, 'additionalCertQuantity');
  const includeApplicationSummary = getString(payload, 'includeApplicationSummary');
  const apostilleCountries = getStringArray(payload, 'apostilleCountries');
  const apostilleQuantity = getString(payload, 'apostilleQuantity');
  const includeFullCopy = getString(payload, 'includeFullCopy');
  const usShippingOption = getString(payload, 'usShippingOption');

  if (!addressCountryValues.includes(shippingCountry)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['shippingCountry'],
      message: 'Select a valid shipping country',
    });
  }

  if (shippingCountry === 'US' && shippingStateProvince.length === 0) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['shippingStateProvince'],
      message: 'Shipping state is required for United States addresses',
    });
  }

  const parsedAdditionalCertQuantity = Number(additionalCertQuantity);
  if (
    !Number.isInteger(parsedAdditionalCertQuantity) ||
    parsedAdditionalCertQuantity < 0 ||
    parsedAdditionalCertQuantity > 9
  ) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['additionalCertQuantity'],
      message: 'Additional certified copies must be an integer from 0 to 9',
    });
  }

  if (!yesNoOptions.includes(includeApplicationSummary as 'yes' | 'no')) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['includeApplicationSummary'],
      message: 'Select yes or no for application summary inclusion',
    });
  }

  if (!yesNoOptions.includes(includeFullCopy as 'yes' | 'no')) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['includeFullCopy'],
      message: 'Select yes or no for full copy inclusion',
    });
  }

  const invalidApostilleCountry = apostilleCountries.some(
    (countryCode) => !apostilleCountryValues.includes(countryCode),
  );

  if (invalidApostilleCountry) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['apostilleCountries'],
      message: 'One or more apostille countries are invalid',
    });
  }

  const containsApostilles = apostilleCountries.length > 0;
  if (containsApostilles) {
    const parsedApostilleQuantity = Number(apostilleQuantity);

    if (!Number.isInteger(parsedApostilleQuantity) || parsedApostilleQuantity < 1 || parsedApostilleQuantity > 99) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['apostilleQuantity'],
        message: 'Apostille quantity must be an integer from 1 to 99',
      });
    }
  }

  const needsUsShippingChoice =
    shippingCountry === 'US' && (containsApostilles || parsedAdditionalCertQuantity > 0);

  if (needsUsShippingChoice && !usShippingValues.includes(usShippingOption)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['usShippingOption'],
      message: 'Select a US shipping option',
    });
  }

  const victimDonationOptIn = getString(payload, 'victimDonationOptIn');
  const commissionFeeWaiver = getString(payload, 'commissionFeeWaiver');
  const courseCode = getString(payload, 'courseCode');
  const nameOnCard = getString(payload, 'nameOnCard');
  const cardNumber = getString(payload, 'cardNumber').replace(/\s+/g, '');
  const expirationMonth = getString(payload, 'expirationMonth');
  const expirationYear = getString(payload, 'expirationYear');
  const cvv = getString(payload, 'cvv');
  const finalConsent = getString(payload, 'finalConsent');

  if (!yesNoOptions.includes(victimDonationOptIn as 'yes' | 'no')) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['victimDonationOptIn'],
      message: 'Select yes or no for donation opt-in',
    });
  }

  if (!yesNoOptions.includes(commissionFeeWaiver as 'yes' | 'no')) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['commissionFeeWaiver'],
      message: 'Select yes or no for commission waiver',
    });
  }

  if (commissionFeeWaiver === 'yes' && courseCode.length === 0) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['courseCode'],
      message: 'Course code is required when requesting a commission fee waiver',
    });
  }

  if (!alphaPattern.test(nameOnCard)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['nameOnCard'],
      message: 'Name on card can only contain letters, spaces, apostrophes, or hyphens',
    });
  }

  if (!/^([456])\d{12,18}$/.test(cardNumber)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['cardNumber'],
      message: 'Card number must start with 4, 5, or 6 and contain 13-19 digits',
    });
  }

  const parsedExpirationMonth = Number(expirationMonth);
  if (!Number.isInteger(parsedExpirationMonth) || parsedExpirationMonth < 1 || parsedExpirationMonth > 12) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['expirationMonth'],
      message: 'Expiration month must be between 1 and 12',
    });
  }

  const parsedExpirationYear = Number(expirationYear);
  const currentYear = new Date().getFullYear() % 100;
  if (!Number.isInteger(parsedExpirationYear) || parsedExpirationYear < currentYear || parsedExpirationYear > 99) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['expirationYear'],
      message: `Expiration year must be between ${currentYear} and 99`,
    });
  }

  if (!/^\d{3,4}$/.test(cvv)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['cvv'],
      message: 'CVV must be 3 or 4 digits',
    });
  }

  if (!alphaNumericPattern.test(getString(payload, 'specialInstructions'))) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['specialInstructions'],
      message: 'Special instructions contain unsupported characters',
    });
  }

  if (finalConsent !== 'yes') {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['finalConsent'],
      message: 'You must agree before submitting',
    });
  }
});

const spouseDefaults = (prefix: SpousePrefix) => ({
  [`${prefix}FirstName`]: '',
  [`${prefix}LastName`]: '',
  [`${prefix}Email`]: '',
  [`${prefix}DateOfBirth`]: '',
  [`${prefix}SurnameAtBirth`]: '',
  [`${prefix}CountryOfBirth`]: '',
  [`${prefix}StateOfBirth`]: '',
  [`${prefix}Gender`]: '',
  [`${prefix}PhoneNumber`]: '',
  [`${prefix}SocialSecurityNumber`]: '',
  [`${prefix}NoSsn`]: 'no',

  [`${prefix}AddressLineOne`]: '',
  [`${prefix}AddressLineTwo`]: '',
  [`${prefix}AddressCity`]: '',
  [`${prefix}AddressStateProvince`]: '',
  [`${prefix}AddressZipPostal`]: '',
  [`${prefix}AddressCountry`]: '',
  [`${prefix}AddressCounty`]: '',

  [`${prefix}FatherFirstName`]: '',
  [`${prefix}FatherLastName`]: '',
  [`${prefix}FatherCountryOfBirth`]: '',
  [`${prefix}FatherStateOfBirth`]: '',
  [`${prefix}MotherFirstName`]: '',
  [`${prefix}MotherLastName`]: '',
  [`${prefix}MotherCountryOfBirth`]: '',
  [`${prefix}MotherStateOfBirth`]: '',

  [`${prefix}MarriedBefore`]: '',
  [`${prefix}NumberOfMarriages`]: '',
  [`${prefix}LastMarriageEndedBy`]: '',
  [`${prefix}LastMarriageEndDate`]: '',
  [`${prefix}SeparationDocumentNames`]: [] as string[],
  [`${prefix}HighestLevelOfEducation`]: '',
  [`${prefix}Race`]: '',

  [`${prefix}AffidavitPhotoSubmitted`]: 'no',
  [`${prefix}AffidavitCurrentlyMarried`]: 'no',
  [`${prefix}AffidavitRelatedToIntended`]: 'no',
  [`${prefix}AffidavitCertifyTruth`]: 'no',
  [`${prefix}AffidavitJurisdiction`]: 'no',
  [`${prefix}AffidavitDivorce`]: 'no',
  [`${prefix}AffidavitAccuracy`]: 'no',
  [`${prefix}AffidavitActingOnOwnBehalf`]: 'no',
  [`${prefix}Signature`]: '',
});

export type ApplicationFormValue = string | string[];
export type ApplicationFormDefaults = Record<string, ApplicationFormValue>;

export const emptyApplicationValues: ApplicationFormDefaults = {
  coupleEmail: '',

  ...spouseDefaults('spouse1'),
  ...spouseDefaults('spouse2'),

  shippingShipToName: '',
  shippingLineOne: '',
  shippingLineTwo: '',
  shippingCity: '',
  shippingStateProvince: '',
  shippingZipPostal: '',
  shippingCountry: '',

  additionalCertQuantity: '0',
  includeApplicationSummary: 'no',
  apostilleCountries: [],
  apostilleQuantity: '',
  includeFullCopy: 'no',
  usShippingOption: '',
  specialInstructions: '',

  victimDonationOptIn: 'no',
  commissionFeeWaiver: 'no',
  courseCode: '',
  nameOnCard: '',
  cardNumber: '',
  expirationMonth: '',
  expirationYear: '',
  cardZipPostalCode: '',
  cvv: '',

  finalConsent: 'no',
};

const arrayFieldNames = new Set([
  'apostilleCountries',
  'spouse1SeparationDocumentNames',
  'spouse2SeparationDocumentNames',
]);

const yesNoFieldNames = new Set([
  'spouse1NoSsn',
  'spouse2NoSsn',
  'spouse1AffidavitPhotoSubmitted',
  'spouse1AffidavitCurrentlyMarried',
  'spouse1AffidavitRelatedToIntended',
  'spouse1AffidavitCertifyTruth',
  'spouse1AffidavitJurisdiction',
  'spouse1AffidavitDivorce',
  'spouse1AffidavitAccuracy',
  'spouse1AffidavitActingOnOwnBehalf',
  'spouse2AffidavitPhotoSubmitted',
  'spouse2AffidavitCurrentlyMarried',
  'spouse2AffidavitRelatedToIntended',
  'spouse2AffidavitCertifyTruth',
  'spouse2AffidavitJurisdiction',
  'spouse2AffidavitDivorce',
  'spouse2AffidavitAccuracy',
  'spouse2AffidavitActingOnOwnBehalf',
  'includeApplicationSummary',
  'includeFullCopy',
  'victimDonationOptIn',
  'commissionFeeWaiver',
  'finalConsent',
]);

const asString = (value: unknown): string => (typeof value === 'string' ? value : '');

export const normalizeFormValues = (
  values: Partial<Record<string, unknown>> | undefined,
): ApplicationFormDefaults => {
  const source = values ?? {};
  const normalized: ApplicationFormDefaults = {};

  for (const key of Object.keys(emptyApplicationValues)) {
    if (arrayFieldNames.has(key)) {
      normalized[key] = toStringArray(source[key]);
      continue;
    }

    if (yesNoFieldNames.has(key)) {
      const normalizedBoolean = asString(source[key]);
      normalized[key] = normalizedBoolean === 'yes' ? 'yes' : 'no';
      continue;
    }

    normalized[key] = asString(source[key]);
  }

  return normalized;
};

export const autosavePayloadSchema = z.object({}).catchall(
  z.union([z.string(), z.array(z.string())]),
);

export type ApplicationSubmissionValues = z.infer<typeof applicationSchema>;
