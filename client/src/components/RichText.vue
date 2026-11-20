<script setup lang="ts">
import { h, type FunctionalComponent, type VNode } from 'vue'
import type { Paragraph, TextRun } from '../lib/notices'

// M9: rich text som data. Servern skickar stycken av textbitar – inte en HTML-sträng. Varje bit
// blir ett element som VI har valt (em, strong, a), och texten sätts in som text. Det finns ingen
// v-html här, alltså inget ställe där en tagg i innehållet kan bli kod (skuld 10, och H7 i M8).
defineProps<{ paragraphs: Paragraph[] }>()

// En textbit kan vara kursiv, fet och länk på samma gång: elementen läggs utanpå varandra.
const Run: FunctionalComponent<{ run: TextRun }> = ({ run }) => {
  let node: string | VNode = run.text
  if (run.italic) node = h('em', [node])
  if (run.bold) node = h('strong', [node])
  if (run.href) node = h('a', { href: run.href }, [node])
  return node
}
Run.props = ['run']
</script>

<template>
  <p v-for="(paragraph, i) in paragraphs" :key="i">
    <Run v-for="(run, j) in paragraph.runs" :key="j" :run="run" />
  </p>
</template>
