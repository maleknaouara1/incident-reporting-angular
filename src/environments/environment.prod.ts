export const environment = {
  production: true,
  // Empty: the API is served from the same origin under /api (nginx proxies it),
  // which the SameSite=Strict refresh cookie requires and makes CORS unnecessary.
  apiBaseUrl: ''
};
