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

function expectedDiagram(source, opacities, nodeStyles = [], edgeStyles = []) {
  return [
    source,
    ...opacities.flatMap((opacity, index) => {
      const step = index + 1
      const ids = ['', ...'abcdefg'].map(suffix => `step${step}E${suffix}`)
      const nodeStyle = [`opacity:${opacity}`, nodeStyles[index]].filter(Boolean).join(',')
      const edgeStyle = [`opacity:${opacity}`, edgeStyles[index]].filter(Boolean).join(',')
      return [
        `class ${ids.join(',')} step${step}E`,
        ...(nodeStyle === edgeStyle
          ? [`classDef step${step},step${step}E ${nodeStyle}`]
          : [`classDef step${step} ${nodeStyle}`, `classDef step${step}E ${edgeStyle}`]),
      ]
    }),
  ].join('\n')
}

describe('VueMermaidSteps', () => {
  function renderSvg(wrapper) {
    const renderer = wrapper.findComponent(Renderer)
    renderer.element.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg">
      <g class="node step1"><rect style="fill: blue !important"/><g class="label"><rect /></g></g>
      <g class="node step2"><circle style="fill: gray"/></g>
      <path id="step1E" class="flowchart-link" style="stroke: blue !important"/>
      <path id="futureEdge" class="flowchart-link" style="opacity: 0.2"/>
    </svg>`
    renderer.vm.$emit('rendered')
    return renderer.element
  }

  it('applies independent CSS declarations after rendering and restores original styles when cleared', async () => {
    const wrapper = createWrapper({
      currentStep: 1,
      currentStepCss: 'fill: red; filter: drop-shadow(0 0 4px gold);',
      currentStepEdgeCss: 'stroke: green; stroke-width: 4px;',
    })
    const root = renderSvg(wrapper)
    const node = root.querySelector('.step1 > rect')
    const edge = root.querySelector('#step1E')
    expect(node.style.fill).toBe('red')
    expect(node.style.filter).toBe('drop-shadow(0 0 4px gold)')
    expect(root.querySelector('.label rect').hasAttribute('style')).toBe(false)
    expect(root.querySelector('.step2 circle').style.fill).toBe('gray')
    expect(edge.style.stroke).toBe('green')
    expect(edge.style.strokeWidth).toBe('4px')
    expect(root.querySelector('#futureEdge').style.opacity).toBe('0.2')
    expect(wrapper.findComponent(Renderer).vm.$attrs).not.toHaveProperty('currentStepCss')
    expect(wrapper.findComponent(Renderer).vm.$attrs).not.toHaveProperty('currentStepEdgeCss')

    await wrapper.setProps({ currentStepCss: 'opacity: 0.5;', currentStepEdgeCss: 'stroke: purple;' })
    expect(node.style.fill).toBe('blue')
    expect(node.style.filter).toBe('')
    expect(node.style.opacity).toBe('0.5')
    expect(edge.style.stroke).toBe('purple')
    expect(edge.style.strokeWidth).toBe('')
    await wrapper.setProps({ currentStepCss: '', currentStepEdgeCss: '' })
    expect(node.getAttribute('style')).toBe('fill: blue !important')
    expect(edge.getAttribute('style')).toBe('stroke: blue !important')
  })

  it('reapplies CSS on new renders and removes it from completed steps', async () => {
    const wrapper = createWrapper({ currentStep: 1, currentStepCss: 'fill: red;' })
    const root = renderSvg(wrapper)
    expect(root.querySelector('.step1 > rect').style.fill).toBe('red')
    await wrapper.setProps({ currentStep: 2 })
    wrapper.findComponent(Renderer).vm.$emit('rendered')
    expect(root.querySelector('.step1 > rect').style.fill).toBe('blue')
    expect(root.querySelector('.step2 circle').style.fill).toBe('red')
    const replacement = renderSvg(wrapper)
    expect(replacement.querySelector('.step2 circle').style.fill).toBe('red')
    await wrapper.setProps({ currentStep: 0 })
    wrapper.findComponent(Renderer).vm.$emit('rendered')
    expect(replacement.querySelector('.step2 circle').style.fill).toBe('gray')
  })

  it('styles manually mapped edges without automatic edge mappings', () => {
    const wrapper = createWrapper({
      diagram: `${diagram}\nclass customEdge step1E`,
      currentStep: 1,
      edgesPerStep: 0,
      currentStepEdgeCss: 'stroke: red;',
    })
    const root = renderSvg(wrapper)
    const edge = root.querySelector('#step1E')
    expect(edge.style.stroke).toBe('blue')
    edge.id = 'customEdge'
    wrapper.findComponent(Renderer).vm.$emit('rendered')
    expect(edge.style.stroke).toBe('red')
  })

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

  it('applies node styles only to current and future nodes, leaving edges unchanged', async () => {
    const currentStepStyle = 'fill:#f99,stroke:#f00,opacity:0.9'
    const dimmedStepsStyle = 'stroke:#999,opacity:0.1'
    const wrapper = createWrapper({
      currentStep: 2,
      currentStepStyle,
      dimmedStepsStyle,
    })
    const renderer = wrapper.findComponent(Renderer)
    expect(renderer.props('value')).toBe(
      expectedDiagram(diagram, [1, 1, 0.2], ['', currentStepStyle, dimmedStepsStyle]),
    )
    expect(renderer.vm.$attrs).not.toHaveProperty('currentStepStyle')
    expect(renderer.vm.$attrs).not.toHaveProperty('dimmedStepsStyle')

    await wrapper.setProps({ currentStep: 3 })
    expect(renderer.props('value')).toBe(
      expectedDiagram(diagram, [1, 1, 1], ['', '', currentStepStyle]),
    )
    await wrapper.setProps({ currentStep: 1 })
    expect(renderer.props('value')).toBe(
      expectedDiagram(diagram, [1, 0.2, 0.2], [currentStepStyle, dimmedStepsStyle, dimmedStepsStyle]),
    )
  })

  it('reacts to custom style changes and restores defaults when cleared', async () => {
    const wrapper = createWrapper({ currentStep: 1 })
    await wrapper.setProps({
      currentStepStyle: 'stroke-width:4px',
      dimmedStepsStyle: 'fill:#eee',
      inactiveOpacity: 0.4,
    })
    expect(wrapper.findComponent(Renderer).props('value')).toBe(
      expectedDiagram(diagram, [1, 0.4, 0.4], ['stroke-width:4px', 'fill:#eee', 'fill:#eee']),
    )
    await wrapper.setProps({ currentStepStyle: '', dimmedStepsStyle: '' })
    expect(wrapper.findComponent(Renderer).props('value')).toBe(
      expectedDiagram(diagram, [1, 0.4, 0.4]),
    )
  })

  it('updates and clears edge styles without changing node styles', async () => {
    const wrapper = createWrapper({
      currentStep: 1,
      currentStepEdgeStyle: 'stroke:green,opacity:0.9',
      dimmedStepsEdgeStyle: 'stroke:gray,opacity:0.1',
    })
    const renderer = wrapper.findComponent(Renderer)
    expect(renderer.props('value')).toBe(expectedDiagram(
      diagram, [1, 0.2, 0.2], [],
      ['stroke:green,opacity:0.9', 'stroke:gray,opacity:0.1', 'stroke:gray,opacity:0.1'],
    ))
    await wrapper.setProps({ currentStepEdgeStyle: 'stroke:red', dimmedStepsEdgeStyle: 'opacity:0' })
    expect(renderer.props('value')).toBe(expectedDiagram(
      diagram, [1, 0.2, 0.2], [], ['stroke:red', 'opacity:0', 'opacity:0'],
    ))
    await wrapper.setProps({ currentStepEdgeStyle: '', dimmedStepsEdgeStyle: '' })
    expect(renderer.props('value')).toBe(expectedDiagram(diagram, [1, 0.2, 0.2]))
  })

  it.each([-1, 0, 4])('applies custom styles consistently outside numbered steps at step %i', currentStep => {
    const wrapper = createWrapper({
      currentStep,
      currentStepStyle: 'fill:red',
      dimmedStepsStyle: 'fill:gray',
    })
    const dimmed = currentStep <= 0
    expect(wrapper.findComponent(Renderer).props('value')).toBe(
      expectedDiagram(diagram, dimmed ? [0.2, 0.2, 0.2] : [1, 1, 1],
        dimmed ? ['fill:gray', 'fill:gray', 'fill:gray'] : []),
    )
  })

  it('supports custom styles without edge mappings and leaves zero-step diagrams unchanged', async () => {
    const wrapper = createWrapper({
      steps: 1,
      edgesPerStep: 0,
      currentStep: 1,
      currentStepStyle: 'fill:red',
      dimmedStepsStyle: 'fill:gray',
    })
    expect(wrapper.findComponent(Renderer).props('value')).toBe(
      `${diagram}\nclassDef step1 opacity:1,fill:red\nclassDef step1E opacity:1`,
    )
    await wrapper.setProps({ steps: 0 })
    expect(wrapper.findComponent(Renderer).props('value')).toBe(diagram)
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

  it('styles nodes and edges independently without styling completed steps', async () => {
    const wrapper = createWrapper({
      currentStep: 2,
      currentStepStyle: 'stroke:blue,fill:red',
      dimmedStepsStyle: 'opacity:0.4,fill:gray',
      currentStepEdgeStyle: 'stroke:green',
      dimmedStepsEdgeStyle: 'opacity:0.1',
    })
    const renderer = wrapper.findComponent(Renderer)
    const definitions = () => renderer.props('value').split('\n').filter(line => line.startsWith('classDef '))
    expect(definitions()).toEqual([
      'classDef step1,step1E opacity:1',
      'classDef step2 opacity:1,stroke:blue,fill:red',
      'classDef step2E opacity:1,stroke:green',
      'classDef step3 opacity:0.2,opacity:0.4,fill:gray',
      'classDef step3E opacity:0.2,opacity:0.1',
    ])
    for (const prop of ['currentStepStyle', 'currentStepEdgeStyle', 'dimmedStepsStyle', 'dimmedStepsEdgeStyle']) {
      expect(renderer.vm.$attrs).not.toHaveProperty(prop)
    }

    await wrapper.setProps({ currentStepStyle: '', dimmedStepsEdgeStyle: '' })
    expect(definitions()).toEqual([
      'classDef step1,step1E opacity:1',
      'classDef step2 opacity:1',
      'classDef step2E opacity:1,stroke:green',
      'classDef step3 opacity:0.2,opacity:0.4,fill:gray',
      'classDef step3E opacity:0.2',
    ])
    await wrapper.setProps({ currentStep: 1 })
    expect(definitions()).toEqual([
      'classDef step1 opacity:1',
      'classDef step1E opacity:1,stroke:green',
      'classDef step2 opacity:0.2,opacity:0.4,fill:gray',
      'classDef step2E opacity:0.2',
      'classDef step3 opacity:0.2,opacity:0.4,fill:gray',
      'classDef step3E opacity:0.2',
    ])
    await wrapper.setProps({ currentStepStyle: 'stroke:purple', dimmedStepsStyle: 'opacity:0.6' })
    expect(definitions()).toEqual([
      'classDef step1 opacity:1,stroke:purple',
      'classDef step1E opacity:1,stroke:green',
      'classDef step2 opacity:0.2,opacity:0.6',
      'classDef step2E opacity:0.2',
      'classDef step3 opacity:0.2,opacity:0.6',
      'classDef step3E opacity:0.2',
    ])
    await wrapper.setProps({ currentStep: 4 })
    expect(renderer.props('value')).toBe(expectedDiagram(diagram, [1, 1, 1]))
  })

  it('keeps unspecified targets at default opacity and supports specific styles without automatic edge mappings', async () => {
    const wrapper = createWrapper({
      steps: 1,
      edgesPerStep: 0,
      currentStep: 1,
      currentStepStyle: 'fill:red',
      dimmedStepsEdgeStyle: 'stroke:gray',
    })
    const renderer = wrapper.findComponent(Renderer)
    expect(renderer.props('value')).toBe(
      `${diagram}\nclassDef step1 opacity:1,fill:red\nclassDef step1E opacity:1`,
    )
    await wrapper.setProps({ currentStep: 0 })
    expect(renderer.props('value')).toBe(
      `${diagram}\nclassDef step1 opacity:0.2\nclassDef step1E opacity:0.2,stroke:gray`,
    )
    await wrapper.setProps({ currentStep: -1 })
    expect(renderer.props('value')).toBe(
      `${diagram}\nclassDef step1 opacity:0.2\nclassDef step1E opacity:0.2,stroke:gray`,
    )
    await wrapper.setProps({ dimmedStepsEdgeStyle: '' })
    expect(renderer.props('value')).toBe(`${diagram}\nclassDef step1,step1E opacity:0.2`)
    await wrapper.setProps({ steps: 0, currentStepStyle: 'fill:blue' })
    expect(renderer.props('value')).toBe(diagram)
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
