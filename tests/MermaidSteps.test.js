import { afterEach, describe, expect, it, vi } from 'vitest'
import { enableAutoUnmount, flushPromises, mount } from '@vue/test-utils'
import mermaid from 'mermaid'
import MermaidSteps, { MermaidSteps as NamedComponent } from '../src/index'

enableAutoUnmount(afterEach)

const edgeIds = ['step1E', 'step2E', 'step2Eg', 'step2Eh', 'step3E', 'step3Eab', 'custom', 'L_A_B_0']

// Mirrors Mermaid 12 output: step classes on `g.node`, classDef styles inlined as `!important`,
// and edge path IDs prefixed with the SVG id.
function fixture(id) {
  const node = (name, cls = '', style = '') => `<g class="node default ${cls}" id="${id}-flowchart-${name}">`
    + `<rect class="basic label-container" style="${style}"/><g class="label"><text>${name}</text></g></g>`
  const edge = edgeId => `<path id="${id}-${edgeId}" class="flowchart-link" style="stroke-dasharray: 0 0 9 4;"/>`
  return `<svg id="${id}" xmlns="http://www.w3.org/2000/svg">
    <g class="edgePaths">${edgeIds.map(edge).join('')}</g>
    <g class="nodes">${node('Start')}${node('A', 'step1', 'fill:#dbeafe !important')}${node('B', 'step2')}${node('C', 'step3')}</g>
  </svg>`
}

vi.mock('mermaid', () => ({
  default: {
    initialize: vi.fn(),
    render: vi.fn(async id => ({ svg: fixture(id), bindFunctions: vi.fn() })),
  },
}))

const diagram = 'flowchart TD\n  A --> B'

async function createWrapper(props = {}) {
  const wrapper = mount(MermaidSteps, { props: { diagram, steps: 3, ...props } })
  await flushPromises()
  return wrapper
}

const shape = (wrapper, name) => wrapper.get(`[id$="-flowchart-${name}"] > rect`).element
const label = (wrapper, name) => wrapper.get(`[id$="-flowchart-${name}"] > .label`).element
const edge = (wrapper, edgeId) => wrapper.element.querySelector(`path[id$="-${edgeId}"]`)
const opacities = (wrapper, elements) => elements.map(element => element.style.opacity)
const nodeOpacities = wrapper => opacities(wrapper, ['A', 'B', 'C'].map(name => shape(wrapper, name)))
const edgeOpacities = wrapper => opacities(wrapper, ['step1E', 'step2E', 'step2Eg', 'step3E'].map(id => edge(wrapper, id)))

function expectUntouched(wrapper) {
  expect(shape(wrapper, 'Start').getAttribute('style')).toBe('')
  for (const id of ['step2Eh', 'step3Eab', 'custom', 'L_A_B_0']) {
    expect(edge(wrapper, id).getAttribute('style')).toBe('stroke-dasharray: 0 0 9 4;')
  }
}

describe('MermaidSteps', () => {
  it('exports the same component as default and named exports', () => {
    expect(NamedComponent).toBe(MermaidSteps)
  })

  it('renders the unchanged source with Mermaid defaults and emits rendered', async () => {
    const wrapper = await createWrapper()
    expect(mermaid.initialize).toHaveBeenCalledExactlyOnceWith({ startOnLoad: false })
    const [id, source] = mermaid.render.mock.lastCall
    expect(id).toMatch(/^mermaid-steps-[\w-]+-1$/)
    expect(source).toBe(diagram)
    expect(wrapper.get('svg').attributes('id')).toBe(id)
    const { bindFunctions } = await mermaid.render.mock.results[0].value
    expect(bindFunctions).toHaveBeenCalledWith(wrapper.element)
    expect(wrapper.emitted('rendered')).toHaveLength(1)
  })

  it('re-renders only when the diagram or option values change', async () => {
    const wrapper = await createWrapper({ options: { theme: 'dark' } })
    expect(mermaid.initialize).toHaveBeenLastCalledWith({ theme: 'dark', startOnLoad: false })
    await wrapper.setProps({ currentStep: 2, inactiveOpacity: 0.5, options: { theme: 'dark' } })
    await flushPromises()
    expect(mermaid.render).toHaveBeenCalledTimes(1)

    await wrapper.setProps({ options: { theme: 'forest' } })
    await flushPromises()
    expect(mermaid.initialize).toHaveBeenLastCalledWith({ theme: 'forest', startOnLoad: false })
    await wrapper.setProps({ diagram: 'flowchart LR\n  X --> Y' })
    await flushPromises()
    expect(mermaid.render).toHaveBeenCalledTimes(3)
    expect(mermaid.render.mock.lastCall[1]).toBe('flowchart LR\n  X --> Y')
    expect(nodeOpacities(wrapper)).toEqual(['1', '1', '0.5'])
    expect(wrapper.emitted('rendered')).toHaveLength(3)
  })

  it.each([
    [0, ['0.2', '0.2', '0.2'], ['0.2', '0.2', '0.2', '0.2']],
    [1, ['1', '0.2', '0.2'], ['1', '0.2', '0.2', '0.2']],
    [2, ['1', '1', '0.2'], ['1', '1', '1', '0.2']],
    [3, ['1', '1', '1'], ['1', '1', '1', '1']],
  ])('reveals steps cumulatively at step %i', async (currentStep, nodes, edges) => {
    const wrapper = await createWrapper({ currentStep })
    expect(nodeOpacities(wrapper)).toEqual(nodes)
    expect(label(wrapper, 'B').style.opacity).toBe(nodes[1])
    expect(edgeOpacities(wrapper)).toEqual(edges)
    expectUntouched(wrapper)
  })

  it('updates styles without re-rendering and restores Mermaid inline styles', async () => {
    const wrapper = await createWrapper()
    expect(wrapper.props('currentStep')).toBe(0)
    await wrapper.setProps({ currentStep: 3 })
    expect(nodeOpacities(wrapper)).toEqual(['1', '1', '1'])
    await wrapper.setProps({ currentStep: 1, inactiveOpacity: 0 })
    expect(nodeOpacities(wrapper)).toEqual(['1', '0', '0'])
    expect(shape(wrapper, 'A').style.getPropertyValue('fill')).toBe('#dbeafe')
    expect(shape(wrapper, 'A').style.getPropertyPriority('opacity')).toBe('important')
    await wrapper.setProps({ steps: 0 })
    expect(shape(wrapper, 'A').getAttribute('style')).toBe('fill:#dbeafe !important')
    expect(shape(wrapper, 'B').getAttribute('style')).toBe('')
    expect(edge(wrapper, 'step1E').getAttribute('style')).toBe('stroke-dasharray: 0 0 9 4;')
    expect(mermaid.render).toHaveBeenCalledTimes(1)
  })

  it.each([-1, 4])('treats out-of-range step %i as all dimmed or all revealed', async currentStep => {
    const wrapper = await createWrapper({ currentStep, currentStepStyle: 'fill:red', dimmedStepsStyle: 'fill:gray' })
    const dimmed = currentStep < 0
    expect(nodeOpacities(wrapper)).toEqual(dimmed ? ['0.2', '0.2', '0.2'] : ['1', '1', '1'])
    expect(shape(wrapper, 'B').style.fill).toBe(dimmed ? 'gray' : '')
  })

  it('applies node CSS to current and dimmed steps only', async () => {
    const wrapper = await createWrapper({
      currentStep: 2,
      currentStepStyle: 'fill: #f99; stroke: #f00; opacity: 0.9',
      dimmedStepsStyle: 'stroke: #999; opacity: 0.1',
    })
    expect(shape(wrapper, 'A').style.stroke).toBe('')
    expect(shape(wrapper, 'B').style.fill).toBe('#f99')
    expect(label(wrapper, 'B').style.stroke).toBe('#f00')
    expect(nodeOpacities(wrapper)).toEqual(['1', '0.9', '0.1'])
    expect(edgeOpacities(wrapper)).toEqual(['1', '1', '1', '0.2'])
    expect(edge(wrapper, 'step2E').style.stroke).toBe('')

    await wrapper.setProps({ currentStepStyle: 'fill: rgb(1, 2, 3)', dimmedStepsStyle: '' })
    expect(shape(wrapper, 'B').style.fill).toMatch(/^rgb\(1, ?2, ?3\)$/)
    expect(shape(wrapper, 'B').style.stroke).toBe('')
    expect(nodeOpacities(wrapper)).toEqual(['1', '1', '0.2'])
  })

  it('applies edge CSS without changing nodes', async () => {
    const wrapper = await createWrapper({
      currentStep: 1,
      currentStepEdgeStyle: 'stroke: green; opacity: 0.9',
      dimmedStepsEdgeStyle: 'stroke: gray; opacity: 0.1',
    })
    expect(edgeOpacities(wrapper)).toEqual(['0.9', '0.1', '0.1', '0.1'])
    expect(edge(wrapper, 'step1E').style.stroke).toBe('green')
    expect(edge(wrapper, 'step3E').style.stroke).toBe('gray')
    expect(shape(wrapper, 'A').style.stroke).toBe('')
    await wrapper.setProps({ currentStepEdgeStyle: '', dimmedStepsEdgeStyle: '' })
    expect(edgeOpacities(wrapper)).toEqual(['1', '0.2', '0.2', '0.2'])
    expect(edge(wrapper, 'step1E').style.stroke).toBe('')
    expectUntouched(wrapper)
  })

  it('reapplies current-step styles over Mermaid styles when the step changes', async () => {
    const wrapper = await createWrapper({
      currentStep: 1,
      currentStepStyle: 'fill: red; filter: drop-shadow(0 0 4px gold);',
      currentStepEdgeStyle: 'stroke: green; stroke-width: 4px;',
    })
    expect(shape(wrapper, 'A').style.fill).toBe('red')
    expect(shape(wrapper, 'A').style.filter).toBe('drop-shadow(0 0 4px gold)')
    expect(label(wrapper, 'A').style.fill).toBe('red')
    expect(edge(wrapper, 'step1E').style.stroke).toBe('green')
    expect(edge(wrapper, 'step1E').style.strokeWidth).toBe('4px')
    expect(edge(wrapper, 'step2E').style.stroke).toBe('')

    await wrapper.setProps({ currentStep: 2 })
    expect(shape(wrapper, 'A').style.fill).toBe('#dbeafe')
    expect(shape(wrapper, 'B').style.fill).toBe('red')
    expect(edge(wrapper, 'step2Eg').style.stroke).toBe('green')
    await wrapper.setProps({ currentStepStyle: '', currentStepEdgeStyle: '' })
    expect(shape(wrapper, 'B').style.fill).toBe('')
    expect(edge(wrapper, 'step2E').style.stroke).toBe('')
  })

  it('maps custom edge counts, including suffixes beyond z', async () => {
    const wrapper = await createWrapper({ edgesPerStep: 9 })
    expect(edge(wrapper, 'step2Eh').style.opacity).toBe('0.2')
    expect(edge(wrapper, 'step3Eab').style.opacity).toBe('')
    await wrapper.setProps({ edgesPerStep: 29 })
    expect(edge(wrapper, 'step3Eab').style.opacity).toBe('0.2')
    await wrapper.setProps({ edgesPerStep: 1 })
    expect(edge(wrapper, 'step2E').style.opacity).toBe('0.2')
    expect(edge(wrapper, 'step2Eg').style.opacity).toBe('')
  })

  it('maps manual edge class mappings, even with automatic mappings disabled', async () => {
    const wrapper = await createWrapper({
      diagram: `${diagram}\nclass custom,L_A_B_0 step2E`,
      currentStep: 2,
      edgesPerStep: 0,
      currentStepEdgeStyle: 'stroke: red;',
    })
    expect(edge(wrapper, 'custom').style.stroke).toBe('red')
    expect(edge(wrapper, 'L_A_B_0').style.opacity).toBe('1')
    expect(edge(wrapper, 'step2E').getAttribute('style')).toBe('stroke-dasharray: 0 0 9 4;')
    expect(nodeOpacities(wrapper)).toEqual(['1', '1', '0.2'])
  })

  it.each([-0.1, 1.1, NaN, Infinity])('rejects invalid inactive opacity %s', inactiveOpacity => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    expect(() => mount(MermaidSteps, { props: { diagram, steps: 3, inactiveOpacity } })).toThrow(
      'inactiveOpacity must be a finite number between 0 and 1',
    )
    warn.mockRestore()
  })

  it.each([-1, 1.5, NaN, Infinity])('rejects invalid edge count %s', edgesPerStep => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    expect(() => mount(MermaidSteps, { props: { diagram, steps: 3, edgesPerStep } })).toThrow(
      'edgesPerStep must be a non-negative safe integer',
    )
    warn.mockRestore()
  })

  it('keeps the previous diagram on errors, emits parse-error, and cleans up', async () => {
    const wrapper = await createWrapper({ currentStep: 1 })
    const error = new Error('Parse error')
    mermaid.render.mockImplementationOnce(async id => {
      document.body.insertAdjacentHTML('beforeend', `<div id="d${id}"></div>`)
      throw error
    })
    await wrapper.setProps({ diagram: 'invalid' })
    await flushPromises()
    expect(wrapper.emitted('parse-error')).toEqual([[error]])
    expect(nodeOpacities(wrapper)).toEqual(['1', '0.2', '0.2'])
    expect(document.querySelector('[id^="dmermaid-steps"]')).toBeNull()
  })

  it('forwards attributes to the diagram container', async () => {
    const wrapper = await createWrapper({ class: 'diagram-frame', style: 'width: 50%' })
    expect(wrapper.classes()).toContain('diagram-frame')
    expect(wrapper.attributes('style')).toBe('width: 50%;')
  })

  it('ignores renders that finish after unmounting', async () => {
    const wrapper = mount(MermaidSteps, { props: { diagram, steps: 3 } })
    wrapper.unmount()
    await flushPromises()
    expect(wrapper.emitted('rendered')).toBeUndefined()
  })
})
