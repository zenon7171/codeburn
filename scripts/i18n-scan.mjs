import ts from 'typescript'

const DISPLAY_KEYS = new Set([
  'label', 'title', 'body', 'description', 'subtitle', 'caption', 'footer',
  'prompt', 'message', 'note', 'hint', 'delta', 'empty', 'subject', 'text',
  'aria-label', 'ariaLabel', 'placeholder', 'alt',
])
const MACHINE_TEXT = [
  /^(https?:\/\/|github\.com\/)/i,
  /^[-a-z0-9_.@/:#]+$/i,
  /^(var\(|rgb\(|hsl\(|calc\()/,
  /^(npm|npx|pnpm|bunx|codeburn|git|gh)\s/i,
  /^[a-z0-9_-]+(?:\s+[a-z0-9_-]+)+$/,
]

export function normalize(value) {
  return value.replace(/\s+/g, ' ').trim()
}

/** Parse whole files so JSX line breaks, apostrophes and templates survive. */
export function scanSource(file, source) {
  const ast = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true)
  const rows = []
  const lines = source.split('\n')
  function add(node, raw, explicit) {
    const text = normalize(raw)
    const line = ast.getLineAndCharacterOfPosition(node.getStart(ast)).line + 1
    if (lines[line - 1]?.includes('i18n-ignore')) return
    if (!/[A-Za-z]/.test(text) || text.length < 2) return
    if (!explicit && MACHINE_TEXT.some(pattern => pattern.test(text))) return
    rows.push({ text, line })
  }
  function displayContext(node) {
    let parent = node.parent
    // Strings inside ternaries/JSX expressions retain their visible context.
    while (parent && (ts.isParenthesizedExpression(parent) || ts.isConditionalExpression(parent))) parent = parent.parent
    if (parent && ts.isJsxExpression(parent)) {
      return !ts.isJsxAttribute(parent.parent) || DISPLAY_KEYS.has(parent.parent.name.getText(ast))
    }
    return parent && (ts.isJsxAttribute(parent) || ts.isPropertyAssignment(parent))
      && DISPLAY_KEYS.has(parent.name.getText(ast).replace(/^['"]|['"]$/g, ''))
  }
  function visit(node) {
    if (ts.isJsxText(node)) add(node, node.text, true)
    else if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) {
      // Ignore import paths, object keys and explicitly non-display attributes.
      if (ts.isImportDeclaration(node.parent) || ts.isExportDeclaration(node.parent)) return
      if (ts.isPropertyAssignment(node.parent) && node.parent.name === node) return
      if (ts.isJsxAttribute(node.parent) && !DISPLAY_KEYS.has(node.parent.name.getText(ast))) return
      add(node, node.text, displayContext(node))
    } else if (ts.isTemplateExpression(node)) {
      const text = node.head.text + node.templateSpans.map(span => '${…}' + span.literal.text).join('')
      add(node, text, displayContext(node))
    }
    ts.forEachChild(node, visit)
  }
  visit(ast)
  return rows
}
