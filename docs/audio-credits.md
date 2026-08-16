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

Se um arquivo não carregar (ex.: offline), o jogo usa um som procedural
generado por Web Audio como fallback (`src/ui/sfx.ts` + `src/ui/sounds.ts`).

Demais efeitos do jogo (estilhaço, motor, pontes…) são 100% procedurais em
`src/ui/sfx.ts`, sem arquivos externos.
