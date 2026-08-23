import { describe, expect, it } from 'vitest'
import { flagSvgSafetyIssue } from './flagSvgSafety'

const safe = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 3 2"><g fill="#fff"><path d="M0 0h3v2H0z"/><circle cx="1" cy="1" r=".5"/></g></svg>'

describe('flag SVG safety policy', () => {
  it('accepts nested geometry from the vendored subset', () => expect(flagSvgSafetyIssue(safe)).toBeNull())
  it('accepts multi-command, arc, and exponent path data', () => expect(flagSvgSafetyIssue('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 3 2"><path d="M0 0 L1e0 1 A1 2 0 0 1 2 1 Z"/></svg>')).toBeNull())
  it.each(['M0,1L2,3', 'M0, 1 2,3', 'M0 -1.5e-2L2 3'])('accepts legal comma-wsp path data: %s', (d) => expect(flagSvgSafetyIssue(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 3 2"><path d="${d}"/></svg>`)).toBeNull())
  it.each([
    '<!DOCTYPE svg><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1 1"/>',
    '<?xml-stylesheet href="https://example.test/x"?><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1 1"/>',
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1 1"><!-- bypass --></svg>',
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1 1"><path href="/x"/></svg>',
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1 1"><path href=javascript:alert(1)/></svg>',
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1 1"><path style="fill:url(x)"/></svg>',
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1 1"/><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1 1"/>',
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1 1"></svg>trailing',
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1 1"><path d="M0"</svg>',
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1 1"><foreignObject/></svg>',
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1 1"><path onclick="x"/></svg>',
    '<svg xmlns="http://www.w3.org/2000/svg" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1 1"><path d="M0"/></svg>',
    '<svg viewBox="0 0 1 1"><path d="M0"/></svg>',
    '<svg xmlns="http://www.w3.org/2000/svg"><path d="M0"/></svg>',
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0"><path d="M0"/></svg>',
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 Infinity 1"><path d="M0"/></svg>',
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 -1 1"><path d="M0"/></svg>',
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1 1" d="M0"><path d="M0"/></svg>',
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1 1"><path xmlns="http://www.w3.org/2000/svg" d="M0"/></svg>',
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1 1"><path d="M0" class="timestamp"/></svg>',
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1 1"><path d="M0" fill="#fff" fill="#000"/></svg>',
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1 1"><path d="1 2"/></svg>',
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1 1"><path d="M0 E1"/></svg>',
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1 1"><path d="M0 0 A-1 1 0 0 1 1 1"/></svg>',
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1 1"><path d="M0 0 A1 1 0 2 1 1 1"/></svg>',
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1 1"><circle cx="0" cy="0" r="-1"/></svg>',
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1 1"><ellipse cx="0" cy="0" rx="1" ry="1"></ellipse></svg>',
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1 1"><path d=",M0 0"/></svg>',
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1 1"><path d="M,0 0"/></svg>',
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1 1"><path d="M0,,0"/></svg>',
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1 1"><path d="M0 0,"/></svg>',
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1 1"><path d="M0 0,L1 1"/></svg>',
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1 1"><path d="M0 0 Z,"/></svg>',
  ])('rejects unsafe input: %s', (svg) => expect(flagSvgSafetyIssue(svg)).not.toBeNull())
})
