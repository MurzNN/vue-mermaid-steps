<script setup lang="ts">
import type { MermaidConfig } from 'mermaid'
import { onBeforeUnmount, onMounted, useId, useTemplateRef, watch } from 'vue'

const props = defineProps<{
  value: string
  options?: MermaidConfig
}>()

const emit = defineEmits<{
  'rendered': []
  'parse-error': [error: unknown]
}>()

const root = useTemplateRef('root')
// Mermaid uses the id as a CSS selector, so it must not start with a digit.
const id = `vue-mermaid-steps-${useId().replace(/[^\w-]/g, '')}`
let renderCount = 0
let mounted = false

async function render() {
  if (!mounted || !props.value) return
  const currentRender = ++renderCount
  const renderId = `${id}-${currentRender}`
  try {
    const { default: mermaid } = await import('mermaid')
    mermaid.initialize({
      securityLevel: 'loose',
      theme: 'default',
      ...props.options,
      startOnLoad: false,
    })
    const { svg, bindFunctions } = await mermaid.render(renderId, props.value)
    // Skip stale results; the previous diagram stays visible until the latest one renders.
    if (!mounted || currentRender !== renderCount || !root.value) return
    root.value.innerHTML = svg
    bindFunctions?.(root.value)
    emit('rendered')
  } catch (error) {
    // Mermaid leaves its temporary render container in the document when rendering fails.
    document.getElementById(`d${renderId}`)?.remove()
    if (mounted && currentRender === renderCount) emit('parse-error', error)
  }
}

onMounted(() => {
  mounted = true
  render()
})
onBeforeUnmount(() => {
  mounted = false
})
watch(() => [props.value, props.options], render, { deep: true })
</script>

<template>
  <div ref="root" />
</template>
