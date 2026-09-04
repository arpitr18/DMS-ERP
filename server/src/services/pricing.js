export async function getEffectivePrice(tx, retailerId, productId) {
  const custom = await tx.retailerProductPrice.findUnique({
    where: { retailerId_productId: { retailerId, productId } }
  });
  if (custom) return { rate: Number(custom.sellingRate), source: 'CUSTOM' };
  const product = await tx.product.findUnique({ where: { id: productId } });
  if (!product) throw Object.assign(new Error('Product not found.'), { status: 404 });
  return { rate: Number(product.defaultSellingRate), source: 'DEFAULT' };
}
