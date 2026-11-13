export function normalizeProductPacking(data) {
  const hasPieceWeight = data.pieceWeightGrams != null;
  const hasCaseWeight = data.caseWeightKg != null;
  if (hasPieceWeight !== hasCaseWeight) {
    throw Object.assign(new Error('Enter both piece grammage and case weight.'), { status: 400 });
  }
  if (hasPieceWeight) {
    const pieces = Number(data.caseWeightKg) * 1000 / Number(data.pieceWeightGrams);
    const rounded = Math.round(pieces);
    if (rounded < 1 || rounded > 2147483647 || Math.abs(pieces - rounded) > 0.000001) {
      throw Object.assign(new Error('Case weight divided by piece grammage must give a whole number of pieces.'), { status: 400 });
    }
    return { ...data, unitsPerCarton: rounded };
  }
  return data;
}
