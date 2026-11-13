export async function validateRetailerBeat(tx, name, previousName) {
  const beat = await tx.beat.findUnique({ where: { name } });
  if (!beat || (!beat.active && name !== previousName)) {
    throw Object.assign(new Error('Select an active beat from Beat Master before onboarding the retailer.'), { status: 400 });
  }
}
