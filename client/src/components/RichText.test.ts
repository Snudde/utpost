import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/vue'
import RichText from './RichText.vue'

// M9: brödtexten kommer som data. Testet visar vad det ger: märken blir element vi har valt,
// och allt som står i texten förblir text – även om det ser ut som en tagg.
const run = (text: string, extra = {}) => ({
  text,
  bold: false,
  italic: false,
  href: null,
  ...extra,
})

describe('RichText', () => {
  it('ett stycke per stycke, med fet, kursiv och länk som riktiga element', () => {
    const { container } = render(RichText, {
      props: {
        paragraphs: [
          {
            runs: [
              run('Bron vid '),
              run('Storforsen', { bold: true }),
              run(' lagas. '),
              run('Läs mer', { href: 'https://utpost.se/leder', italic: true }),
            ],
          },
          { runs: [run('Räkna med en omväg.')] },
        ],
      },
    })

    expect(container.querySelectorAll('p')).toHaveLength(2)
    expect(screen.getByText('Storforsen').tagName).toBe('STRONG')
    const link = screen.getByRole('link', { name: 'Läs mer' })
    expect(link).toHaveAttribute('href', 'https://utpost.se/leder')
    expect(link.querySelector('em')).not.toBeNull()
  })

  it('en tagg i texten blir text, inte kod – det finns ingen v-html att smita in genom', () => {
    const { container } = render(RichText, {
      props: { paragraphs: [{ runs: [run('<img src=x onerror=alert(1)>')] }] },
    })

    expect(container.querySelector('img')).toBeNull()
    expect(screen.getByText('<img src=x onerror=alert(1)>')).toBeInTheDocument()
  })
})
