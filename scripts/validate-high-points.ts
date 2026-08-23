import rawHighPointData from '../src/data/high-points.json' with { type: 'json' }
import { HIGH_POINT_DATA_VERSION, highPointSources } from '../src/data/high-points'
import { validateHighPointDataset } from '../src/core/highPointValidation'

const failures = validateHighPointDataset(rawHighPointData)
if (failures.length) throw new Error(`Highest-point data validation failed:\n- ${failures.join('\n- ')}`)
console.log(`Validated ${rawHighPointData.records.length} highest-point records, ${Object.keys(highPointSources).length} sources, version ${HIGH_POINT_DATA_VERSION}.`)
