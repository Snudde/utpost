// M9: formen på en notis när den når klienten – samma som schemat (Notice, Paragraph, TextRun).
// Brödtexten är DATA: stycken av textbitar, inte en HTML-sträng. Hur fet text och länkar ska se
// ut bestämmer klienten (components/RichText.vue).
export interface TextRun {
  text: string
  bold: boolean
  italic: boolean
  href?: string | null
}

export interface Paragraph {
  runs: TextRun[]
}

export interface Notice {
  id: string
  title: string
  level: string
  status: string
  guideSlug?: string | null
  body: Paragraph[]
}
