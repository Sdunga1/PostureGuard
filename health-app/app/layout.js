import './globals.css'

export const metadata = {
  title: 'PostureGuard - Neural Alignment',
  description: 'Your personal posture recovery and neural alignment session.',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en" className="dark">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@300;400;500;600;700&family=Inter:wght@300;400;500;600&display=swap" rel="stylesheet" />
      </head>
      <body className="bg-vs-bg text-vs-on-surface font-body antialiased">
        {children}
      </body>
    </html>
  )
}
