/**
 * Ad configuration. Both values come from the environment so the slot can be
 * switched on without a code change:
 *
 *   NEXT_PUBLIC_ADSENSE_CLIENT=ca-pub-...
 *   NEXT_PUBLIC_ADSENSE_SLOT=1234567890
 *   NEXT_PUBLIC_SPONSOR_CONTACT=sponsors@yourdomain
 *
 * With no client id the slot renders a house ad for the slot itself, never a
 * fake ad network response.
 */
export const ads = {
  client: process.env.NEXT_PUBLIC_ADSENSE_CLIENT ?? null,
  slot: process.env.NEXT_PUBLIC_ADSENSE_SLOT ?? null,
  contact: process.env.NEXT_PUBLIC_SPONSOR_CONTACT ?? null,
};
