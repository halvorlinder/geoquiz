import { useEffect, useMemo, useRef, useState, type ChangeEvent, type KeyboardEvent, type MouseEvent } from 'react'
import { matchNeighbourAnswer } from '../../core/entityAnswerMatching'
import { studyEntities } from '../../core/entity'
import { readScoreboard, recordScoreboardEntry, type ScoreboardEntry, type ScoreboardStorage } from '../../core/scoreboard/scoreboard'
import { currentQuestionId, elapsedTimedSessionMs, isTimedSessionComplete, startTimedSession, timedSessionOutcome, transitionTimedSession, type TimedSession } from '../../core/session/timedSession'
import { advanceQuiz, isComplete, startQuiz, type QuizProgress } from '../../core/shuffledDeck'
import { BorderLineImage } from './BorderLineImage'
import { EasyBorderContextMap, type BorderContextCountry } from './EasyBorderContextMap'
import { borderContextGeometry } from './borderContextGeometry'
import { blankHardPracticeState, discloseCorrect, hardDisclosureFor, hardPracticeCountsCorrect, isHardPracticeComplete, revealAllHardEndpoints, revealOneHardEndpoint, type HardPracticeState } from './hardPracticeState'
import { BORDER_DATA_VERSION, borderContinents, borderEntity, borderQuestions, borderSetupNote, borderShape, type BorderContinent, type BorderDifficulty, type BorderQuestion } from './borderCountries'

type Mode = 'practice' | 'timed'
type Config = Readonly<{ mode: Mode; difficulty: BorderDifficulty; continent: BorderContinent }>
type State = Readonly<{ value: string; found: readonly string[]; revealed: boolean; complete: boolean; hard: HardPracticeState }>
const blank = (): State => ({ value: '', found: [], revealed: false, complete: false, hard: blankHardPracticeState() })
function getStorage(): ScoreboardStorage | undefined { try { return window.localStorage } catch { return undefined } }
function clock(value: number) { const seconds=Math.floor(value/1000); return `${Math.floor(seconds/60)}:${String(seconds%60).padStart(2,'0')}` }
function outcomeText(outcome: Readonly<{ correctCount: number; revealedCount: number; totalCount: number }>) { return `${outcome.correctCount} correct · ${outcome.revealedCount} revealed · ${outcome.totalCount} total` }
function initialFeedback(difficulty: BorderDifficulty) { return difficulty === 'hard' ? 'Name both countries sharing this border.' : 'Name the country on the other side of the highlighted border.' }
function rngFromRun() { let state = (Date.now() ^ Math.floor(Math.random() * 0x7fffffff)) >>> 0; return () => { state = (state * 1664525 + 1013904223) >>> 0; return state / 0x100000000 } }

export type BorderQuestionFactory = (difficulty: BorderDifficulty, continent: BorderContinent, random: () => number) => readonly BorderQuestion[]

export type BorderCountriesQuizProps = Readonly<{ questionFactory?: BorderQuestionFactory; random?: () => number }>

type DevelopmentFixture = Readonly<{ id: string; config: Config; question: BorderQuestion }>
/** Direct Chrome-only QA fixture; production builds erase this branch. */
function developmentFixture(): DevelopmentFixture | undefined {
  if (!import.meta.env.DEV) return undefined
  const fixtureId = new URLSearchParams(window.location.hash.split('?')[1] ?? '').get('qa')
  const fixtures: Readonly<Record<string, readonly [string, string | undefined, BorderDifficulty]>> = {
    'rus-prk': ['PRK,RUS', 'RUS', 'easy'],
    'bwa-botswana': ['BWA,ZMB', 'BWA', 'easy'],
    'bwa-zambia': ['BWA,ZMB', 'ZMB', 'easy'],
    'vatican-italy': ['ITA,VAT', 'ITA', 'easy'],
    liechtenstein: ['AUT,LIE', 'LIE', 'easy'],
    'spain-morocco': ['ESP,MAR', 'ESP', 'easy'],
    'france-monaco': ['FRA,MCO', 'FRA', 'easy'],
    hard: ['PRK,RUS', undefined, 'hard'],
    'esp-fra': ['ESP,FRA', 'ESP', 'easy'],
    'esp-mar': ['ESP,MAR', 'ESP', 'easy'],
    'can-usa': ['CAN,USA', 'CAN', 'easy'],
    'arm-aze': ['ARM,AZE', 'ARM', 'easy'],
    'hard-multi': ['ESP,FRA', undefined, 'hard'],
  }
  const requested = fixtureId ? fixtures[fixtureId] : undefined
  if (!requested) return undefined
  const [pair, knownCode, difficulty] = requested
  const question = borderQuestions(difficulty, 'All', knownCode === requested[0].split(',')[0] ? () => 0 : () => .99).find(candidate => candidate.codes.join(',') === pair && (difficulty === 'hard' || candidate.knownCode === knownCode))
  return question ? { id: fixtureId!, config: { mode: 'practice', difficulty, continent: 'All' }, question } : undefined
}

export function BorderCountriesQuiz({ questionFactory = borderQuestions, random }: BorderCountriesQuizProps) {
  const fixture = developmentFixture()
  const runRandom = useRef(random ?? rngFromRun()).current
  const [draft,setDraft]=useState<Config>(fixture?.config ?? { mode:'practice',difficulty:'easy',continent:'All' })
  const [active,setActive]=useState<Config>(fixture?.config ?? draft)
  const initial=useMemo(()=>fixture ? [fixture.question] : questionFactory('easy','All',runRandom),[fixture,questionFactory,runRandom])
  const [activeDeck,setActiveDeck]=useState<readonly BorderQuestion[]>(initial)
  const [practice,setPractice]=useState<QuizProgress<BorderQuestion>>(()=>startQuiz(initial,runRandom))
  const [timed,setTimed]=useState<TimedSession|null>(null)
  const [practiceState,setPracticeState]=useState<State>(blank)
  const [timedStates,setTimedStates]=useState<Record<string,State>>({})
  const [acknowledgement,setAcknowledgement]=useState<BorderQuestion|null>(null)
  const [feedback,setFeedback]=useState(() => initialFeedback(fixture?.config.difficulty ?? 'easy'))
  const [scores,setScores]=useState<readonly ScoreboardEntry[]>([])
  const [presentationEpoch,setPresentationEpoch]=useState(0)
  const [now,setNow]=useState(()=>performance.now())
  const inputRef=useRef<HTMLInputElement>(null); const nextRef=useRef<HTMLButtonElement>(null); const restartRef=useRef<HTMLButtonElement>(null); const acknowledgementRef=useRef<HTMLElement>(null); const composing=useRef(false); const recorded=useRef<TimedSession|null>(null); const actionLock=useRef(false)
  const target=active.mode==='timed' ? (timed ? activeDeck.find((q)=>q.id===currentQuestionId(timed)) : undefined) : practice.deck[practice.index]
  const state=target ? active.mode==='timed' ? timedStates[target.id]??blank() : practiceState : blank()
  const complete=active.mode==='timed' ? Boolean(timed&&isTimedSessionComplete(timed)) : isComplete(practice)
  const scope=useMemo(()=>({ quizId:'border-countries', filters:{ continent:active.continent,difficulty:active.difficulty,orientation:'1' }, dataVersion:BORDER_DATA_VERSION }),[active])
  useEffect(()=>{ if(active.mode!=='timed'||!timed||isTimedSessionComplete(timed)) return; const id=window.setInterval(()=>setNow(performance.now()),250); return()=>window.clearInterval(id) },[active.mode,timed])
  useEffect(()=>{ if(acknowledgement)return; if(target&&!complete&&!state.complete&&!state.revealed) window.setTimeout(()=>inputRef.current?.focus(),0); if(state.complete||state.revealed) window.setTimeout(()=>nextRef.current?.focus(),0); if(complete) window.setTimeout(()=>restartRef.current?.focus(),0) },[acknowledgement,target,complete,state.complete,state.revealed])
  useEffect(()=>{ if(acknowledgement) window.setTimeout(()=>acknowledgementRef.current?.focus(),0) },[acknowledgement])
  useEffect(()=>{ if(!acknowledgement) actionLock.current=false },[acknowledgement,timed])
  useEffect(()=>{ if(!timed||!isTimedSessionComplete(timed)||recorded.current===timed) return; recorded.current=timed; const outcome=timedSessionOutcome(timed); setScores(recordScoreboardEntry(getStorage(),scope,{ durationMs:Math.round(elapsedTimedSessionMs(timed,performance.now())),correctCount:outcome.correctCount,revealedCount:outcome.revealedCount,totalCount:outcome.totalCount,completedAt:new Date().toISOString(),dataVersion:BORDER_DATA_VERSION })) },[scope,timed])
  function begin(config: Config) { const deck=fixture ? [fixture.question] : questionFactory(config.difficulty,config.continent,runRandom); if(!deck.length)return; const effectiveConfig=fixture?.config ?? config; actionLock.current=false; setAcknowledgement(null); setActive(effectiveConfig); setActiveDeck(deck); setPractice(startQuiz(deck,runRandom)); setPracticeState(blank()); setTimedStates({}); setPresentationEpoch(value=>value+1); setFeedback(initialFeedback(effectiveConfig.difficulty)); if(effectiveConfig.mode==='timed'){ const session=startTimedSession(deck.map(q=>q.id),performance.now(),runRandom); recorded.current=null; setTimed(session); setScores(readScoreboard(getStorage(),{ quizId:'border-countries',filters:{continent:effectiveConfig.continent,difficulty:effectiveConfig.difficulty,orientation:'1'},dataVersion:BORDER_DATA_VERSION })) } else setTimed(null) }
  function update(next: (old: State)=>State) { if(!target)return; if(active.mode==='timed')setTimedStates(old=>({...old,[target.id]:next(old[target.id]??blank())}));else setPracticeState(next) }
  function done(kind:'correct'|'reveal') { if(active.mode==='timed'&&timed)setTimed(transitionTimedSession(timed,kind==='correct'?'correct':'reveal',performance.now())) }
  function submit(value: string, timedMode=false) {
    if(!target||state.complete||state.revealed||(timedMode&&actionLock.current))return
    const required=target.difficulty==='easy'?[target.answerCode!]:target.codes
    const alreadyDisclosed=target.difficulty==='hard'&&!timedMode ? [...state.found,...state.hard.revealedCodes] : state.found
    const match=matchNeighbourAnswer(value,required,alreadyDisclosed,studyEntities,{timed:timedMode})
    if(match.status==='correct-new') {
      const found=[...state.found,match.entity.code]
      const hard=target.difficulty==='hard'&&!timedMode ? discloseCorrect(state.hard,match.entity.code) : state.hard
      const finished=target.difficulty==='hard'&&!timedMode ? isHardPracticeComplete(hard,target.codes) : found.length===required.length
      update(old=>({...old,value:'',found,hard,complete:finished}))
      setFeedback(finished ? timedMode ? 'Correct. Next border.' : target.difficulty==='easy' || hardPracticeCountsCorrect(hard,target.codes) ? 'Correct. Continue when you are ready.' : 'Both countries are shown. Continue when you are ready.' : `${match.entity.name} accepted. One country remains.`)
      if(finished&&timedMode){actionLock.current=true;done('correct')}
      window.setTimeout(()=>inputRef.current?.focus(),0); return
    }
    if(timedMode&&match.status==='invalid')return
    const message=match.status==='duplicate'?'That country is already recorded.':match.status==='known-non-neighbour'?'That country does not answer this border.':'No new country recognized. Try again.'
    setFeedback(message); update(old=>({...old,value})); window.setTimeout(()=>inputRef.current?.select(),0)
  }
  function rejectRepeat(event: KeyboardEvent<HTMLButtonElement>) { if(event.repeat) event.preventDefault() }
  function reveal(event?: MouseEvent<HTMLButtonElement>){ if(event&&event.detail>1||!target||(active.mode==='timed'&&actionLock.current))return; if(active.mode==='timed') actionLock.current=true; if(target.difficulty==='hard'&&active.mode==='practice') { const hard=revealAllHardEndpoints(state.hard,target.codes); update(old=>({...old,hard,revealed:true,complete:isHardPracticeComplete(hard,target.codes),value:''})); setFeedback('Answers revealed. Continue when you are ready.'); return } update(old=>({...old,revealed:true,complete:true,value:''})); setFeedback('Answer revealed. Continue when you are ready.'); if(active.mode==='timed'){ setAcknowledgement(target); done('reveal') } }
  function revealOne(event?: MouseEvent<HTMLButtonElement>){ if(event&&event.detail>1||!target||target.difficulty!=='hard'||active.mode!=='practice'||state.complete||state.hard.revealOneUsed||actionLock.current)return; actionLock.current=true; const hard=revealOneHardEndpoint(state.hard,target.codes); const completeHard=isHardPracticeComplete(hard,target.codes); update(old=>({...old,hard,complete:completeHard,value:''})); setFeedback(completeHard?'Both countries are shown. Continue when you are ready.':'One country is shown. Name the remaining country.'); window.setTimeout(()=>{actionLock.current=false;if(completeHard)nextRef.current?.focus();else inputRef.current?.focus()},0) }
  function next(){ if(!target)return; if(active.mode==='timed') return; const countsCorrect=target.difficulty==='hard'?hardPracticeCountsCorrect(state.hard,target.codes):!state.revealed; actionLock.current=false; setPractice(old=>advanceQuiz(old,countsCorrect)); setPracticeState(blank()); setPresentationEpoch(value=>value+1); setFeedback(active.difficulty==='hard'?'Name both countries sharing this border.':'Name the country on the other side of the highlighted border.') }
  const count=questionFactory(draft.difficulty,draft.continent,()=>0).length
  const heading=target?.difficulty==='hard'?'Which countries share this border?':target ? `Which country borders ${borderEntity(target.knownCode!)?.name}?` : 'Border challenge'
  if (acknowledgement && active.mode === 'timed') return <main className="app-shell quiz-active-shell border-quiz-shell"><section ref={acknowledgementRef} className="completion-card border-reveal-acknowledgement" tabIndex={-1} role="region" aria-label="Answers revealed"><p className="eyebrow">Revealed</p><h1>Answers revealed</h1><p>{acknowledgement.codes.map(code=>borderEntity(code)?.name).join(' and ')}</p><p className="feedback revealed" role="status">Revealed answers do not count as correct.</p><button className="primary-button" type="button" onKeyDown={rejectRepeat} onClick={(event)=>{if(event.detail>1||!actionLock.current)return;actionLock.current=false;setAcknowledgement(null);window.setTimeout(()=>{if(timed&&isTimedSessionComplete(timed))restartRef.current?.focus();else inputRef.current?.focus()},0)}}>Continue</button></section></main>
  if(complete) { const outcome=active.mode==='timed'&&timed?timedSessionOutcome(timed):undefined; return <main className="app-shell quiz-active-shell border-quiz-shell"><header className="masthead"><div><p className="eyebrow">Border quiz</p><h1>{active.mode==='timed'?'Timed run complete':'Deck complete'}</h1></div></header><section className="completion-card">{outcome?<p className="score-number">{clock(elapsedTimedSessionMs(timed!,performance.now()))}<span>{outcomeText(outcome)}</span></p>:<p className="score-number">{practice.correct}<span>correct</span></p>}<button ref={restartRef} className="primary-button" type="button" onClick={()=>begin(active)}>{active.mode==='timed'?'Restart timed run':'Start a fresh deck'}</button>{active.mode==='timed'&&<section className="scoreboard" aria-label="Local scoreboard"><h2>Local scoreboard</h2>{scores.length?<ol>{scores.map((score,index)=><li key={`${score.completedAt}-${index}`}>{clock(score.durationMs)} · {outcomeText(score)}</li>)}</ol>:<p>No stored timed results yet.</p>}</section>}</section></main> }
  const disclosedHardCountries: readonly BorderContextCountry[] = target?.difficulty==='hard'&&active.mode==='practice' ? target.codes.flatMap(code=>{const status=hardDisclosureFor(state.hard,code); if(!status)return []; const entity=borderEntity(code), shape=entity?borderShape(code,target.source):undefined; return entity&&shape?[{name:entity.name,geometry:borderContextGeometry(shape),status}]:[]}) : []
  const easyCountries: readonly BorderContextCountry[] = target?.difficulty==='easy' ? (()=>{const known=borderEntity(target.knownCode!);const knownShape=borderShape(target.knownCode!,target.source);const answer=state.complete||state.revealed?borderEntity(target.answerCode!):undefined;const answerShape=answer?borderShape(target.answerCode!,target.source):undefined;return known&&knownShape?[{name:known.name,geometry:borderContextGeometry(knownShape),status:'known' as const},...(answer&&answerShape?[{name:answer.name,geometry:borderContextGeometry(answerShape),status:state.revealed?'revealed' as const:'correct' as const}]:[])]:[]})() : []
  // Four distinct per-card stages prevent an answer/reveal/restart refit from
  // colliding with a prior manually focused section: Easy 0/1, Hard 0/1/2.
  const contextRefitEpoch=presentationEpoch*4+(target?.difficulty==='easy'?Number(state.complete||state.revealed):disclosedHardCountries.length)
  return <main className="app-shell quiz-active-shell border-quiz-shell"><header className="masthead"><div><p className="eyebrow">Border quiz</p><h1>Country borders</h1></div><div className="timed-summary">{active.mode==='timed'&&timed&&<p className="timer">Time {clock(elapsedTimedSessionMs(timed,now))}</p>}<p className="progress"><span>{active.mode==='timed'&&timed?timed.pendingQuestionIds.length:Math.max(0,practice.deck.length-practice.index)} remaining</span><strong>{active.difficulty==='hard'?'Hard':'Easy'} · {active.continent}</strong></p></div></header>
    <section className="setup-card" aria-label="Border quiz setup"><h2>Run setup</h2><fieldset className="setup-fieldset"><legend>Mode</legend>{(['practice','timed'] as const).map(mode=><label className="choice-label" key={mode}><input name="border-mode" type="radio" checked={draft.mode===mode} onChange={()=>setDraft(old=>({...old,mode}))}/>{mode==='practice'?'Practice':'Timed'}</label>)}</fieldset><fieldset className="setup-fieldset"><legend>Difficulty</legend>{(['easy','hard'] as const).map(difficulty=><label className="choice-label" key={difficulty}><input name="border-difficulty" type="radio" checked={draft.difficulty===difficulty} onChange={()=>setDraft(old=>({...old,difficulty}))}/>{difficulty==='easy'?'Easy':'Hard'}</label>)}</fieldset><label htmlFor="border-continent">Continent</label><select id="border-continent" name="border-continent" value={draft.continent} onChange={event=>setDraft(old=>({...old,continent:event.target.value as BorderContinent}))}>{borderContinents.map(continent=><option key={continent}>{continent}</option>)}</select><p className="setup-note">{count} borders. {borderSetupNote(draft.difficulty,draft.continent)}</p><button className="secondary-button" type="button" onClick={()=>begin(draft)}>{draft.mode==='timed'?'Start timed run':'Start / restart practice'}</button></section>
    {target&&<section className={`country-capital-card border-question-card border-question-card--${target.difficulty}${disclosedHardCountries.length?' border-question-card--context':''}${state.revealed||state.hard.revealedCodes.length?' border-revealed':''}${state.complete&&!state.revealed&&!state.hard.revealedCodes.length?' border-correct':''}`} aria-labelledby="border-question-title">{target.difficulty==='easy'?<EasyBorderContextMap key={target.id} runs={target.runs} countries={easyCountries} recenterEpoch={contextRefitEpoch}/>:disclosedHardCountries.length?<EasyBorderContextMap key={target.id} runs={target.runs} countries={disclosedHardCountries} recenterEpoch={contextRefitEpoch}/>:<BorderLineImage question={target}/>}<p className="border-source"><a href={`${import.meta.env.BASE_URL}border-data-sources.html`}>Border data sources</a></p><h2 id="border-question-title">{heading}</h2><p className="country-capital-instruction">{target.difficulty==='hard'?'Type each country in any order.':'Type the other country sharing the marked land border.'}</p>{state.found.length>0&&<ul className="border-answer-chips" aria-label="Answered countries">{state.found.map(code=><li key={code}>{borderEntity(code)?.name} <span className="border-chip-status">Correct</span></li>)}</ul>}{state.hard.revealedCodes.length>0&&<ul className="border-answer-chips border-revealed-chips" aria-label="Revealed countries">{state.hard.revealedCodes.map(code=><li key={code}>{borderEntity(code)?.name} <span className="border-chip-status">Revealed</span></li>)}</ul>}{state.revealed&&target.difficulty==='easy'&&<p className="border-reveal-answer">{target.codes.map(code=>borderEntity(code)?.name).join(' and ')}</p>}<form className="border-answer-form" onSubmit={event=>{event.preventDefault();submit(state.value,active.mode==='timed')}}><label htmlFor="border-answer">{target.difficulty==='hard'?'Country':'Other country'}</label><input ref={inputRef} id="border-answer" value={state.value} disabled={state.complete||state.revealed} autoComplete="off" onCompositionStart={()=>{composing.current=true}} onCompositionEnd={(event)=>{composing.current=false;if(active.mode==='timed')submit(event.currentTarget.value,true)}} onChange={(event:ChangeEvent<HTMLInputElement>)=>{update(old=>({...old,value:event.target.value}));if(active.mode==='timed'&&!composing.current)submit(event.target.value,true)}}/><div className="country-capital-actions border-answer-actions">{active.mode==='practice'&&!state.complete&&!state.revealed&&<button className="primary-button" type="submit">Check answer</button>}{target.difficulty==='hard'&&active.mode==='practice'&&!state.complete&&!state.hard.revealOneUsed&&<button className="text-button" type="button" onKeyDown={rejectRepeat} onClick={revealOne}>Reveal one country</button>}{!state.complete&&!state.revealed&&<button className="text-button" type="button" onKeyDown={rejectRepeat} onClick={reveal}>Reveal answer{target.difficulty==='hard'?'s':''}</button>}{active.mode==='timed'&&!state.complete&&!state.revealed&&<button className="text-button" type="button" onKeyDown={rejectRepeat} onClick={(event)=>{if(event.detail>1||!timed||actionLock.current)return;actionLock.current=true;const sole=timed.pendingQuestionIds.length===1;setTimed(transitionTimedSession(timed,'skip',performance.now()));setFeedback(sole?'Skipped. This is the only pending border.':'Skipped. It will return after the other pending borders.');window.setTimeout(()=>inputRef.current?.focus(),0)}}>Skip</button>}{(state.complete||state.revealed)&&active.mode==='practice'&&<button ref={nextRef} className="primary-button" type="button" onKeyDown={rejectRepeat} onClick={next}>Next border</button>}</div></form><p className={`feedback ${state.revealed||state.hard.revealedCodes.length?'revealed':state.complete?'correct':''}`} role="status" aria-live="polite">{feedback}</p></section>}</main>
}
export default BorderCountriesQuiz
