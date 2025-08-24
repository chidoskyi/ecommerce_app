const deliveryRates = {
  weightTiers: [
    { maxKg: 1, fee: 1200 },
    { maxKg: 5, fee: 1500 },
    { maxKg: 10, fee: 3500 },
    { maxKg: 25, fee: 3500 },
    { maxKg: 50, fee: 4500 }
  ]
};

export function calculateDeliveryFee(weightKg: number): number {
  if (weightKg <= 0) throw new Error("Weight must be positive");

  // Get the first tier that fits the weight, or the last tier for heavier items
  const { weightTiers } = deliveryRates;
  const tier = weightTiers.find(t => weightKg <= t.maxKg) 
    || weightTiers[weightTiers.length - 1];

  return tier.fee;
}
 