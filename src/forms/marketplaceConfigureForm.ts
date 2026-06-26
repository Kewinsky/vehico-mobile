import { isPositiveNumber, parsePositive } from "../utils/validation";

export type MarketplaceConfigureFormState = {
  includePrice: boolean;
  price: string;
};

export function canProceedMarketplaceConfigure(
  form: MarketplaceConfigureFormState,
): boolean {
  if (!form.includePrice) return true;
  return isPositiveNumber(form.price);
}

export function marketplaceConfigureFieldErrors(
  form: MarketplaceConfigureFormState,
) {
  return {
    price: form.includePrice && !isPositiveNumber(form.price),
  };
}

export function parseMarketplacePrice(
  form: MarketplaceConfigureFormState,
): number | null {
  if (!form.includePrice) return null;
  if (!canProceedMarketplaceConfigure(form)) {
    throw new Error("Invalid marketplace price");
  }
  return parsePositive(form.price);
}
