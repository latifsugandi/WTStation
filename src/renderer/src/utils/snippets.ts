interface Snippet {
  trigger: string
  content: string
  description?: string
}

const DEFAULT_SNIPPETS: Snippet[] = [
  {
    trigger: '/salam',
    content: 'Assalamualaikum, terima kasih telah menghubungi kami. Ada yang bisa saya bantu?',
    description: 'Greeting message',
  },
  {
    trigger: '/terimakasih',
    content: 'Terima kasih telah menggunakan layanan kami. Semoga puas dengan pelayanan kami!',
    description: 'Thank you message',
  },
  {
    trigger: '/tunggu',
    content: 'Mohon tunggu sebentar, saya sedang mengecek informasi untuk Anda.',
    description: 'Wait message',
  },
]

export function expandSnippet(trigger: string, snippets: Snippet[] = DEFAULT_SNIPPETS): string | null {
  const snippet = snippets.find((s) => s.trigger === trigger)
  return snippet ? snippet.content : null
}

export function getAvailableSnippets(snippets: Snippet[] = DEFAULT_SNIPPETS): Snippet[] {
  return snippets
}
