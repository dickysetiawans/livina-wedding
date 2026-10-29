export interface PasswordInput {
  action: "change-password" | "reset-password";
  current_password: string;
  password: string;
  user_id?: string;
}

export function validPassword(value: unknown): value is string {
  return (
    typeof value === "string" &&
    value.length >= 12 &&
    value.length <= 1024 &&
    /[A-Za-z]/.test(value) &&
    /[0-9]/.test(value)
  );
}

export function passwordPayload(value: unknown): PasswordInput | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const input = value as Record<string, unknown>;
  if (
    !["change-password", "reset-password"].includes(String(input.action)) ||
    !validPassword(input.password) ||
    typeof input.current_password !== "string" ||
    !input.current_password ||
    input.current_password.length > 1024 ||
    input.password === input.current_password
  )
    return null;
  if (
    input.action === "reset-password" &&
    (typeof input.user_id !== "string" ||
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        input.user_id,
      ))
  )
    return null;
  return {
    action: input.action as PasswordInput["action"],
    current_password: input.current_password,
    password: input.password,
    ...(input.action === "reset-password"
      ? { user_id: input.user_id as string }
      : {}),
  };
}
