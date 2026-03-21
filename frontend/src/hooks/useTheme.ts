import { useState, useEffect } from 'react'

export function useTheme() {
  const [dark, setDark] = useState(() => localStorage.getItem('theme') === 'dark')

  useEffect(() => {
    document.body.classList.toggle('dark', dark)
    localStorage.setItem('theme', dark ? 'dark' : 'light')
  }, [dark])

  const toggleDark = () => setDark(d => !d)

  return { dark, toggleDark }
}
