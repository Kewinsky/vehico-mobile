export type ListingChannel = 'olx' | 'facebook_marketplace';

export type ListingInput = {
  vehicleId: string;
  channel: ListingChannel;
};

/**
 * AI content generation is abstracted behind a service layer.
 * Implementation should be server-side (or via a secure proxy) to protect API keys.
 */
export const aiListingService = {
  async generateResaleListing(_input: ListingInput): Promise<{ text: string }> {
    throw new Error('AI listing generation not configured yet.');
  },
};

