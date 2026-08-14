import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './ui/theme.css'

// PWA autoUpdate : le nouveau service worker prend la main tout de suite,
// mais la page continue d'exécuter l'ANCIEN code tant qu'on ne recharge pas.
// On recharge donc — sauf pendant une leçon, qui ne vit qu'en mémoire.
if ('serviceWorker' in navigator) {
  const avaitControleur = !!navigator.serviceWorker.controller
  let enAttente = false
  let rechargeEnCours = false

  const enLecon = () => /^#\/(lecon|revision)(\/|$)/.test(window.location.hash)

  const rechargerSiPossible = () => {
    if (rechargeEnCours || !enAttente || enLecon()) return
    rechargeEnCours = true
    window.location.reload()
  }

  navigator.serviceWorker.addEventListener('controllerchange', () => {
    // 1re installation : ce n'est pas une mise à jour, on ne recharge pas
    if (!avaitControleur) return
    enAttente = true
    rechargerSiPossible()
  })

  // sortie de leçon : moment sûr pour appliquer la mise à jour
  window.addEventListener('hashchange', rechargerSiPossible)
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
