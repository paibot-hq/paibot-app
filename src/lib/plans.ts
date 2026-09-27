// Paid plans and the contact details the legal pages and the plan page share,
// so a price or address is changed in exactly one place.

// Placeholder until the support address exists; scripts/check-legal.mjs fails
// while it is still here, so the pages cannot ship with it.
export const CONTACT_EMAIL = 'TODO-contact-email@paibot.app';

export const SELLER = { ja: '合同会社PAIBOT', en: 'PAIBOT LLC', zh: 'PAIBOT LLC（合同会社PAIBOT）' } as const;

export const SUPPORTER_PLAN = {
  // Tax-inclusive, in yen, billed monthly and renewed automatically.
  priceYen: 500,
  interval: 'month',
  // Checkout opens once the Stripe account is activated; until then the page
  // describes the plan with its sign-up button disabled.
  checkoutAvailable: false,
} as const;
