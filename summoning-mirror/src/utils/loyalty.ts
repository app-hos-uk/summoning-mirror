export const FOUNDER_REGISTER_BASE = 'https://houseofspells.com/register';

export function getFounderRegisterUrl(fandomName: string): string {
  const params = new URLSearchParams({
    interest: fandomName,
    source: 'Summoning Mirror',
  });
  return `${FOUNDER_REGISTER_BASE}?${params.toString()}`;
}

export interface FounderRegistrationInput {
  firstName: string;
  email: string;
  fandomName: string;
  formStartedAt: number;
}

export async function registerFounderMember(input: FounderRegistrationInput): Promise<boolean> {
  try {
    const res = await fetch('/api/founder/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        firstName: input.firstName.trim(),
        email: input.email.trim(),
        fandomName: input.fandomName,
        formStartedAt: input.formStartedAt,
      }),
    });
    return res.ok;
  } catch {
    return false;
  }
}
