# Créditos de áudio

## Sons dos animais (quebra-cabeça)

As gravações dos sons dos animais usados no app **Quebra-Cabeça dos Animais**
vêm do [MyInstants](https://www.myinstants.com) (uso gratuito com atribuição ao
site/autor, conforme a licença do MyInstants).

| Arquivo | Animal | Fonte |
| --- | --- | --- |
| `public/sounds/dog.mp3` | Cachorro | MyInstants — busca "dog bark" |
| `public/sounds/cat.mp3` | Gato | MyInstants — busca "cat meow" |
| `public/sounds/chicken.mp3` | Galinha | MyInstants — busca "chicken cluck" |
| `public/sounds/sheep.mp3` | Ovelha | MyInstants — busca "sheep baa" |
| `public/sounds/cow.mp3` | Vaca | MyInstants — busca "cow moo" |
| `public/sounds/duck.mp3` | Pato | MyInstants — busca "duck quack" |
| `public/sounds/pig.mp3` | Porco | MyInstants — busca "oink" |
| `public/sounds/horse.mp3` | Cavalo | MyInstants — busca "horse neigh" |
| `public/sounds/lion.mp3` | Leão | MyInstants — busca "lion roar" |
| `public/sounds/frog.mp3` | Sapo | MyInstants — busca "frog croak" |
| `public/sounds/owl.mp3` | Coruja | MyInstants — busca "owl hoot" |
| `public/sounds/rooster.mp3` | Galo | MyInstants — busca "rooster crow" |

## Meios de transporte (quebra-cabeça)

As gravações dos sons dos veículos usados no app **Meios de Transporte**
vêm do [MyInstants](https://www.myinstants.com) (uso gratuito com atribuição ao
site/autor, conforme a licença do MyInstants).

| Arquivo | Veículo | Fonte |
| --- | --- | --- |
| `public/sounds/car.mp3` | Carro | MyInstants — <https://www.myinstants.com/en/instant/car-horn-beep-beep-11766/> |
| `public/sounds/taxi.mp3` | Táxi | MyInstants — <https://www.myinstants.com/en/instant/taxi/> |
| `public/sounds/police.mp3` | Polícia | MyInstants — <https://www.myinstants.com/en/instant/police-siren-brr-brr-6280/> |
| `public/sounds/ambulance.mp3` | Ambulância | MyInstants — <https://www.myinstants.com/en/instant/random-ambulance-siren-sound-53358/> |
| `public/sounds/fire-truck.mp3` | Bombeiro | MyInstants — <https://www.myinstants.com/en/instant/fire-truck-ferre-57226/> (apenas os primeiros 4 s) |
| `public/sounds/truck.mp3` | Caminhão | MyInstants — <https://www.myinstants.com/en/instant/truck-horn/> |
| `public/sounds/bus.mp3` | Ônibus | MyInstants — <https://www.myinstants.com/en/instant/bus-horn-72469/> |
| `public/sounds/bike.mp3` | Bicicleta | MyInstants — <https://www.myinstants.com/en/instant/bicycle-bell-29981/> |
| `public/sounds/motorcycle.mp3` | Motocicleta | MyInstants — <https://www.myinstants.com/en/instant/motorcycle-revving-hell-yea/> |
| `public/sounds/train.mp3` | Trem | MyInstants — <https://www.myinstants.com/en/instant/train-whistle/> |
| `public/sounds/airplane.mp3` | Avião | MyInstants — <https://www.myinstants.com/en/instant/airplane/> (apenas os primeiros 4 s) |
| `public/sounds/helicopter.mp3` | Helicóptero | MyInstants — <https://www.myinstants.com/en/instant/helicopterinho/> (apenas os primeiros 4 s) |
| `public/sounds/rocket.mp3` | Foguete | MyInstants — <https://www.myinstants.com/en/instant/rocket-launcher-78236/> |
| `public/sounds/boat.mp3` | Veleiro | MyInstants — <https://www.myinstants.com/en/instant/spongebob-boat-horn-84013/> |
| `public/sounds/tractor.mp3` | Trator | MyInstants — <https://www.myinstants.com/en/instant/old-tractor-24402/> (apenas os primeiros 4 s) |

Se um arquivo não carregar (ex.: offline), o jogo usa um som procedural
generado por Web Audio como fallback (`src/ui/sfx.ts` + `src/ui/sounds.ts`).
Gravações mais longas são cortadas nos primeiros 4 s no momento da
decodificação (`preloadSound(url, maxDur)` em `src/ui/sounds.ts`).

Demais efeitos do jogo (estilhaço, motor, pontes…) são 100% procedurais em
`src/ui/sfx.ts`, sem arquivos externos.
