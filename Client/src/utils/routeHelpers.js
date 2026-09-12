export const PRICING_ROUTES = ['/stone/pricing', '/rice/pricing', '/tea/pricing'];

export const isPricingRoute = (pathname) => {
  return PRICING_ROUTES.some(route => pathname.startsWith(route));
};