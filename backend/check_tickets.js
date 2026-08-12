const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const tickets = await prisma.ticket.findMany();
  console.log("Total tickets in DB:", tickets.length);
  if(tickets.length > 0) {
    console.log("Sample ticket:", tickets[0]);
  }
}
main().catch(console.error).finally(() => prisma.$disconnect());
