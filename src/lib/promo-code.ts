/**
 * Generate a promo code from a phone number + brand slug.
 * Format: last 4 digits of phone + 2-letter brand initials (uppercase)
 * Example: "0694888777" + "jungle-tech" → "8777JU"
 */
export function generatePromoCode(phoneNumber: string, brandSlug: string): string {
  const cleanPhone = phoneNumber.replace(/\D/g, "");
  const phonePart = cleanPhone.slice(-4).padStart(4, "0");

  const brandParts = brandSlug.replace(/-/g, " ").split(/\s+/);
  let brandPart: string;
  if (brandParts.length >= 2) {
    brandPart = (brandParts[0][0] + brandParts[1][0]).toUpperCase();
  } else {
    brandPart = brandSlug.substring(0, 2).toUpperCase();
  }

  return `${phonePart}${brandPart}`;
}

/**
 * Resolve variables in text content for a specific session.
 * Supported variables:
 *   {{CODE_PROMO}} → the session's promo code for the brand
 *   {{PRENOM}}     → the WhatsAppeur's display name
 *   {{MARQUE}}     → the brand name
 *   {{REDUCTION}}  → the campaign discount percentage (e.g., "10%")
 */
export function resolveVariables(
  text: string,
  variables: {
    promoCode?: string;
    displayName?: string;
    brandName?: string;
    discountPercent?: number | null;
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
  if (variables.discountPercent) {
    result = result.replace(/\{\{REDUCTION\}\}/g, `${variables.discountPercent}%`);
  }
  return result;
}
