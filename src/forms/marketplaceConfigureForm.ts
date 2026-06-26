import { isPositiveInteger, parsePositiveInteger } from "../utils/validation";

export type MarketplaceConfigureFormState = {
  includePrice: boolean;
  price: string;
};

export function canProceedMarketplaceConfigure(
  form: MarketplaceConfigureFormState,
): boolean {
  if (!form.includePrice) return true;
  return isPositiveInteger(form.price);
}

export function marketplaceConfigureFieldErrors(
  form: MarketplaceConfigureFormState,
) {
  return {
    price: form.includePrice && !isPositiveInteger(form.price),
  };
}

export function marketplacePriceForNavigation(
  form: MarketplaceConfigureFormState,
): number | null {
  if (!form.includePrice) return null;
  if (!canProceedMarketplaceConfigure(form)) {
    throw new Error("Invalid marketplace price");
  }
  return parsePositiveInteger(form.price.trim());
}
