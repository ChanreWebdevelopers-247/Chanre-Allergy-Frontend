export const roundToNearestTen = (value) => {
  const numericValue = Number(value);
  if (!Number.isFinite(numericValue)) {
    return numericValue;
  }

  const base = Math.floor(numericValue / 10);
  const remainder = numericValue - base * 10;
  const rounded = remainder < 5 ? base * 10 : (base + 1) * 10;

  return Number(rounded.toFixed(2));
};

export const applyRoundingAdjustment = ({ subtotal = 0, taxes = 0, discounts = 0 }) => {
  const numericSubtotal = Number(subtotal) || 0;
  const numericTaxes = Number(taxes) || 0;
  const numericDiscounts = Number(discounts) || 0;

  const rawTotal = numericSubtotal + numericTaxes - numericDiscounts;
  const roundedTotal = roundToNearestTen(rawTotal);

  const roundingDifference = Number((roundedTotal - rawTotal).toFixed(2));

  let adjustedTaxes = numericTaxes;
  let adjustedDiscounts = numericDiscounts;

  if (roundingDifference > 0) {
    adjustedTaxes = Number((numericTaxes + roundingDifference).toFixed(2));
  } else if (roundingDifference < 0) {
    adjustedDiscounts = Number((numericDiscounts + Math.abs(roundingDifference)).toFixed(2));
  }

  return {
    rawTotal: Number(rawTotal.toFixed(2)),
    roundedTotal,
    roundingDifference,
    adjustedTaxes,
    adjustedDiscounts,
  };
};

