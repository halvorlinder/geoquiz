export function shuffled<T>(items: readonly T[], random = Math.random): T[] {
  const copy = [...items]
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1))
    ;[copy[index], copy[swapIndex]] = [copy[swapIndex], copy[index]]
  }
  return copy
}

export type QuizProgress<T> = {
  deck: T[]
  index: number
  correct: number
  revealed: boolean
}

export function startQuiz<T>(items: readonly T[], random = Math.random): QuizProgress<T> {
  return { deck: shuffled(items, random), index: 0, correct: 0, revealed: false }
}

export function advanceQuiz<T>(quiz: QuizProgress<T>, wasCorrect: boolean): QuizProgress<T> {
  return {
    ...quiz,
    index: quiz.index + 1,
    correct: quiz.correct + (wasCorrect ? 1 : 0),
    revealed: false,
  }
}

export function isComplete<T>(quiz: QuizProgress<T>): boolean {
  return quiz.index >= quiz.deck.length
}
