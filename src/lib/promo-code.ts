/**
 * Generate a promo code from a WhatsAppeur name + brand slug.
 * Format: 3 first letters of name (uppercase) + 2-letter brand initials (uppercase)
 * Example: "Jacques" + "jungletech" → "JACJT"
 */
export function generatePromoCode(displayName: string, brandSlug: string): string {
  // First 3 letters of name, uppercase
  const namePart = (displayName || "USR")
    .replace(/[^a-zA-Z]/g, "")
    .substring(0, 3)
    .toUpperCase()
    .padEnd(3, "X");

  // Brand initials: first letter of each word, max 2
  const brandParts = brandSlug.replace(/-/g, " ").split(/\s+/);
  let brandPart: string;
  if (brandParts.length >= 2) {
    brandPart = (brandParts[0][0] + brandParts[1][0]).toUpperCase();
  } else {
    brandPart = brandSlug.substring(0, 2).toUpperCase();
  }

  return `${namePart}${brandPart}`;
}

/**
 * Resolve variables in text content for a specific session.
 * Supported variables:
 *   {{CODE_PROMO}} → the session's promo code for the brand
 *   {{PRENOM}}     → the WhatsAppeur's display name
 *   {{MARQUE}}     → the brand name
 */
export function resolveVariables(
  text: string,
  variables: {
    promoCode?: string;
    displayName?: string;
    brandName?: string;
  }
): string {
  let result = text;
  if (variables.promoCode) {
    result = result.replace(/\{\{CODE_PROMO\}\}/g, variables.promoCode);
  }
  if (variables.displayName) {
    result = result.replace(/\{\{PRENOM\}\}/g, variables.displayName);
  }
  if (variables.brandName) {
    result = result.replace(/\{\{MARQUE\}\}/g, variables.brandName);
  }
  return result;
}
