import { afterEach, describe, expect, it, vi } from 'vitest'
import { enableAutoUnmount, mount } from '@vue/test-utils'
import Renderer from 'vue-mermaid-string'
import VueMermaidSteps, { VueMermaidSteps as NamedComponent } from '../src/index'

enableAutoUnmount(afterEach)

vi.mock('vue-mermaid-string', () => ({
  default: {
    name: 'VueMermaidString',
    props: ['value'],
    emits: ['rendered', 'node-click', 'parse-error'],
    template: '<div />',
  },
}))

const diagram = 'flowchart TD\n  A --> B'

function createWrapper(props = {}) {
  return mount(VueMermaidSteps, {
    props: { diagram, steps: 3, ...props },
  })
}

function expectedDiagram(source, opacities) {
  return [
    source,
    ...opacities.map(
      (opacity, index) =>
        `classDef step${index + 1},step${index + 1}E opacity:${opacity}`,
    ),
  ].join('\n')
}

describe('VueMermaidSteps', () => {
  it('exports the same component as default and named exports', () => {
    expect(NamedComponent).toBe(VueMermaidSteps)
  })

  it('defaults to step 0 when currentStep is omitted', () => {
    const wrapper = createWrapper()
    expect(wrapper.props('currentStep')).toBe(0)
    expect(wrapper.findComponent(Renderer).props('value')).toBe(
      expectedDiagram(diagram, [0.2, 0.2, 0.2]),
    )
  })

  it.each([
    [0, [0.2, 0.2, 0.2]],
    [1, [1, 0.2, 0.2]],
    [2, [1, 1, 0.2]],
    [3, [1, 1, 1]],
  ])('reveals steps cumulatively at step %i', (currentStep, opacities) => {
    const wrapper = createWrapper({ currentStep })
    expect(wrapper.findComponent(Renderer).props('value')).toBe(
      expectedDiagram(diagram, opacities),
    )
  })

  it('updates when the current step moves forward and backward', async () => {
    const wrapper = createWrapper()
    await wrapper.setProps({ currentStep: 3 })
    expect(wrapper.findComponent(Renderer).props('value')).toBe(
      expectedDiagram(diagram, [1, 1, 1]),
    )
    await wrapper.setProps({ currentStep: 1 })
    expect(wrapper.findComponent(Renderer).props('value')).toBe(
      expectedDiagram(diagram, [1, 0.2, 0.2]),
    )
  })

  it('reacts to diagram and step-count changes', async () => {
    const wrapper = createWrapper({ currentStep: 1 })
    const updatedDiagram = 'flowchart LR\n  X --> Y'
    await wrapper.setProps({ diagram: updatedDiagram, steps: 5 })
    expect(wrapper.findComponent(Renderer).props('value')).toBe(
      expectedDiagram(updatedDiagram, [1, 0.2, 0.2, 0.2, 0.2]),
    )
    await wrapper.setProps({ steps: 1 })
    expect(wrapper.findComponent(Renderer).props('value')).toBe(
      expectedDiagram(updatedDiagram, [1]),
    )
  })

  it('leaves the source unchanged when there are no steps', () => {
    const wrapper = createWrapper({ steps: 0 })
    expect(wrapper.findComponent(Renderer).props('value')).toBe(diagram)
  })

  it('preserves existing Mermaid definitions', () => {
    const source = `${diagram}\nclassDef step1 fill:red\nclass edge1 step1E`
    const wrapper = createWrapper({ diagram: source, currentStep: 1 })
    expect(wrapper.findComponent(Renderer).props('value')).toBe(
      expectedDiagram(source, [1, 0.2, 0.2]),
    )
  })

  it('forwards attributes, Mermaid options, and renderer events', async () => {
    const wrapper = createWrapper()
    const onRendered = vi.fn()
    const onNodeClick = vi.fn()
    const onParseError = vi.fn()
    await wrapper.setProps({
      class: 'diagram-frame',
      options: { theme: 'dark' },
      onRendered,
      'onNode-click': onNodeClick,
      'onParse-error': onParseError,
    })
    const renderer = wrapper.findComponent(Renderer)
    expect(renderer.classes()).toContain('diagram-frame')
    expect(renderer.vm.$attrs.options).toEqual({ theme: 'dark' })

    const error = new Error('Invalid Mermaid diagram')
    renderer.vm.$emit('rendered')
    renderer.vm.$emit('node-click', 'A')
    renderer.vm.$emit('parse-error', error)
    expect(onRendered).toHaveBeenCalledExactlyOnceWith()
    expect(onNodeClick).toHaveBeenCalledExactlyOnceWith('A')
    expect(onParseError).toHaveBeenCalledExactlyOnceWith(error)
  })
})
