<script setup lang="ts">
import { computed, ref } from 'vue'
import VueMermaidSteps from '../src'

const example = `flowchart LR
    Idea step1E@--> Plan:::step1
    Plan step2E@--> Frontend[Build frontend]:::step2
    Plan step2Ea@--> Backend[Build backend]:::step2
    Frontend step3E@--> Ship:::step3
    Backend step3Ea@--> Ship

    classDef step1 fill:#dbeafe,stroke:#2563eb
    classDef step2 fill:#d1fae5,stroke:#059669
    classDef step3 fill:#ffedd5,stroke:#ea580c
`

const draft = ref(example)
const draftSteps = ref<number | string>(3)
const diagram = ref(example)
const steps = ref(3)
const currentStep = ref(1)
const inactiveOpacity = ref(0.2)
const inputError = ref('')
const renderError = ref('')
const pendingChanges = computed(
  () => draft.value !== diagram.value || Number(draftSteps.value) !== steps.value,
)

function applyDiagram() {
  const count = Number(draftSteps.value)
  if (draftSteps.value === '' || !Number.isSafeInteger(count) || count < 0) {
    inputError.value = 'Enter a non-negative whole number of steps.'
    return
  }
  if (!draft.value.trim()) {
    inputError.value = 'Enter Mermaid diagram code before applying.'
    return
  }
  inputError.value = ''
  renderError.value = ''
  diagram.value = draft.value
  steps.value = count
  currentStep.value = Math.min(currentStep.value, count)
}

function resetExample() {
  draft.value = example
  draftSteps.value = 3
  currentStep.value = 1
  inactiveOpacity.value = 0.2
  applyDiagram()
}

function reportRenderError(error: unknown) {
  renderError.value = error instanceof Error ? error.message : String(error)
}
</script>

<template>
  <main>
    <header class="page-header">
      <p class="eyebrow">Vue 3 + Mermaid</p>
      <h1>Diagrams, one step at a time.</h1>
      <p class="intro">
        Explore <code>vue-mermaid-steps</code>. Edit the source, apply your changes,
        and reveal the story behind your diagram.
      </p>
    </header>

    <div class="workspace">
      <section class="panel editor-panel" aria-labelledby="editor-heading">
        <div class="panel-heading">
          <h2 id="editor-heading">Diagram source</h2>
          <button type="button" class="subtle" @click="resetExample">
            Reset example
          </button>
        </div>
        <form novalidate @submit.prevent="applyDiagram">
          <label for="diagram-source">Mermaid code</label>
          <textarea
            id="diagram-source"
            v-model="draft"
            spellcheck="false"
            aria-describedby="source-help"
          />
          <p id="source-help" class="hint">
            Use <code>step1</code>, <code>step2</code>, ... for nodes and
            edge IDs like <code>step1E@--&gt;</code> and
            <code>step1Ea@--&gt;</code> (8 edges per step by default;
            configurable with <code>edgesPerStep</code>).
          </p>
          <div class="editor-actions">
            <div>
              <label for="step-count">Number of steps</label>
              <input
                id="step-count"
                v-model="draftSteps"
                type="number"
                min="0"
                step="1"
                :aria-invalid="Boolean(inputError)"
                :aria-describedby="inputError ? 'input-error' : undefined"
              />
            </div>
            <button type="submit" class="primary">Apply diagram</button>
          </div>
          <p v-if="inputError" id="input-error" class="error" role="alert">
            {{ inputError }}
          </p>
          <p v-else class="hint" role="status">
            {{ pendingChanges ? 'Unapplied changes.' : 'Preview is up to date.' }}
          </p>
        </form>
      </section>

      <section class="panel preview-panel" aria-labelledby="preview-heading">
        <div class="panel-heading">
          <h2 id="preview-heading">Live preview</h2>
          <output for="current-step" aria-live="polite">
            Step {{ currentStep }} / {{ steps }}
          </output>
        </div>
        <div class="step-controls">
          <div class="step-buttons">
            <button type="button" :disabled="currentStep === 0" @click="currentStep = 0">
              Hide all
            </button>
            <button type="button" :disabled="currentStep === 0" @click="currentStep--">
              Previous
            </button>
            <button type="button" :disabled="currentStep === steps" @click="currentStep++">
              Next
            </button>
            <button type="button" :disabled="currentStep === steps" @click="currentStep = steps">
              Show all
            </button>
          </div>
          <label for="current-step">Current step</label>
          <input
            id="current-step"
            v-model.number="currentStep"
            type="range"
            min="0"
            :max="steps"
            :disabled="steps === 0"
          />
          <label for="inactive-opacity">
            Inactive opacity: {{ Math.round(inactiveOpacity * 100) }}%
          </label>
          <input
            id="inactive-opacity"
            v-model.number="inactiveOpacity"
            type="range"
            min="0"
            max="1"
            step="0.05"
          />
        </div>
        <p v-if="renderError" class="error" role="alert">
          Mermaid could not render this diagram: {{ renderError }}
        </p>
        <div class="diagram-preview">
          <VueMermaidSteps
            :diagram="diagram"
            :steps="steps"
            :current-step="currentStep"
            :inactive-opacity="inactiveOpacity"
            :options="{ theme: 'default', securityLevel: 'strict' }"
            @parse-error="reportRenderError"
          />
        </div>
        <p class="hint preview-hint">
          Completed steps are fully visible. Future steps stay at
          {{ Math.round(inactiveOpacity * 100) }}% opacity.
          Step 0 dims all numbered steps.
        </p>
      </section>
    </div>

    <section class="usage" aria-labelledby="usage-heading">
      <h2 id="usage-heading">Use it in your Vue app</h2>
      <pre><code>import VueMermaidSteps from 'vue-mermaid-steps'

&lt;VueMermaidSteps
  :diagram="diagram"
  :steps="{{ steps }}"
  :current-step="{{ currentStep }}"
  :inactive-opacity="{{ inactiveOpacity }}"
/&gt;</code></pre>
      <p class="hint">
        All props are reactive. Change them from JavaScript or bind them to
        your presentation controls.
      </p>
    </section>
  </main>
</template>
