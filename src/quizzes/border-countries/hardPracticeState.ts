export type HardDisclosure = 'correct' | 'revealed'

export type HardPracticeState = Readonly<{
  correctCodes: readonly string[]
  revealedCodes: readonly string[]
  revealOneUsed: boolean
}>

export const blankHardPracticeState = (): HardPracticeState => ({ correctCodes: [], revealedCodes: [], revealOneUsed: false })

function contains(values: readonly string[], value: string) { return values.includes(value) }

export function hardDisclosureFor(state: HardPracticeState, code: string): HardDisclosure | undefined {
  return contains(state.correctCodes, code) ? 'correct' : contains(state.revealedCodes, code) ? 'revealed' : undefined
}

export function discloseCorrect(state: HardPracticeState, code: string): HardPracticeState {
  if (hardDisclosureFor(state, code)) return state
  return { ...state, correctCodes: [...state.correctCodes, code] }
}

/** The deck order is the stable, deterministic reveal order when no answer is known. */
export function revealOneHardEndpoint(state: HardPracticeState, codes: readonly string[]): HardPracticeState {
  if (state.revealOneUsed) return state
  const code = codes.find(candidate => !hardDisclosureFor(state, candidate))
  return code ? { ...state, revealOneUsed: true, revealedCodes: [...state.revealedCodes, code] } : { ...state, revealOneUsed: true }
}

export function revealAllHardEndpoints(state: HardPracticeState, codes: readonly string[]): HardPracticeState {
  const missing = codes.filter(code => !hardDisclosureFor(state, code))
  return missing.length ? { ...state, revealedCodes: [...state.revealedCodes, ...missing] } : state
}

export function isHardPracticeComplete(state: HardPracticeState, codes: readonly string[]) {
  return codes.every(code => Boolean(hardDisclosureFor(state, code)))
}

export function hardPracticeCountsCorrect(state: HardPracticeState, codes: readonly string[]) {
  return state.revealedCodes.length === 0 && codes.every(code => contains(state.correctCodes, code))
}
