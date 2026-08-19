export type Capital = {
  id: string
  capital: string
  latitude: number
  longitude: number
  aliases?: string[]
  entities: CapitalEntity[]
  coordinateSource: string
  checked: string
}

export type CapitalEntity = {
  code: string
  country: string
  sourceRef: string
  checked: string
}

export type AnswerResult =
  | { status: 'correct'; matched: string }
  | { status: 'incorrect' }
