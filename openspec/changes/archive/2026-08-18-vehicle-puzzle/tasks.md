## 1. Áudio

- [x] 1.1 Baixar 15 sons reais (MyInstants) em `public/sounds/` (car, taxi, police, ambulance, fire-truck, truck, bus, bike, motorcycle, train, airplane, helicopter, rocket, boat, tractor)
- [x] 1.2 `preloadSound(url, maxDur?)` com corte no decode para gravações > 4 s
- [x] 1.3 15 fallbacks procedurais em `src/ui/sfx.ts`
- [x] 1.4 Créditos em `docs/audio-credits.md` + nota no README

## 2. App

- [x] 2.1 Extrair `PuzzleApp` genérico de `AnimalsApp` (mesmo mecanismo, dados por parâmetro; 4 colunas p/ 12 itens, 5 p/ 15)
- [x] 2.2 Configs `puzzleAnimals.ts` (12) e `puzzleVehicles.ts` (15); remover `AnimalsApp.ts`
- [x] 2.3 `main.ts`: novo item do launcher "Transportes" (🚕) + `openVehicles`

## 3. Verificar e entregar

- [x] 3.1 `tsc --noEmit` + `vite build` passando
- [x] 3.2 Testar no browser: abrir o app de transportes, soltar quase certo → encaixa com som real; soltar longe → tum + retorno; completar → confete + "Jogar de novo" com ordem diferente; reabrir o app de animais continua funcionando
- [x] 3.3 Commit + push