/** Offline, reproducible flag-asset refresh. It never fetches network data. */
import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { copyFileSync, lstatSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, renameSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, relative, resolve } from 'node:path'
import catalog from '../src/data/flags.json' with { type: 'json' }
import capitals from '../src/data/capitals.json' with { type: 'json' }
import { flagSvgSafetyIssue } from '../src/core/flagSvgSafety'
import { pinnedFlagSource, validateFlagCatalogPolicy } from './flag-catalog-policy'

const root = resolve(import.meta.dirname, '..')
const tarballArgument = process.argv[2]
if (!tarballArgument) throw new Error('Pass the local country-flag-icons 1.6.20 tarball path; this script does not download files.')
const tarball = resolve(tarballArgument)
const source = pinnedFlagSource
const capitalEntities = new Map(capitals.flatMap((place) => place.entities.map((entity) => [entity.code, entity.country])))
const preflightFailures = validateFlagCatalogPolicy(catalog, capitalEntities)
if (preflightFailures.length) throw new Error(`Catalog preflight failed before filesystem access:\n- ${preflightFailures.join('\n- ')}`)
const contained = (parent: string, child: string) => { const value = relative(parent, child); return value !== '' && !value.startsWith('..') && !value.includes(`${process.platform === 'win32' ? '\\' : '/'}..${process.platform === 'win32' ? '\\' : '/'}`) && !value.startsWith('/') }

// Authenticate before creating a temporary directory or invoking tar. This is
// intentionally before every archive-processing side effect.
const tarballBytes = readFileSync(tarball)
const integrity = `sha512-${createHash('sha512').update(tarballBytes).digest('base64')}`
if (integrity !== source.integrity) throw new Error('Pinned tarball integrity mismatch before extraction.')

const extraction = mkdtempSync(join(tmpdir(), 'geoquiz-flags-'))
const staging = mkdtempSync(join(root, '.flag-assets-'))
try {
  execFileSync('tar', ['-xzf', tarball, '-C', extraction])
  const packageRoot = join(extraction, 'package')
  const packageJson = JSON.parse(readFileSync(join(packageRoot, 'package.json'), 'utf8'))
  if (packageJson.name !== source.package || packageJson.version !== source.version) throw new Error('Tarball package identity does not match the pinned source.')
  if (JSON.stringify(catalog.source) !== JSON.stringify(source)) throw new Error('Catalog provenance does not match the pinned source.')

  const stagedOutput = join(staging, 'v1')
  mkdirSync(stagedOutput)
  const sourceDirectory = resolve(packageRoot, '3x2')
  const expectedFilenames = new Set(catalog.records.map((record) => `${record.id}.svg`))
  const assets = catalog.records.map((record) => {
    const sourceFile = resolve(sourceDirectory, `${record.sourceKey}.svg`)
    const destination = resolve(stagedOutput, `${record.id}.svg`)
    if (!contained(sourceDirectory, sourceFile) || !contained(stagedOutput, destination)) throw new Error(`${record.id}: resolved source or destination escapes its intended directory`)
    copyFileSync(sourceFile, destination)
    const content = readFileSync(destination, 'utf8')
    const safetyIssue = flagSvgSafetyIssue(content)
    if (safetyIssue) throw new Error(`${record.id} fails pre-install SVG validation: ${safetyIssue}`)
    return { id: record.id, sourceKey: record.sourceKey, path: record.assetPath, sha256: createHash('sha256').update(content).digest('hex'), flagStatus: record.flagStatus }
  })
  const stagedEntries = readdirSync(stagedOutput, { withFileTypes: true })
  if (stagedEntries.length !== 235 || stagedEntries.some((entry) => !entry.isFile() || entry.isSymbolicLink() || !expectedFilenames.has(entry.name)) || stagedEntries.some((entry) => !lstatSync(join(stagedOutput, entry.name)).isFile())) throw new Error('staged flag output is not an exact regular-SVG file set')
  const target = join(root, 'public/flags/v1')
  let backup: string | null = null
  try {
    try {
      const targetStats = lstatSync(target)
      if (!targetStats.isDirectory() || targetStats.isSymbolicLink()) throw new Error('existing flag output is not a safe directory')
      backup = `${target}.previous-${process.pid}`
      renameSync(target, backup)
    } catch (error: unknown) {
      if (!(error && typeof error === 'object' && 'code' in error && error.code === 'ENOENT')) throw error
    }
    renameSync(stagedOutput, target)
    if (backup) rmSync(backup, { recursive: true, force: true })
  } catch (error) {
    if (backup) try { renameSync(backup, target) } catch { /* preserve the original failure */ }
    throw error
  }
  const license = readFileSync(join(packageRoot, 'LICENSE'), 'utf8').replace(/\r\n?/g, '\n')
  writeFileSync(join(root, 'docs/licenses-country-flag-icons-MIT.txt'), license)
  writeFileSync(join(root, 'src/data/flags.json'), `${JSON.stringify(catalog, null, 2)}\n`)
  writeFileSync(join(root, 'src/data/flag-assets-manifest.json'), `${JSON.stringify({ version: 1, checked: catalog.checked, source, assets, duplicateHashGroups: [] }, null, 2)}\n`)
  console.log(`Generated ${catalog.records.length} records and ${assets.length} local SVG assets.`)
} finally {
  rmSync(extraction, { recursive: true, force: true })
  rmSync(staging, { recursive: true, force: true })
}
