export const DEFAULT_TIMEZONE = "UTC";

type IntlWithSupportedValues = typeof Intl & {
  supportedValuesOf?: (key: "timeZone") => string[];
};

const getIntlWithSupportedValues = () => Intl as IntlWithSupportedValues;

export const isValidTimeZone = (value?: string | null) => {
  if (!value || typeof value !== "string") {
    return false;
  }

  const normalized = value.trim();
  if (!normalized) {
    return false;
  }

  const intlWithSupportedValues = getIntlWithSupportedValues();
  if (typeof intlWithSupportedValues.supportedValuesOf === "function") {
    return intlWithSupportedValues.supportedValuesOf("timeZone").includes(normalized);
  }

  try {
    new Intl.DateTimeFormat(undefined, {
      timeZone: normalized,
    }).format(new Date());
    return true;
  } catch {
    return false;
  }
};

export const getBrowserTimeZone = () => {
  try {
    const candidate = Intl.DateTimeFormat().resolvedOptions().timeZone;
    return isValidTimeZone(candidate) ? candidate : DEFAULT_TIMEZONE;
  } catch {
    return DEFAULT_TIMEZONE;
  }
};

export const getSupportedTimeZones = () => {
  const intlWithSupportedValues = getIntlWithSupportedValues();
  if (typeof intlWithSupportedValues.supportedValuesOf === "function") {
    return intlWithSupportedValues.supportedValuesOf("timeZone");
  }

  return Array.from(new Set([DEFAULT_TIMEZONE, getBrowserTimeZone()]));
};

export type TimeDisplayMode = "relative" | "datetime" | "date" | "time";

export const formatAbsoluteTime = (
  date: Date,
  mode: Exclude<TimeDisplayMode, "relative">,
  timezone: string,
) => {
  if (mode === "date") {
    return new Intl.DateTimeFormat(undefined, {
      timeZone: timezone,
      year: "numeric",
      month: "short",
      day: "numeric",
    }).format(date);
  }

  if (mode === "time") {
    return new Intl.DateTimeFormat(undefined, {
      timeZone: timezone,
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    }).format(date);
  }

  return new Intl.DateTimeFormat(undefined, {
    timeZone: timezone,
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).format(date);
};
