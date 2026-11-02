<script setup lang="ts">
import { computed } from 'vue'
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
})

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
    const edgeClass = `step${step}E`
    const edgeIds = edgeSuffixes.value.map(suffix => `${edgeClass}${suffix}`)
    return [
      ...(edgeIds.length ? [`class ${edgeIds.join(',')} ${edgeClass}`] : []),
      `classDef step${step},${edgeClass} opacity:${opacity}`,
    ].join('\n')
  })

  return [props.diagram, ...styles].join('\n')
})
</script>

<template>
  <VueMermaidString :value="diagramAtStep" />
</template>
