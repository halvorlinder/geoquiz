import { execFileSync } from 'node:child_process'
import { basename, resolve } from 'node:path'
import { validateDesignDecisionDirectory } from './design-decision-validation'

function historicalDecisionRecords(): ReadonlyMap<string, string> {
  const configuredRef = process.env.DESIGN_DECISIONS_BASE_REF?.trim()
  const reference = configuredRef && !/^0+$/.test(configuredRef) ? configuredRef : 'HEAD'
  try {
    const paths = execFileSync('git', ['ls-tree', '-r', '--name-only', reference, '--', 'docs/design-decisions'], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    })
    const records = new Map<string, string>()
    for (const path of paths.split('\n').filter(Boolean)) {
      if (!basename(path).startsWith('DD-')) continue
      records.set(basename(path), execFileSync('git', ['show', `${reference}:${path}`], {
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'pipe'],
      }))
    }
    return records
  } catch (error) {
    throw new Error(`Unable to inspect historical design decisions at ${reference}.`, { cause: error })
  }
}

const count = validateDesignDecisionDirectory({
  root: resolve(process.cwd(), 'docs/design-decisions'),
  historicalRecords: historicalDecisionRecords(),
})
console.log(`Validated ${count} design decision records.`)
