import '@/styles/globals.css'

export const metadata = {
  title: 'Lime Softening Calculator',
  description: 'Calculate lime dosage for water softening processes',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
