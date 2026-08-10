#!/bin/bash
# Déploie l'app sur GitHub Pages (branche gh-pages)
set -e
cd "$(dirname "$0")/.."
npm test
npm run build
cd dist
git init -q -b gh-pages
git add -A
git -c user.name="deploy" -c user.email="deploy@yalla.local" commit -q -m "deploy $(date '+%Y-%m-%d %H:%M')"
git push -f https://github.com/Ecotrans69/yalla.git gh-pages:gh-pages
cd .. && rm -rf dist/.git
echo "✅ Déployé : https://ecotrans69.github.io/yalla/"
