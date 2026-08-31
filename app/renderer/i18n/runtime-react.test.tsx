// @vitest-environment jsdom
import { cleanup, render, waitFor } from '@testing-library/react'
import { afterEach, expect, it } from 'vitest'
import { installJapaneseLocalization } from './runtime'

let dispose: (() => void) | undefined
afterEach(() => { dispose?.(); cleanup() })

it('keeps split React quota text correct through updates and removals', async () => {
  dispose = installJapaneseLocalization()
  if (document.readyState === 'loading') document.dispatchEvent(new Event('DOMContentLoaded'))
  await Promise.resolve()

  function Meter({ percent, reset }: { percent: number; reset?: string }) {
    return <p>{percent}% used{reset ? ` · resets ${reset}` : ''}</p>
  }
  const view = render(<Meter percent={90} reset="in 2h" />)
  await waitFor(() => expect(view.container.textContent).toBe('90%使用 · 2時間後にリセット'))
  view.rerender(<Meter percent={91} reset="in 1h 59m" />)
  await waitFor(() => expect(view.container.textContent).toBe('91%使用 · 1時間59分後にリセット'))
  view.rerender(<Meter percent={0} />)
  await waitFor(() => expect(view.container.textContent).toBe('0%使用'))
  view.unmount()
})
