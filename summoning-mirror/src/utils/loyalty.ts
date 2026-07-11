const REG_GOOGLE_SCRIPT_URL =
  'https://script.google.com/macros/s/AKfycbx51QGCWyhj7YepAjv1o1YF5d_1zJqJg1E-yoirSQgVKrP3vwazgcntXARn0kFQdLeW/exec';

const REG_MIN_HUMAN_FILL_MS = 1800;

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
  const submittedAt = Date.now();
  if (submittedAt - input.formStartedAt < REG_MIN_HUMAN_FILL_MS) {
    await new Promise((resolve) =>
      setTimeout(resolve, REG_MIN_HUMAN_FILL_MS - (submittedAt - input.formStartedAt))
    );
  }

  const payload = {
    firstName: input.firstName.trim(),
    lastName: 'Member',
    email: input.email.trim(),
    phone: '',
    country: 'United States',
    source: 'Summoning Mirror – Times Square',
    spend: '',
    fandoms: [input.fandomName],
    otherFranchises: '',
    timestamp: new Date().toISOString(),
    formStartedAt: input.formStartedAt,
    submittedAt: Date.now(),
    website: '',
    userAgent: navigator.userAgent.slice(0, 180),
    pagePath: '/summoning-mirror',
  };

  const jsonStr = JSON.stringify(payload);

  try {
    await fetch(REG_GOOGLE_SCRIPT_URL, {
      method: 'POST',
      mode: 'no-cors',
      cache: 'no-store',
      keepalive: true,
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: jsonStr,
    });
    return true;
  } catch {
    if (navigator.sendBeacon?.(REG_GOOGLE_SCRIPT_URL, jsonStr)) {
      return true;
    }
    return false;
  }
}
