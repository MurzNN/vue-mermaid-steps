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
})

const diagramAtStep = computed(() => {
  const styles = Array.from({ length: props.steps }, (_, index) => {
    const step = index + 1
    const opacity = step <= props.currentStep ? 1 : 0.2
    return `classDef step${step},step${step}E opacity:${opacity}`
  })

  return [props.diagram, ...styles].join('\n')
})
</script>

<template>
  <VueMermaidString :value="diagramAtStep" />
</template>
