export type PasswordFormValues = {
  password: string;
  confirmPassword: string;
};

export function canSubmitPasswordChange(values: PasswordFormValues): boolean {
  const password = values.password.trim();
  return password.length >= 8 && password === values.confirmPassword.trim();
}

export function normalizePasswordPayload(values: PasswordFormValues): { password: string } {
  return { password: values.password.trim() };
}
