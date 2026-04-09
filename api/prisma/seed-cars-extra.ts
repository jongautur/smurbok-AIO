/**
 * Patches makes that NHTSA doesn't know by name (European brands).
 * Run with: npx tsx prisma/seed-cars-extra.ts
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const EXTRA: Record<string, string[]> = {
  'Citroën': ['C1', 'C2', 'C3', 'C3 Aircross', 'C4', 'C4 Cactus', 'C5', 'C5 Aircross', 'C5 X', 'Berlingo', 'Jumpy', 'SpaceTourer'],
  'Dacia': ['Logan', 'Sandero', 'Duster', 'Spring', 'Jogger', 'Bigster'],
  'Skoda': ['Fabia', 'Octavia', 'Superb', 'Rapid', 'Scala', 'Kamiq', 'Karoq', 'Kodiaq', 'Enyaq'],
  'Seat': ['Ibiza', 'Leon', 'Arona', 'Ateca', 'Tarraco', 'Mii', 'Alhambra'],
  'Renault': ['Clio', 'Megane', 'Kadjar', 'Captur', 'Koleos', 'Zoe', 'Kangoo', 'Trafic', 'Master', 'Twingo'],
  'Peugeot': ['108', '208', '308', '408', '508', '2008', '3008', '5008', 'Partner', 'Expert'],
  'Opel': ['Astra', 'Corsa', 'Insignia', 'Mokka', 'Crossland', 'Grandland', 'Zafira', 'Meriva'],
}

async function main() {
  for (const [makeName, modelNames] of Object.entries(EXTRA)) {
    const make = await prisma.carMake.upsert({
      where: { name: makeName },
      update: {},
      create: { name: makeName },
    })
    let added = 0
    for (const name of modelNames) {
      await prisma.carModel.upsert({
        where: { makeId_name: { makeId: make.id, name } },
        update: {},
        create: { makeId: make.id, name },
      })
      added++
    }
    console.log(`  ${makeName}: ${added} models`)
  }
  console.log('Done.')
}

main()
  .catch((e) => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
