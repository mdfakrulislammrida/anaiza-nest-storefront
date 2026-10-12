// The rules the new-password form checks before it asks the server. The server checks the same again.

export const MIN_PASSWORD_LENGTH = 8;

/** What is wrong with a new password and its confirmation, in the shop's voice; empty when it is fine. */
export function passwordProblems(password: string, confirmation: string): { password?: string; password_confirmation?: string } {
  const problems: { password?: string; password_confirmation?: string } = {};

  if (password.length < MIN_PASSWORD_LENGTH) {
    problems.password = `Please choose a password of at least ${MIN_PASSWORD_LENGTH} characters.`;
  } else if (confirmation !== password) {
    problems.password_confirmation = "The two passwords do not match.";
  }

  return problems;
}

/** The reset token from the page's address (?token=...), or null. */
export function tokenFromSearch(search: string): string | null {
  const token = new URLSearchParams(search).get("token")?.trim();

  return token ? token : null;
}
