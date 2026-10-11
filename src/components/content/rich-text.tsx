import type { ReactNode } from 'react'

/**
 * Renders the admin-editable content format safely (no HTML is ever injected):
 * blank line = paragraph, "## " = heading, "- " = list item.
 */
export function RichText({ body }: { body: string }) {
  const blocks = body.replace(/\r\n/g, '\n').split(/\n{2,}/)
  const out: ReactNode[] = []
  blocks.forEach((block, i) => {
    const lines = block.split('\n').map((l) => l.trim()).filter(Boolean)
    if (!lines.length) return
    if (lines.every((l) => l.startsWith('- '))) {
      out.push(
        <ul key={i}>
          {lines.map((l, j) => <li key={j}>{l.slice(2)}</li>)}
        </ul>,
      )
      return
    }
    lines.forEach((line, j) => {
      const key = `${i}-${j}`
      if (line.startsWith('## ')) out.push(<h2 key={key}>{line.slice(3)}</h2>)
      else if (line.startsWith('- ')) out.push(<ul key={key}><li>{line.slice(2)}</li></ul>)
      else out.push(<p key={key}>{line}</p>)
    })
  })
  return <div className="prose-partivo">{out}</div>
}

/** Splits "## Question\nAnswer" sections into FAQ items. */
export function parseFaq(body: string) {
  return body
    .replace(/\r\n/g, '\n')
    .split(/^## /m)
    .map((s) => s.trim())
    .filter(Boolean)
    .map((section) => {
      const [question, ...rest] = section.split('\n')
      return { question: question.trim(), answer: rest.join('\n').trim() }
    })
}
