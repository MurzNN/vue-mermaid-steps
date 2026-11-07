import { afterEach, describe, expect, it, vi } from 'vitest'
import { enableAutoUnmount, mount } from '@vue/test-utils'
import App from '../playground/App.vue'
import VueMermaidSteps from '../src'

vi.mock('../src', () => ({
  default: {
    name: 'VueMermaidSteps',
    props: [
      'diagram', 'steps', 'currentStep', 'inactiveOpacity', 'currentStepStyle', 'dimmedStepsStyle',
      'currentStepEdgeStyle', 'dimmedStepsEdgeStyle',
      'currentStepCss', 'currentStepEdgeCss', 'options',
    ],
    emits: ['parse-error', 'rendered'],
    template: '<div />',
  },
}))

enableAutoUnmount(afterEach)

function button(wrapper, label) {
  return wrapper.findAll('button').find(item => item.text() === label)
}

describe('playground', () => {
  it('links to the GitHub repository and published npm package', () => {
    const wrapper = mount(App)
    const links = wrapper.get('nav[aria-label="Project links"]')
    expect(links.get('a[href="https://github.com/MurzNN/vue-mermaid-steps"]').text())
      .toBe('GitHub repository')
    expect(links.get('a[href="https://www.npmjs.com/package/vue-mermaid-steps"]').text())
      .toBe('npm package')
  })

  it('updates inactive opacity live and resets it with the example', async () => {
    const wrapper = mount(App)
    const preview = wrapper.findComponent(VueMermaidSteps)
    expect(preview.props('inactiveOpacity')).toBe(0.2)
    await wrapper.get('#inactive-opacity').setValue('0.5')
    expect(preview.props('inactiveOpacity')).toBe(0.5)
    expect(wrapper.text()).toContain('Future steps stay at 50% opacity unless overridden by custom styles.')
    await button(wrapper, 'Reset example').trigger('click')
    expect(preview.props('inactiveOpacity')).toBe(0.2)
    expect(wrapper.get('#inactive-opacity').element.value).toBe('0.2')
  })

  it('updates custom styles live, includes them in usage, and supports clearing and reset', async () => {
    const wrapper = mount(App)
    const preview = wrapper.findComponent(VueMermaidSteps)
    expect(preview.props()).toMatchObject({ currentStepStyle: '', dimmedStepsStyle: '' })
    const currentStyle = 'fill:#ffe08a,stroke-width:3px'
    const dimmedStyle = 'opacity:0.1'
    await wrapper.get('#current-step-style').setValue(currentStyle)
    await wrapper.get('#dimmed-steps-style').setValue(dimmedStyle)
    expect(preview.props()).toMatchObject({
      currentStepStyle: currentStyle,
      dimmedStepsStyle: dimmedStyle,
    })
    expect(wrapper.get('.usage code').text()).toContain(`const currentStepStyle = "${currentStyle}"`)
    expect(wrapper.get('.usage code').text()).toContain(`const dimmedStepsStyle = "${dimmedStyle}"`)
    expect(wrapper.get('.usage code').text()).toContain(':current-step-style="currentStepStyle"')
    expect(wrapper.get('.usage code').text()).toContain(':dimmed-steps-style="dimmedStepsStyle"')
    expect(wrapper.text()).not.toContain('Unapplied changes.')

    await wrapper.get('#current-step-style').setValue('')
    await wrapper.get('#dimmed-steps-style').setValue('')
    expect(preview.props()).toMatchObject({ currentStepStyle: '', dimmedStepsStyle: '' })
    await wrapper.get('#current-step-style').setValue(currentStyle)
    await wrapper.get('#dimmed-steps-style').setValue(dimmedStyle)
    await button(wrapper, 'Reset example').trigger('click')
    expect(preview.props()).toMatchObject({ currentStepStyle: '', dimmedStepsStyle: '' })
    expect(wrapper.get('#current-step-style').element.value).toBe('')
    expect(wrapper.get('#dimmed-steps-style').element.value).toBe('')
    expect(wrapper.get('.usage code').text()).toContain('const currentStepStyle = ""')
    expect(wrapper.get('.usage code').text()).toContain('const dimmedStepsStyle = ""')
  })

  it('clears render errors after corrected styles render successfully', async () => {
    const wrapper = mount(App)
    const preview = wrapper.findComponent(VueMermaidSteps)
    await wrapper.get('#current-step-style').setValue('invalid style')
    preview.vm.$emit('parse-error', new Error('Invalid style'))
    await wrapper.vm.$nextTick()
    expect(wrapper.get('[role="alert"]').text()).toContain('Invalid style')
    await wrapper.get('#current-step-style').setValue('fill:red')
    preview.vm.$emit('rendered')
    await wrapper.vm.$nextTick()
    expect(wrapper.find('[role="alert"]').exists()).toBe(false)
  })

  it('places all style inputs below the chart', () => {
    const wrapper = mount(App)
    const chart = wrapper.get('.diagram-preview').element
    const controls = wrapper.get('.style-controls')
    expect(chart.compareDocumentPosition(controls.element) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(controls.findAll('input[type="text"]')).toHaveLength(6)
    expect(wrapper.find('.step-controls input[type="text"]').exists()).toBe(false)
  })

  it.each([
    ['currentStepStyle', 'current-step-style', 'fill:red'],
    ['currentStepEdgeStyle', 'current-step-edge-style', 'stroke:green'],
    ['dimmedStepsStyle', 'dimmed-steps-style', 'opacity:0.1'],
    ['dimmedStepsEdgeStyle', 'dimmed-steps-edge-style', 'opacity:0.3'],
    ['currentStepCss', 'current-step-css', 'filter: drop-shadow(0 0 4px gold);'],
    ['currentStepEdgeCss', 'current-step-edge-css', 'stroke: gold; stroke-width: 4px;'],
  ])('updates %s live, includes it in usage, and clears it on reset', async (prop, id, style) => {
    const wrapper = mount(App)
    const preview = wrapper.findComponent(VueMermaidSteps)
    expect(preview.props(prop)).toBe('')
    await wrapper.get(`#${id}`).setValue(style)
    expect(preview.props(prop)).toBe(style)
    expect(wrapper.get('.usage code').text()).toContain(`const ${prop} = "${style}"`)
    expect(wrapper.get('.usage code').text()).toContain(`:${id}="${prop}"`)
    expect(wrapper.text()).not.toContain('Unapplied changes.')
    await wrapper.get(`#${id}`).setValue('')
    expect(preview.props(prop)).toBe('')
    await wrapper.get(`#${id}`).setValue(style)
    await button(wrapper, 'Reset example').trigger('click')
    expect(preview.props(prop)).toBe('')
    expect(wrapper.get(`#${id}`).element.value).toBe('')
    expect(wrapper.get('.usage code').text()).toContain(`const ${prop} = ""`)
  })

  it('reveals steps with buttons and the slider, respecting boundaries', async () => {
    const wrapper = mount(App)
    const preview = wrapper.findComponent(VueMermaidSteps)
    expect(preview.props('currentStep')).toBe(1)
    await button(wrapper, 'Next').trigger('click')
    expect(preview.props('currentStep')).toBe(2)
    await button(wrapper, 'Previous').trigger('click')
    expect(preview.props('currentStep')).toBe(1)
    await button(wrapper, 'Show all').trigger('click')
    expect(preview.props('currentStep')).toBe(3)
    expect(button(wrapper, 'Next').element.disabled).toBe(true)
    await button(wrapper, 'Hide all').trigger('click')
    expect(preview.props('currentStep')).toBe(0)
    expect(button(wrapper, 'Previous').element.disabled).toBe(true)
    await wrapper.get('#current-step').setValue(2)
    expect(preview.props('currentStep')).toBe(2)
  })

  it('applies edited source and clamps the current step to a reduced count', async () => {
    const wrapper = mount(App)
    const preview = wrapper.findComponent(VueMermaidSteps)
    const source = 'flowchart TD\n  A --> B:::step1'
    await button(wrapper, 'Show all').trigger('click')
    await wrapper.get('#diagram-source').setValue(source)
    await wrapper.get('#step-count').setValue('1')
    expect(preview.props('steps')).toBe(3)
    expect(preview.props('diagram')).not.toBe(source)
    expect(wrapper.text()).toContain('Unapplied changes.')
    await wrapper.get('form').trigger('submit')
    expect(preview.props()).toMatchObject({ diagram: source, steps: 1, currentStep: 1 })
  })

  it('supports zero steps', async () => {
    const wrapper = mount(App)
    await wrapper.get('#step-count').setValue('0')
    await wrapper.get('form').trigger('submit')
    expect(wrapper.findComponent(VueMermaidSteps).props()).toMatchObject({
      steps: 0,
      currentStep: 0,
    })
    expect(wrapper.get('#current-step').element.disabled).toBe(true)
  })

  it.each(['', '-1', '1.5'])('reports invalid step counts: %s', async value => {
    const wrapper = mount(App)
    await wrapper.get('#step-count').setValue(value)
    await wrapper.get('form').trigger('submit')
    expect(wrapper.get('[role="alert"]').text()).toContain('non-negative whole number')
    expect(wrapper.findComponent(VueMermaidSteps).props('steps')).toBe(3)
  })

  it('rejects empty diagrams without replacing the preview', async () => {
    const wrapper = mount(App)
    const original = wrapper.findComponent(VueMermaidSteps).props('diagram')
    await wrapper.get('#diagram-source').setValue(' ')
    await wrapper.get('form').trigger('submit')
    expect(wrapper.get('[role="alert"]').text()).toContain('Enter Mermaid diagram code')
    expect(wrapper.findComponent(VueMermaidSteps).props('diagram')).toBe(original)
  })

  it('reports Mermaid errors and resets the complete example', async () => {
    const wrapper = mount(App)
    const preview = wrapper.findComponent(VueMermaidSteps)
    const original = preview.props('diagram')
    await wrapper.get('#diagram-source').setValue('not a valid diagram')
    await wrapper.get('form').trigger('submit')
    preview.vm.$emit('parse-error', new Error('Syntax error'))
    await wrapper.vm.$nextTick()
    expect(wrapper.get('[role="alert"]').text()).toContain('Syntax error')
    await button(wrapper, 'Reset example').trigger('click')
    expect(wrapper.find('[role="alert"]').exists()).toBe(false)
    expect(preview.props()).toMatchObject({ diagram: original, steps: 3, currentStep: 1 })
    expect(wrapper.get('#diagram-source').element.value).toBe(original)
  })
})
