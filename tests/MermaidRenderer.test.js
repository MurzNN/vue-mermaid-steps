import { afterEach, describe, expect, it, vi } from 'vitest'
import { enableAutoUnmount, flushPromises, mount } from '@vue/test-utils'
import mermaid from 'mermaid'
import MermaidRenderer from '../src/MermaidRenderer.vue'

enableAutoUnmount(afterEach)

vi.mock('mermaid', () => ({
  default: {
    initialize: vi.fn(),
    render: vi.fn(async (id, source) => ({
      svg: `<svg id="${id}">${source}</svg>`,
      bindFunctions: vi.fn(),
    })),
  },
}))

function deferred() {
  let resolve
  const promise = new Promise(done => (resolve = done))
  return { promise, resolve }
}

describe('MermaidRenderer', () => {
  it('renders the source with merged options and emits rendered', async () => {
    const wrapper = mount(MermaidRenderer, {
      props: { value: 'flowchart TD\n  A --> B', options: { theme: 'dark' } },
    })
    await flushPromises()
    expect(mermaid.initialize).toHaveBeenLastCalledWith({
      securityLevel: 'loose',
      theme: 'dark',
      startOnLoad: false,
    })
    const [id, source] = mermaid.render.mock.lastCall
    expect(id).toMatch(/^vue-mermaid-steps-[\w-]+-1$/)
    expect(source).toBe('flowchart TD\n  A --> B')
    expect(wrapper.find('svg').attributes('id')).toBe(id)
    const { bindFunctions } = await mermaid.render.mock.results.at(-1).value
    expect(bindFunctions).toHaveBeenCalledWith(wrapper.element)
    expect(wrapper.emitted('rendered')).toHaveLength(1)
  })

  it('re-renders on value and option changes', async () => {
    const wrapper = mount(MermaidRenderer, { props: { value: 'graph TD\n  A' } })
    await flushPromises()
    await wrapper.setProps({ value: 'graph TD\n  B' })
    await flushPromises()
    expect(wrapper.find('svg').text()).toContain('B')
    await wrapper.setProps({ options: { theme: 'forest' } })
    await flushPromises()
    expect(mermaid.initialize).toHaveBeenLastCalledWith(expect.objectContaining({ theme: 'forest' }))
    expect(wrapper.emitted('rendered')).toHaveLength(3)
  })

  it('keeps the previous SVG on errors and emits parse-error', async () => {
    const wrapper = mount(MermaidRenderer, { props: { value: 'graph TD\n  A' } })
    await flushPromises()
    const error = new Error('Parse error')
    mermaid.render.mockImplementationOnce(async (id) => {
      document.body.insertAdjacentHTML('beforeend', `<div id="d${id}"></div>`)
      throw error
    })
    await wrapper.setProps({ value: 'invalid' })
    await flushPromises()
    expect(wrapper.emitted('parse-error')).toEqual([[error]])
    expect(wrapper.find('svg').text()).toContain('A')
    expect(document.querySelector('[id^="dvue-mermaid-steps"]')).toBeNull()
  })

  it('ignores stale renders that finish after a newer one', async () => {
    const wrapper = mount(MermaidRenderer, { props: { value: 'graph TD\n  A' } })
    await flushPromises()
    const slow = deferred()
    mermaid.render.mockImplementationOnce(() => slow.promise)
    await wrapper.setProps({ value: 'graph TD\n  Slow' })
    await flushPromises()
    expect(mermaid.render).toHaveBeenLastCalledWith(expect.any(String), 'graph TD\n  Slow')
    await wrapper.setProps({ value: 'graph TD\n  Fast' })
    await flushPromises()
    expect(wrapper.find('svg').text()).toContain('Fast')
    slow.resolve({ svg: '<svg>Slow</svg>' })
    await flushPromises()
    expect(wrapper.find('svg').text()).toContain('Fast')
  })

  it('does not render empty sources', async () => {
    mount(MermaidRenderer, { props: { value: '' } })
    await flushPromises()
    expect(mermaid.render).not.toHaveBeenCalled()
  })
})
