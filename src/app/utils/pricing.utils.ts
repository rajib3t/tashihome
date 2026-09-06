import { PropertyRoomType, PropertyRoomTypePrice } from '../services/property/property.model';

export interface RoomNightlyRateResult {
  effectivePrice: number;
  standardPrice: number;
  isDiscounted: boolean;
  appliedOccupancy?: number;
}

/**
 * Resolves the nightly rate for a given room and guest count on the client-side.
 * Follows the pricing hierarchy:
 * 1. Matching tier in property_room_type.pricing_tiers where tier.occupancy == guestsPerRoom.
 * 2. If exact match is absent, pick the closest tier (highest tier <= guestsPerRoom, or lowest tier).
 * 3. effective_rate = tier.sale_per_night if (tier.sale_per_night > 0 && tier.sale_per_night < tier.price_per_night) else tier.price_per_night.
 * 4. If no tiers configured, fall back to room base price, then property price.
 */
export function getRoomNightlyRate(
  room: PropertyRoomType | undefined | null,
  guestsPerRoom: number,
  fallbackPropertyPrice: number = 0,
  fallbackPropertySalePrice: number = 0
): RoomNightlyRateResult {
  const safeGuests = Math.max(1, Math.floor(guestsPerRoom || 1));
  const tiers = room?.pricing_tiers || [];

  if (tiers.length > 0) {
    const sortedTiers = [...tiers].sort((a, b) => a.occupancy - b.occupancy);

    // 1. Exact Match
    let matchedTier = sortedTiers.find((t) => t.occupancy === safeGuests);

    // 2. Closest Match fallback
    if (!matchedTier) {
      const lower = sortedTiers.filter((t) => t.occupancy <= safeGuests);
      matchedTier = lower.length > 0 ? lower[lower.length - 1] : sortedTiers[0];
    }

    if (matchedTier) {
      const standard = Number(matchedTier.price_per_night) || 0;
      const sale = Number(matchedTier.sale_per_night) || 0;
      const isDiscounted = sale > 0 && (standard === 0 || sale < standard);
      const effective = isDiscounted ? sale : standard;

      return {
        effectivePrice: effective,
        standardPrice: standard,
        isDiscounted,
        appliedOccupancy: matchedTier.occupancy,
      };
    }
  }

  // Fallback to room base price
  const roomStandard = Number(room?.price_per_night) || 0;
  const roomSale = Number(room?.sale_per_night) || 0;
  if (roomSale > 0 && (roomStandard === 0 || roomSale < roomStandard)) {
    return {
      effectivePrice: roomSale,
      standardPrice: roomStandard,
      isDiscounted: true,
    };
  }
  if (roomStandard > 0) {
    return {
      effectivePrice: roomStandard,
      standardPrice: roomStandard,
      isDiscounted: false,
    };
  }

  // Fallback to property price
  if (fallbackPropertySalePrice > 0 && (fallbackPropertyPrice === 0 || fallbackPropertySalePrice < fallbackPropertyPrice)) {
    return {
      effectivePrice: fallbackPropertySalePrice,
      standardPrice: fallbackPropertyPrice,
      isDiscounted: true,
    };
  }

  return {
    effectivePrice: fallbackPropertyPrice,
    standardPrice: fallbackPropertyPrice,
    isDiscounted: false,
  };
}

/**
 * Validates pricing tiers for a room type.
 */
export function validatePricingTiers(
  tiers: PropertyRoomTypePrice[],
  maxCapacity: number
): { isValid: boolean; error?: string } {
  const seenOccupancies = new Set<number>();

  for (const tier of tiers) {
    if (!tier.occupancy || tier.occupancy < 1) {
      return { isValid: false, error: 'Occupancy must be at least 1 guest.' };
    }
    if (maxCapacity > 0 && tier.occupancy > maxCapacity) {
      return {
        isValid: false,
        error: `Occupancy (${tier.occupancy}) cannot exceed room capacity of ${maxCapacity} guests.`,
      };
    }
    if (seenOccupancies.has(tier.occupancy)) {
      return {
        isValid: false,
        error: `Duplicate pricing tier for ${tier.occupancy} guest(s).`,
      };
    }
    seenOccupancies.add(tier.occupancy);

    if (tier.price_per_night < 0) {
      return { isValid: false, error: 'Price per night cannot be negative.' };
    }
    if (tier.sale_per_night !== undefined && tier.sale_per_night !== null && tier.sale_per_night > 0) {
      if (tier.sale_per_night >= tier.price_per_night && tier.price_per_night > 0) {
        return {
          isValid: false,
          error: `Sale rate for ${tier.occupancy} guest(s) must be less than standard rate.`,
        };
      }
    }
  }

  return { isValid: true };
}

