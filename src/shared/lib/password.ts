/**
 * A password the server accepts: 8 to 72 characters. BCrypt reads at most 72 bytes and accented
 * letters take two or three bytes each, so the upper bound is counted in bytes, as the server does.
 */
export const passwordInRange = (password: string) =>
  password.length >= 8 && new TextEncoder().encode(password).length <= 72;

export const PASSWORD_RANGE_MESSAGE = "Xin vui lòng nhập trong khoảng từ 8-72 ký tự.";
