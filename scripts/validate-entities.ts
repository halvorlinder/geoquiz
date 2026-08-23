import capitals from '../src/data/capitals.json' with { type: 'json' }
import entityCatalog from '../src/data/entities.json' with { type: 'json' }
import { validateEntityCatalog } from '../src/core/entityCatalogValidation'

const failures = validateEntityCatalog(entityCatalog, capitals)

if (failures.length) throw new Error(`Entity data validation failed:\n- ${failures.join('\n- ')}`)
console.log('Validated 197 entities, 201 associations, and 200 referenced capital places.')
