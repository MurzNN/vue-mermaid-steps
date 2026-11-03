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
const currentStepStyle = ref('')
const dimmedStepsStyle = ref('')
const currentStepEdgeStyle = ref('')
const dimmedStepsEdgeStyle = ref('')
const currentStepCss = ref('')
const currentStepEdgeCss = ref('')
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
  currentStepStyle.value = ''
  dimmedStepsStyle.value = ''
  currentStepEdgeStyle.value = ''
  dimmedStepsEdgeStyle.value = ''
  currentStepCss.value = ''
  currentStepEdgeCss.value = ''
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
      <nav class="project-links" aria-label="Project links">
        <a href="https://github.com/MurzNN/vue-mermaid-steps">GitHub repository</a>
        <a href="https://www.npmjs.com/package/vue-mermaid-steps">npm package</a>
      </nav>
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
            :current-step-style="currentStepStyle"
            :dimmed-steps-style="dimmedStepsStyle"
            :current-step-edge-style="currentStepEdgeStyle"
            :dimmed-steps-edge-style="dimmedStepsEdgeStyle"
            :current-step-css="currentStepCss"
            :current-step-edge-css="currentStepEdgeCss"
            :options="{ theme: 'default', securityLevel: 'strict' }"
            @parse-error="reportRenderError"
            @rendered="renderError = ''"
          />
        </div>
        <section class="style-controls" aria-labelledby="styles-heading">
          <h2 id="styles-heading">Step styles</h2>
          <label for="current-step-style">Current step node style</label>
          <input
            id="current-step-style"
            v-model="currentStepStyle"
            type="text"
            placeholder="fill:#ffe08a,stroke:#d97706"
            spellcheck="false"
            aria-describedby="step-style-help"
          />
          <label for="current-step-edge-style">Current step edge style</label>
          <input
            id="current-step-edge-style"
            v-model="currentStepEdgeStyle"
            type="text"
            placeholder="stroke:#d97706,stroke-width:3px"
            spellcheck="false"
            aria-describedby="step-style-help"
          />
          <label for="dimmed-steps-style">Dimmed steps node style</label>
          <input
            id="dimmed-steps-style"
            v-model="dimmedStepsStyle"
            type="text"
            placeholder="opacity:0.1"
            spellcheck="false"
            aria-describedby="step-style-help"
          />
          <label for="dimmed-steps-edge-style">Dimmed steps edge style</label>
          <input
            id="dimmed-steps-edge-style"
            v-model="dimmedStepsEdgeStyle"
            type="text"
            placeholder="opacity:0.3,stroke:#999"
            spellcheck="false"
            aria-describedby="step-style-help"
          />
          <p id="step-style-help" class="hint">
            Styles update live. Use comma-separated Mermaid declarations, such as
            <code>fill:#ffe08a,stroke-width:3px</code>, not CSS blocks.
            Current step styles affect only the current step, not completed steps.
            Dimmed styles affect future steps. Custom styles can override opacity;
            node and edge styles are independent and appended after default opacity.
            Later declarations override earlier ones.
            Clear an input to restore its default styling.
          </p>
          <label for="current-step-css">Current step node CSS</label>
          <input
            id="current-step-css"
            v-model="currentStepCss"
            type="text"
            placeholder="filter: drop-shadow(0 0 4px gold);"
            spellcheck="false"
            aria-describedby="step-css-help"
          />
          <label for="current-step-edge-css">Current step edge CSS</label>
          <input
            id="current-step-edge-css"
            v-model="currentStepEdgeCss"
            type="text"
            placeholder="stroke: gold; stroke-width: 4px;"
            spellcheck="false"
            aria-describedby="step-css-help"
          />
          <p id="step-css-help" class="hint">
            CSS inputs use semicolon-separated declarations, not Mermaid syntax
            or selector blocks. They override rendered current-step node shapes
            and edge paths only. Clear an input to restore Mermaid styling.
          </p>
        </section>
        <p class="hint preview-hint">
          Completed steps are fully visible. Future steps stay at
          {{ Math.round(inactiveOpacity * 100) }}% opacity unless overridden by custom styles.
          Step 0 dims all numbered steps.
        </p>
      </section>
    </div>

    <section class="usage" aria-labelledby="usage-heading">
      <h2 id="usage-heading">Use it in your Vue app</h2>
      <pre><code>import VueMermaidSteps from 'vue-mermaid-steps'

const currentStepStyle = {{ JSON.stringify(currentStepStyle) }}
const dimmedStepsStyle = {{ JSON.stringify(dimmedStepsStyle) }}
const currentStepEdgeStyle = {{ JSON.stringify(currentStepEdgeStyle) }}
const dimmedStepsEdgeStyle = {{ JSON.stringify(dimmedStepsEdgeStyle) }}
const currentStepCss = {{ JSON.stringify(currentStepCss) }}
const currentStepEdgeCss = {{ JSON.stringify(currentStepEdgeCss) }}

&lt;VueMermaidSteps
  :diagram="diagram"
  :steps="{{ steps }}"
  :current-step="{{ currentStep }}"
  :inactive-opacity="{{ inactiveOpacity }}"
  :current-step-style="currentStepStyle"
  :dimmed-steps-style="dimmedStepsStyle"
  :current-step-edge-style="currentStepEdgeStyle"
  :dimmed-steps-edge-style="dimmedStepsEdgeStyle"
  :current-step-css="currentStepCss"
  :current-step-edge-css="currentStepEdgeCss"
/&gt;</code></pre>
      <p class="hint">
        All props are reactive. Change them from JavaScript or bind them to
        your presentation controls.
      </p>
    </section>
  </main>
</template>
