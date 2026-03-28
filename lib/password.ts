export const PASSWORD_MIN_LENGTH = 8;

export type PasswordTone = "neutral" | "danger" | "warning" | "success";

export type PasswordRule = {
  id: string;
  label: string;
  met: boolean;
};

export type PasswordStrength = {
  label: string;
  tone: PasswordTone;
  helperText: string;
  score: number;
  maxScore: number;
  activeSegments: number;
  rules: PasswordRule[];
};

export type PasswordMatchState = {
  matches: boolean;
  tone: PasswordTone;
  label: string;
};

const createRules = (password: string): PasswordRule[] => [
  {
    id: "length",
    label: `At least ${PASSWORD_MIN_LENGTH} characters`,
    met: password.length >= PASSWORD_MIN_LENGTH,
  },
  {
    id: "mixed-case",
    label: "Uppercase and lowercase letters",
    met: /[a-z]/.test(password) && /[A-Z]/.test(password),
  },
  {
    id: "number",
    label: "At least one number",
    met: /\d/.test(password),
  },
  {
    id: "symbol",
    label: "At least one symbol",
    met: /[^A-Za-z0-9]/.test(password),
  },
];

export const getPasswordStrength = (password: string): PasswordStrength => {
  const rules = createRules(password);
  const bonusScore = password.length >= 12 ? 1 : 0;
  const score = rules.filter((rule) => rule.met).length + bonusScore;
  const maxScore = rules.length + 1;

  if (!password) {
    return {
      label: "Start typing",
      tone: "neutral",
      helperText:
        "Use at least 8 characters. Mixing case, numbers, and symbols makes the password stronger.",
      score,
      maxScore,
      activeSegments: 0,
      rules,
    };
  }

  if (password.length < PASSWORD_MIN_LENGTH) {
    return {
      label: "Too short",
      tone: "danger",
      helperText: `Add at least ${PASSWORD_MIN_LENGTH - password.length} more character${
        PASSWORD_MIN_LENGTH - password.length === 1 ? "" : "s"
      } to meet the minimum length.`,
      score,
      maxScore,
      activeSegments: 1,
      rules,
    };
  }

  if (score <= 2) {
    return {
      label: "Weak",
      tone: "danger",
      helperText:
        "This works, but adding uppercase letters, numbers, and symbols would make it safer.",
      score,
      maxScore,
      activeSegments: 1,
      rules,
    };
  }

  if (score === 3) {
    return {
      label: "Fair",
      tone: "warning",
      helperText: "A decent start. One more character type would strengthen it.",
      score,
      maxScore,
      activeSegments: 2,
      rules,
    };
  }

  if (score === 4) {
    return {
      label: "Strong",
      tone: "success",
      helperText: "Looks strong. A little more length would make it even better.",
      score,
      maxScore,
      activeSegments: 3,
      rules,
    };
  }

  return {
    label: "Very strong",
    tone: "success",
    helperText: "Great password. It is long and well mixed.",
    score,
    maxScore,
    activeSegments: 4,
    rules,
  };
};

export const getPasswordMatchState = (
  password: string,
  confirmPassword: string,
): PasswordMatchState | null => {
  if (!confirmPassword) {
    return null;
  }

  if (password === confirmPassword) {
    return {
      matches: true,
      tone: "success",
      label: "Passwords match.",
    };
  }

  return {
    matches: false,
    tone: "danger",
    label: "Passwords do not match yet.",
  };
};
