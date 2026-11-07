<script setup lang="ts">
import type { MermaidConfig } from 'mermaid'
import type { PropType } from 'vue'
import { computed, nextTick, onMounted, shallowRef, useId, useTemplateRef, watch, watchEffect } from 'vue'

const props = defineProps({
  diagram: {
    type: String,
    required: true,
  },
  steps: {
    type: Number,
    required: true,
  },
  currentStep: {
    type: Number,
    default: 0,
  },
  edgesPerStep: {
    type: Number,
    default: 8,
  },
  inactiveOpacity: {
    type: Number,
    default: 0.2,
  },
  currentStepStyle: {
    type: String,
    default: '',
  },
  dimmedStepsStyle: {
    type: String,
    default: '',
  },
  currentStepEdgeStyle: {
    type: String,
    default: '',
  },
  dimmedStepsEdgeStyle: {
    type: String,
    default: '',
  },
  options: {
    type: Object as PropType<MermaidConfig>,
    default: undefined,
  },
})

const emit = defineEmits<{
  'rendered': []
  'parse-error': [error: unknown]
}>()

const root = useTemplateRef('root')
const svg = shallowRef<SVGSVGElement | null>(null)
// Mermaid uses the id as a CSS selector, so it must not start with a digit.
const id = `mermaid-steps-${useId().replace(/[^\w-]/g, '')}`
let renderCount = 0

async function render() {
  const renderId = `${id}-${++renderCount}`
  try {
    const { default: mermaid } = await import('mermaid')
    mermaid.initialize({ ...props.options, startOnLoad: false })
    // Mermaid queues render calls, so results always arrive in request order.
    const result = await mermaid.render(renderId, props.diagram)
    if (!root.value) return
    root.value.innerHTML = result.svg
    result.bindFunctions?.(root.value)
    svg.value = root.value.querySelector('svg')
    await nextTick()
    emit('rendered')
  } catch (error) {
    // Mermaid leaves its temporary render container in the document when rendering fails.
    document.getElementById(`d${renderId}`)?.remove()
    emit('parse-error', error)
  }
}

onMounted(render)
// Compared by value, so inline `:options="{ ... }"` objects do not trigger re-renders.
watch(() => JSON.stringify([props.diagram, props.options ?? {}]), render)

const edgeSuffixes = computed(() => {
  if (!Number.isSafeInteger(props.edgesPerStep) || props.edgesPerStep < 0) {
    throw new RangeError('edgesPerStep must be a non-negative safe integer')
  }
  return Array.from({ length: props.edgesPerStep }, (_, index) => {
    let suffix = ''
    for (let value = index; value > 0; value = Math.floor((value - 1) / 26)) {
      suffix = String.fromCharCode(97 + (value - 1) % 26) + suffix
    }
    return suffix
  })
})

/** Mermaid edge IDs mapped to step numbers: generated `stepNE*` IDs plus `class id stepNE` mappings. */
const stepByEdgeId = computed(() => {
  const steps = new Map<string, number>()
  for (let step = 1; step <= props.steps; step++) {
    for (const suffix of edgeSuffixes.value) steps.set(`step${step}E${suffix}`, step)
  }
  for (const [, ids, classes] of props.diagram.matchAll(
    /(?:^|[;\n])\s*class[ \t]+([^\s;]+)[ \t]+([^\s;]+)/g,
  )) {
    for (const className of classes.split(',')) {
      const step = Number(/^step(\d+)E$/.exec(className)?.[1])
      if (step >= 1 && step <= props.steps) {
        for (const edgeId of ids.split(',')) steps.set(edgeId, step)
      }
    }
  }
  return steps
})

const originalStyles = new Map<SVGElement, string | null>()

function restoreStyles() {
  for (const [element, style] of originalStyles) {
    if (style === null) element.removeAttribute('style')
    else element.setAttribute('style', style)
  }
  originalStyles.clear()
}

// Inline `!important` is required to override Mermaid, which inlines classDef styles as `!important`.
function setStyles(elements: Iterable<SVGElement>, css: string) {
  const declarations = document.createElement('span').style
  declarations.cssText = css
  if (!declarations.length) return
  for (const element of elements) {
    if (!originalStyles.has(element)) originalStyles.set(element, element.getAttribute('style'))
    for (let index = 0; index < declarations.length; index++) {
      const property = declarations.item(index)
      element.style.setProperty(property, declarations.getPropertyValue(property), 'important')
    }
  }
}

function applyStepStyles() {
  if (!Number.isFinite(props.inactiveOpacity) || props.inactiveOpacity < 0 || props.inactiveOpacity > 1) {
    throw new RangeError('inactiveOpacity must be a finite number between 0 and 1')
  }
  const edgeSteps = stepByEdgeId.value
  restoreStyles()
  const element = svg.value
  if (!element) return

  // Mermaid prefixes rendered edge IDs with the SVG id.
  const edgesByStep = new Map<number, SVGElement[]>()
  for (const edge of element.querySelectorAll<SVGElement>('path.flowchart-link')) {
    const step = edge.id.startsWith(`${element.id}-`) && edgeSteps.get(edge.id.slice(element.id.length + 1))
    if (step) edgesByStep.set(step, [...edgesByStep.get(step) ?? [], edge])
  }

  for (let step = 1; step <= props.steps; step++) {
    const isCurrent = step === props.currentStep
    const isDimmed = step > props.currentStep
    const opacity = `opacity:${isDimmed ? props.inactiveOpacity : 1}`
    const nodeStyle = isDimmed ? props.dimmedStepsStyle : isCurrent ? props.currentStepStyle : ''
    const edgeStyle = isDimmed ? props.dimmedStepsEdgeStyle : isCurrent ? props.currentStepEdgeStyle : ''
    const edges = edgesByStep.get(step) ?? []

    // Same targets as a Mermaid `classDef stepN`, which styles `.stepN > *`.
    setStyles(element.querySelectorAll<SVGElement>(`.step${step} > *`), `${opacity};${nodeStyle}`)
    setStyles(edges, `${opacity};${edgeStyle}`)
  }
}

watchEffect(applyStepStyles, { flush: 'post' })
</script>

<template>
  <div ref="root" />
</template>
