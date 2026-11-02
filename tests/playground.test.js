import { afterEach, describe, expect, it, vi } from 'vitest'
import { enableAutoUnmount, mount } from '@vue/test-utils'
import App from '../playground/App.vue'
import VueMermaidSteps from '../src'

vi.mock('../src', () => ({
  default: {
    name: 'VueMermaidSteps',
    props: ['diagram', 'steps', 'currentStep', 'inactiveOpacity'],
    emits: ['parse-error'],
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
    expect(wrapper.text()).toContain('Future steps stay at 50% opacity.')
    await button(wrapper, 'Reset example').trigger('click')
    expect(preview.props('inactiveOpacity')).toBe(0.2)
    expect(wrapper.get('#inactive-opacity').element.value).toBe('0.2')
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
