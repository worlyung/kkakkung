import bcrypt from "bcryptjs";

const PASSCODE_PATTERN = /^\d{4}$/;

export function normalizePasscode(value: FormDataEntryValue | string | null): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const passcode = value.trim();
  return PASSCODE_PATTERN.test(passcode) ? passcode : null;
}

export async function hashPasscode(passcode: string): Promise<string> {
  if (!PASSCODE_PATTERN.test(passcode)) {
    throw new Error("암호는 숫자 4자리여야 합니다.");
  }

  return bcrypt.hash(passcode, 12);
}

export async function verifyPasscode(passcode: string, hash: string): Promise<boolean> {
  if (!PASSCODE_PATTERN.test(passcode)) {
    return false;
  }

  return bcrypt.compare(passcode, hash);
}
