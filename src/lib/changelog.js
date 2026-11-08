// The "On test" lines of CHANGELOG.md, each as [area, what], split at its first colon.
export const onTest = md => (md.split(/^## On test\s*$/m)[1] || '').split(/^## /m)[0]
  .split('\n').filter(l => l.startsWith('- ')).map(l => {
    const t = l.slice(2).trim(), i = t.indexOf(':')
    return i < 0 ? ['', t] : [t.slice(0, i), t.slice(i + 1).trim()]
  })
