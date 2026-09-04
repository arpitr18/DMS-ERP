import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const email = process.env.ADMIN_EMAIL || 'vikas@shivkripa.com';
  const password = process.env.ADMIN_PASSWORD || 'Vikas@123!';
  const name = process.env.ADMIN_NAME || 'Administrator';
  const passwordHash = await bcrypt.hash(password, 12);

  await prisma.user.upsert({
    where: { email },
    update: { name, passwordHash },
    create: { email, name, passwordHash, role: 'DISTRIBUTOR' }
  });

  const categories = ['Salary', 'Rent', 'Fuel', 'Delivery', 'Driver', 'Electricity', 'Vehicle Repair', 'Loading/Unloading', 'Miscellaneous'];
  for (const categoryName of categories) {
    await prisma.expenseCategory.upsert({
      where: { name: categoryName },
      update: {},
      create: { name: categoryName }
    });
  }

  console.log(`Seed complete. Admin: ${email}`);
}

main().finally(() => prisma.$disconnect());
