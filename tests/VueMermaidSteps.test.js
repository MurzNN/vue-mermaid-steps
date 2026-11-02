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
    ...opacities.flatMap((opacity, index) => {
      const step = index + 1
      const ids = ['', ...'abcdefg'].map(suffix => `step${step}E${suffix}`)
      return [
        `class ${ids.join(',')} step${step}E`,
        `classDef step${step},step${step}E opacity:${opacity}`,
      ]
    }),
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

  it('updates inactive node and edge opacity while keeping revealed steps visible', async () => {
    const wrapper = createWrapper({ currentStep: 1, inactiveOpacity: 0.5 })
    expect(wrapper.findComponent(Renderer).props('value')).toBe(
      expectedDiagram(diagram, [1, 0.5, 0.5]),
    )
    await wrapper.setProps({ inactiveOpacity: 0 })
    expect(wrapper.findComponent(Renderer).props('value')).toBe(
      expectedDiagram(diagram, [1, 0, 0]),
    )
    await wrapper.setProps({ inactiveOpacity: 1 })
    expect(wrapper.findComponent(Renderer).props('value')).toBe(
      expectedDiagram(diagram, [1, 1, 1]),
    )
  })

  it.each([-0.1, 1.1, NaN, Infinity])('rejects invalid inactive opacity %s', inactiveOpacity => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    try {
      expect(() => createWrapper({ inactiveOpacity })).toThrow(
        'inactiveOpacity must be a finite number between 0 and 1',
      )
    } finally {
      warn.mockRestore()
    }
  })

  it('maps exactly 8 unique edge IDs per step by default', () => {
    const wrapper = createWrapper({ steps: 2 })
    const source = wrapper.findComponent(Renderer).props('value')
    const mappings = source.split('\n').filter(line => line.startsWith('class '))
    expect(mappings).toHaveLength(2)
    for (const [index, mapping] of mappings.entries()) {
      const step = index + 1
      const [, ids, className] = mapping.split(' ')
      expect(className).toBe(`step${step}E`)
      expect(ids.split(',')).toEqual([
        `step${step}E`, `step${step}Ea`, `step${step}Eb`, `step${step}Ec`,
        `step${step}Ed`, `step${step}Ee`, `step${step}Ef`, `step${step}Eg`,
      ])
      expect(new Set(ids.split(',')).size).toBe(8)
    }
  })

  it('reacts to custom edge counts and extends suffixes beyond z', async () => {
    const wrapper = createWrapper({ steps: 1, edgesPerStep: 16 })
    const mappedIds = () => wrapper.findComponent(Renderer).props('value')
      .split('\n').find(line => line.startsWith('class ')).split(' ')[1].split(',')
    expect(mappedIds()).toHaveLength(16)
    expect(mappedIds().at(-1)).toBe('step1Eo')
    await wrapper.setProps({ edgesPerStep: 29 })
    expect(mappedIds()).toHaveLength(29)
    expect(new Set(mappedIds()).size).toBe(29)
    expect(mappedIds().slice(26)).toEqual(['step1Ez', 'step1Eaa', 'step1Eab'])
    await wrapper.setProps({ edgesPerStep: 1 })
    expect(mappedIds()).toEqual(['step1E'])
  })

  it('disables automatic mappings at zero without changing step opacity', () => {
    const wrapper = createWrapper({ steps: 1, edgesPerStep: 0 })
    expect(wrapper.findComponent(Renderer).props('value')).toBe(
      `${diagram}\nclassDef step1,step1E opacity:0.2`,
    )
  })

  it.each([-1, 1.5, NaN, Infinity])('rejects invalid edge count %s', edgesPerStep => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    try {
      expect(() => createWrapper({ edgesPerStep })).toThrow(
        'edgesPerStep must be a non-negative safe integer',
      )
    } finally {
      warn.mockRestore()
    }
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
