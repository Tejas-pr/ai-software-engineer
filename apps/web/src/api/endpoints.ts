const BASE = "/api/v1"

export const API_ENDPOINTS = {
  AUTH: {
    REQUEST_OTP: `${BASE}/accounts/auth/request-otp/`,
    VERIFY_OTP: `${BASE}/accounts/auth/verify-otp/`,
    LOGIN: `${BASE}/accounts/auth/login/`,
    SIGNUP: `${BASE}/accounts/auth/signup/`,
    REQUEST_PASSWORD_RESET_LINK: `${BASE}/accounts/auth/password-reset/request-link/`,
    PASSWORD_RESET_CONFIRM: `${BASE}/accounts/auth/password-reset/confirm/`,
    REFRESH: `${BASE}/accounts/auth/refresh/`,
    LOGOUT: `${BASE}/accounts/auth/logout/`,
    ME: `${BASE}/accounts/auth/me/`,
    GITHUB_LOGIN: `${BASE}/accounts/auth/github/login`,
  },
}
