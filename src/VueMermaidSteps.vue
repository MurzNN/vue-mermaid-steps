<script setup lang="ts">
import { computed, onBeforeUnmount, useTemplateRef, watch } from 'vue'
import VueMermaidString from 'vue-mermaid-string'

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
  currentStepCss: {
    type: String,
    default: '',
  },
  currentStepEdgeCss: {
    type: String,
    default: '',
  },
})

const renderer = useTemplateRef('renderer')
const originalStyles = new Map<SVGElement, string | null>()

function restoreCss() {
  for (const [element, style] of originalStyles) {
    if (style === null) element.removeAttribute('style')
    else element.setAttribute('style', style)
  }
  originalStyles.clear()
}

function applyCurrentStepCss() {
  restoreCss()
  const root = renderer.value?.$el
  if (!(root instanceof Element) || !Number.isInteger(props.currentStep)
    || props.currentStep < 1 || props.currentStep > props.steps) return

  function apply(element: SVGElement, css: string) {
    if (!css) return
    const declarations = document.createElement('span').style
    declarations.cssText = css
    originalStyles.set(element, element.getAttribute('style'))
    for (let index = 0; index < declarations.length; index++) {
      const property = declarations.item(index)
      element.style.setProperty(property, declarations.getPropertyValue(property), 'important')
    }
  }

  for (const element of root.querySelectorAll<SVGElement>(
    `.node.step${props.currentStep} > :is(rect, circle, ellipse, polygon, polyline, path, line)`,
  )) {
    apply(element, props.currentStepCss)
  }
  const edgeClass = `step${props.currentStep}E`
  const edgeIds = new Set(edgeSuffixes.value.map(suffix => `${edgeClass}${suffix}`))
  for (const [, ids, classes] of props.diagram.matchAll(
    /(?:^|[;\n])\s*class[ \t]+([^\s;]+)[ \t]+([^\s;]+)/g,
  )) {
    if (classes.split(',').includes(edgeClass)) {
      for (const id of ids.split(',')) edgeIds.add(id)
    }
  }
  for (const element of root.querySelectorAll<SVGElement>('path.flowchart-link')) {
    if (element.classList.contains(edgeClass) || edgeIds.has(element.id)) {
      apply(element, props.currentStepEdgeCss)
    }
  }
}

watch(
  () => [props.currentStepCss, props.currentStepEdgeCss, props.currentStep, props.steps],
  applyCurrentStepCss,
  { flush: 'post' },
)
onBeforeUnmount(restoreCss)

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

const diagramAtStep = computed(() => {
  if (!Number.isFinite(props.inactiveOpacity) || props.inactiveOpacity < 0 || props.inactiveOpacity > 1) {
    throw new RangeError('inactiveOpacity must be a finite number between 0 and 1')
  }
  const styles = Array.from({ length: props.steps }, (_, index) => {
    const step = index + 1
    const opacity = step <= props.currentStep ? 1 : props.inactiveOpacity
    let nodeStyle = ''
    let edgeStyle = ''
    if (step > props.currentStep) {
      nodeStyle = props.dimmedStepsStyle
      edgeStyle = props.dimmedStepsEdgeStyle
    } else if (step === props.currentStep) {
      nodeStyle = props.currentStepStyle
      edgeStyle = props.currentStepEdgeStyle
    }
    const nodeDeclarations = [`opacity:${opacity}`, nodeStyle].filter(Boolean).join(',')
    const edgeDeclarations = [`opacity:${opacity}`, edgeStyle].filter(Boolean).join(',')
    const edgeClass = `step${step}E`
    const edgeIds = edgeSuffixes.value.map(suffix => `${edgeClass}${suffix}`)
    return [
      ...(edgeIds.length ? [`class ${edgeIds.join(',')} ${edgeClass}`] : []),
      ...(nodeDeclarations === edgeDeclarations
        ? [`classDef step${step},${edgeClass} ${nodeDeclarations}`]
        : [
            `classDef step${step} ${nodeDeclarations}`,
            `classDef ${edgeClass} ${edgeDeclarations}`,
          ]),
    ].join('\n')
  })

  return [props.diagram, ...styles].join('\n')
})
</script>

<template>
  <VueMermaidString ref="renderer" :value="diagramAtStep" @rendered="applyCurrentStepCss" />
</template>
