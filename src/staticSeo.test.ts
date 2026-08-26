import { createHash } from 'node:crypto'
import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { quizRoutes, routeMetadata } from './appRoute'

const root = process.cwd()
const htmlFileForRoute = {
  'capital-map': 'index.html',
  'country-capital': 'country-capital/index.html',
  'shape-capital': 'shape-capital/index.html',
  'shape-neighbours': 'shape-neighbours/index.html',
  'shape-high-point': 'shape-high-point/index.html',
  'flag-country': 'flag-country/index.html',
  'border-countries': 'border-countries/index.html',
} as const

describe('static search-discovery inputs', () => {
  it('gives each canonical quiz entry its route metadata in initial HTML', () => {
    for (const route of quizRoutes) {
      const html = readFileSync(resolve(root, htmlFileForRoute[route]), 'utf8')
      const metadata = routeMetadata[route]
      expect(html).toContain(`<title>${metadata.title}</title>`)
      expect(html).toContain(`<meta name="description" content="${metadata.description}" />`)
      expect(html).toContain(`<link rel="canonical" href="${metadata.canonicalUrl}" />`)
      expect(html).toContain('<meta name="theme-color" content="#101b2d" />')
      expect(html).toContain('<meta name="viewport"')
      expect(html).toContain('href="/favicon.svg"')
      expect(html).toContain('<script type="module" src="/src/main.tsx"></script>')
    }
  })

  it('lists exactly the seven canonical URLs in the sitemap and provides a noindex static 404', () => {
    const sitemap = readFileSync(resolve(root, 'public/sitemap.xml'), 'utf8')
    const urls = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => match[1])
    expect(urls).toEqual(quizRoutes.map((route) => routeMetadata[route].canonicalUrl))

    const notFound = readFileSync(resolve(root, '404.html'), 'utf8')
    expect(notFound).toContain('<meta name="robots" content="noindex,follow" />')
    expect(notFound).not.toContain('rel="canonical"')
    expect(existsSync(resolve(root, 'public/robots.txt'))).toBe(false)
  })

  it('keeps the Google verification file as the downloaded static asset', () => {
    const verification = readFileSync(resolve(root, 'public/googlec03ec2831890bfc2.html'))
    expect(verification.toString('utf8')).toBe('google-site-verification: googlec03ec2831890bfc2.html')
    expect(createHash('sha256').update(verification).digest('hex')).toBe('6d4bfd0fa78223431ab507359d2c931c4486476d6f00468b26d70027b7c3efb5')
  })

  it('keeps every static entry and its assets base-path-safe in the Vite inputs', () => {
    const viteConfig = readFileSync(resolve(root, 'vite.config.ts'), 'utf8')
    expect(viteConfig).toContain("base: '/geoquiz/'")
    for (const route of quizRoutes) {
      const html = readFileSync(resolve(root, htmlFileForRoute[route]), 'utf8')
      expect(html).toContain('href="/favicon.svg"')
      expect(html).toContain('src="/src/main.tsx"')
    }
  })

  it('keeps every quiz component behind its lazy import boundary', () => {
    const app = readFileSync(resolve(root, 'src/App.tsx'), 'utf8')
    const lazyQuizImports = [
      ['CapitalMapQuiz', './quizzes/capital-map/CapitalMapQuiz'],
      ['CountryCapitalQuiz', './quizzes/country-capital/CountryCapitalQuiz'],
      ['ShapeCapitalQuiz', './quizzes/shape-capital/ShapeCapitalQuiz'],
      ['ShapeNeighboursQuiz', './quizzes/shape-neighbours/ShapeNeighboursQuiz'],
      ['ShapeHighPointQuiz', './quizzes/shape-high-point/ShapeHighPointQuiz'],
      ['FlagCountryQuiz', './quizzes/flag-country/FlagCountryQuiz'],
      ['BorderCountriesQuiz', './quizzes/border-countries/BorderCountriesQuiz'],
    ] as const
    for (const [name, path] of lazyQuizImports) expect(app).toContain(`const ${name} = lazy(() => import('${path}'))`)
  })
})
