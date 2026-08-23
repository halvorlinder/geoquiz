import capitals from '../src/data/capitals.json' with { type: 'json' }
import dataset from '../src/data/country-shapes.json' with { type: 'json' }
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { generateCountryShapeCredits, generateCountryShapeDataset } from './generate-country-shapes'
import { validateCountryShapeDataset } from '../src/core/countryShapes'

type Capital = { entities: { code: string }[] }

const expectedCodes = new Set((capitals as Capital[]).flatMap((capital) => capital.entities.map((entity) => entity.code)))
const typedDataset = dataset as unknown as import('../src/core/countryShapes').CountryShapeDataset
const failures = validateCountryShapeDataset(typedDataset, expectedCodes)
const generated = `${JSON.stringify(generateCountryShapeDataset())}\n`
const checkedIn = `${JSON.stringify(typedDataset)}\n`
if (generated !== checkedIn) failures.push('checked-in country shapes are not deterministic/current; run npm run generate:country-shapes')
const checkedInCredits = readFileSync(join(import.meta.dirname, '../public/country-shape-credits.html'), 'utf8')
if (generateCountryShapeCredits() !== checkedInCredits) failures.push('checked-in country shape credits are not deterministic/current; run npm run generate:country-shapes')
if (failures.length) throw new Error(`Country shape validation failed:\n- ${failures.join('\n- ')}`)
console.log(`Validated ${Object.keys(typedDataset.shapes).length} local country silhouettes for ${expectedCodes.size} study entities.`)
