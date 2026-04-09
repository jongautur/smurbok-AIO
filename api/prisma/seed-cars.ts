/**
 * One-time seed: populates car_makes and car_models from NHTSA vPIC API.
 * Run with:  npx ts-node --project tsconfig.json -e "require('./prisma/seed-cars')"
 * Or:        npx tsx prisma/seed-cars.ts
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// Curated list of makes common in Iceland / European market
const MAKES = [
  'Audi', 'BMW', 'Chevrolet', 'Citroën', 'Dacia', 'Fiat',
  'Ford', 'Honda', 'Hyundai', 'Jaguar', 'Jeep', 'Kia',
  'Land Rover', 'Lexus', 'Mazda', 'Mercedes-Benz', 'MINI',
  'Mitsubishi', 'Nissan', 'Opel', 'Peugeot', 'Porsche',
  'Renault', 'Seat', 'Skoda', 'Subaru', 'Suzuki', 'Tesla',
  'Toyota', 'Volkswagen', 'Volvo', 'Alfa Romeo', 'Land Rover',
]

// Deduplicate
const UNIQUE_MAKES = [...new Set(MAKES)]

async function fetchModels(make: string): Promise<string[]> {
  const url = `https://vpic.nhtsa.dot.gov/api/vehicles/GetModelsForMake/${encodeURIComponent(make)}?format=json`
  const res = await fetch(url)
  if (!res.ok) {
    console.warn(`  ⚠ Could not fetch models for ${make} (${res.status})`)
    return []
  }
  const json = await res.json() as { Results: { Model_Name: string }[] }
  return [...new Set(json.Results.map((r) => r.Model_Name).filter(Boolean))].sort()
}

async function main() {
  console.log(`Seeding ${UNIQUE_MAKES.length} makes from NHTSA...`)

  for (const makeName of UNIQUE_MAKES) {
    process.stdout.write(`  ${makeName}...`)

    const make = await prisma.carMake.upsert({
      where: { name: makeName },
      update: {},
      create: { name: makeName },
    })

    const models = await fetchModels(makeName)
    process.stdout.write(` ${models.length} models\n`)

    for (const modelName of models) {
      await prisma.carModel.upsert({
        where: { makeId_name: { makeId: make.id, name: modelName } },
        update: {},
        create: { makeId: make.id, name: modelName },
      })
    }
  }

  const makeCount = await prisma.carMake.count()
  const modelCount = await prisma.carModel.count()
  console.log(`\nDone. ${makeCount} makes, ${modelCount} models in DB.`)
}

main()
  .catch((e) => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
