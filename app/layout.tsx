import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: '⛧=Good Morning=⛧｜華地產線上鑽石分會⏃付出者收穫',
  description: '華地產線上鑽石分會簽到系統',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="zh-TW">
      <body>{children}</body>
    </html>
  )
}

