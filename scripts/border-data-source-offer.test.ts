import { createHash } from 'node:crypto'
import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import provenance from './border-lines-provenance.json' with { type: 'json' }

describe('border data static source offer', () => {
  it('publishes both local database downloads linked by the credits page', () => {
    const page = readFileSync(resolve(import.meta.dirname, '../public/border-data-sources.html'), 'utf8')
    const hrefs = [...page.matchAll(/href="([^"]+)"/g)].map(match => match[1]).filter(href => href.startsWith('data-sources/'))
    expect(hrefs).toEqual(['data-sources/border-countries/overture-divisions-2026-08-19.0.json.gz', 'data-sources/border-countries/border-lines-v2.json', 'data-sources/border-countries/border-lines-v1.json'])
    for (const href of hrefs) expect(existsSync(resolve(import.meta.dirname, '../public/border-data-sources.html', '..', href))).toBe(true)
    const source = readFileSync(resolve(import.meta.dirname, '../public/data-sources/border-countries/overture-divisions-2026-08-19.0.json.gz'))
    expect(createHash('sha256').update(source).digest('hex')).toBe(provenance.sourceSha256)
    const derived = readFileSync(resolve(import.meta.dirname, '../public/data-sources/border-countries/border-lines-v1.json'))
    expect(createHash('sha256').update(derived).digest('hex')).toBe(provenance.generatedSha256)
    const derivedV2 = readFileSync(resolve(import.meta.dirname, '../public/data-sources/border-countries/border-lines-v2.json'))
    expect(createHash('sha256').update(derivedV2).digest('hex')).toBe(provenance.generatedV2Sha256)
  })
})
