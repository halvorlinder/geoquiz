const allowedAttributes: Record<string, Set<string>> = {
  svg: new Set(['xmlns', 'viewBox']),
  path: new Set(['class', 'clip-rule', 'd', 'fill', 'fill-rule', 'stroke', 'stroke-linejoin', 'stroke-miterlimit', 'stroke-width']),
  g: new Set(['fill', 'opacity', 'stroke', 'stroke-miterlimit', 'stroke-width']),
  circle: new Set(['cx', 'cy', 'fill', 'r', 'stroke', 'stroke-miterlimit', 'stroke-width']),
  ellipse: new Set(['cx', 'cy', 'fill', 'rx', 'ry', 'stroke', 'stroke-width']),
}
const numeric = /^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?$/i
const numericList = new RegExp(`^${numeric.source.slice(1, -1)}(?:[ ,]+${numeric.source.slice(1, -1)})*$`, 'i')
const pathArity: Record<string, number> = { M: 2, L: 2, H: 1, V: 1, C: 6, S: 4, Q: 4, T: 2, A: 7, Z: 0 }

function validPath(value: string): boolean {
  const trimmed = value.trim()
  if (!trimmed || /^,|,\s*$|,\s*,|,\s*[A-Za-z]|[A-Za-z]\s*,/.test(trimmed)) return false
  let index = 0
  let command = ''
  let first = true
  while (index < value.length) {
    while (/[\s,]/.test(value[index] ?? '')) index += 1
    if (index >= value.length) break
    if (/[A-Za-z]/.test(value[index])) {
      command = value[index]
      index += 1
      if (!(command.toUpperCase() in pathArity) || first && command.toUpperCase() !== 'M') return false
      if (command.toUpperCase() === 'Z') { first = false; continue }
    } else if (!command || command.toUpperCase() === 'Z') return false
    const values: number[] = []
    while (index < value.length) {
      while (/[\s,]/.test(value[index] ?? '')) index += 1
      if (index >= value.length || /[A-Za-z]/.test(value[index])) break
      const match = /^[+-]?(?:(?:\d+\.\d*)|(?:\.\d+)|\d+)(?:[eE][+-]?\d+)?/.exec(value.slice(index))
      if (!match) return false
      const number = Number(match[0])
      if (!Number.isFinite(number)) return false
      values.push(number)
      index += match[0].length
    }
    const upper = command.toUpperCase()
    const arity = pathArity[upper]
    if (!values.length || values.length % arity !== 0) return false
    if (upper === 'A') for (let offset = 0; offset < values.length; offset += 7) if (values[offset] < 0 || values[offset + 1] < 0 || ![0, 1].includes(values[offset + 3]) || ![0, 1].includes(values[offset + 4])) return false
    first = false
  }
  return !first
}

function attributeIsSafe(element: string, name: string, value: string): boolean {
  if (!allowedAttributes[element]?.has(name) || /^(?:on|href|xlink:href|style)$/i.test(name) || /[<>&]|url\s*\(|\b(?:date|timestamp|random)\b/i.test(value)) return false
  if (name === 'xmlns') return value === 'http://www.w3.org/2000/svg'
  if (name === 'viewBox') return numericList.test(value)
  if (name === 'd') return validPath(value)
  if (['cx', 'cy', 'r', 'rx', 'ry', 'stroke-width', 'stroke-miterlimit', 'opacity'].includes(name)) {
    const number = Number(value)
    if (!numeric.test(value) || !Number.isFinite(number)) return false
    if (['r', 'rx', 'ry', 'stroke-width', 'stroke-miterlimit'].includes(name) && number < 0) return false
    return name !== 'opacity' || number >= 0 && number <= 1
  }
  if (name === 'fill' || name === 'stroke') return /^(?:#[0-9a-f]{3,8}|none|transparent|[a-z]+)$/i.test(value)
  if (name === 'fill-rule' || name === 'clip-rule') return value === 'evenodd' || value === 'nonzero'
  if (name === 'stroke-linejoin') return value === 'miter' || value === 'round' || value === 'bevel'
  return /^[A-Za-z0-9_-]+$/.test(value)
}

function parseAttributes(element: string, source: string): { issue: string | null; names: Set<string> } {
  let index = 0
  const names = new Set<string>()
  while (index < source.length) {
    const whitespace = /^\s+/.exec(source.slice(index))
    if (!whitespace) return { issue: 'malformed attribute spacing', names }
    index += whitespace[0].length
    const match = /^([A-Za-z_:][A-Za-z0-9:_.-]*)\s*=\s*(["'])([^"']*)\2/.exec(source.slice(index))
    if (!match) return { issue: 'malformed or unquoted attribute', names }
    if (names.has(match[1])) return { issue: `duplicate attribute ${match[1]}`, names }
    names.add(match[1])
    if (!attributeIsSafe(element, match[1], match[3])) return { issue: `unsafe attribute ${match[1]}`, names }
    index += match[0].length
  }
  return { issue: null, names }
}

/** Strict parser for the compact, dependency-free SVG subset we vendor. */
export function flagSvgSafetyIssue(content: string): string | null {
  if (/<!|<\?|<!--|<!\[CDATA\[/i.test(content)) return 'contains disallowed XML declaration, DTD, entity, comment, or CDATA'
  let cursor = 0
  const stack: string[] = []
  let roots = 0
  let geometry = 0
  for (const match of content.matchAll(/<[^>]*>/g)) {
    const before = content.slice(cursor, match.index)
    if (before.trim()) return 'contains text content'
    const token = match[0]
    cursor = (match.index ?? 0) + token.length
    const close = /^<\/([A-Za-z][A-Za-z0-9:-]*)\s*>$/.exec(token)
    if (close) {
      if (stack.pop() !== close[1]) return 'has unbalanced closing tags'
      continue
    }
    const open = /^<([A-Za-z][A-Za-z0-9:-]*)([^<>]*?)(\/?)>$/.exec(token)
    if (!open || open[3] === '/' && open[2].endsWith(' ')) return 'has malformed tags'
    const [, name, attributeSource, selfClosing] = open
    if (!allowedAttributes[name]) return `uses disallowed element ${name}`
    const attributes = parseAttributes(name, attributeSource)
    if (attributes.issue) return attributes.issue
    if (name === 'svg') {
      roots += 1
      if (roots !== 1 || stack.length !== 0 || selfClosing) return 'must have exactly one nonempty SVG root'
      if (attributes.names.size !== 2 || !attributes.names.has('xmlns') || !attributes.names.has('viewBox')) return 'root must have exactly xmlns and viewBox'
      const values = attributeSource.match(/viewBox\s*=\s*["']([^"']+)["']/)?.[1].trim().split(/[ ,]+/).map(Number)
      if (!values || values.length !== 4 || values.some((value) => !Number.isFinite(value)) || values[2] <= 0 || values[3] <= 0) return 'root viewBox must have four finite values and positive size'
    } else if (roots !== 1 || stack.length === 0 || !['svg', 'g'].includes(stack.at(-1) ?? '')) return 'geometry is outside an allowed container'
    if (name === 'path' && !attributes.names.has('d')) return 'path needs d'
    if (name === 'circle' && !['cx', 'cy', 'r'].every((attribute) => attributes.names.has(attribute))) return 'circle needs cx, cy, and r'
    if (name === 'ellipse' && !['cx', 'cy', 'rx', 'ry'].every((attribute) => attributes.names.has(attribute))) return 'ellipse needs cx, cy, rx, and ry'
    if ((name === 'path' || name === 'circle' || name === 'ellipse') && !selfClosing) return `${name} must be a self-closing leaf`
    if (!selfClosing) stack.push(name)
    if (name === 'path' || name === 'circle' || name === 'ellipse') geometry += 1
  }
  if (content.slice(cursor).trim()) return 'contains trailing text content'
  if (roots !== 1 || stack.length !== 0) return 'has missing or unbalanced root tags'
  if (!geometry) return 'contains no geometry'
  return null
}
