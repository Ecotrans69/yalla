import { createContext, useContext, useEffect, useState } from 'react'
import type { ReactNode } from 'react'

/** Mini routeur par hash (#/cours/en) — compatible GitHub Pages */

function parseHash(): string {
  const h = window.location.hash.replace(/^#/, '')
  return h || '/'
}

interface RouterApi {
  path: string
  segments: string[]
  navigate(to: string): void
}

const RouterCtx = createContext<RouterApi>({ path: '/', segments: [], navigate: () => {} })

export function RouterProvider({ children }: { children: ReactNode }) {
  const [path, setPath] = useState(parseHash)

  useEffect(() => {
    const onChange = () => setPath(parseHash())
    window.addEventListener('hashchange', onChange)
    return () => window.removeEventListener('hashchange', onChange)
  }, [])

  const navigate = (to: string) => {
    if (parseHash() === to) return
    window.location.hash = to
  }

  return (
    <RouterCtx.Provider value={{ path, segments: path.split('/').filter(Boolean), navigate }}>
      {children}
    </RouterCtx.Provider>
  )
}

export function useRouter(): RouterApi {
  return useContext(RouterCtx)
}
