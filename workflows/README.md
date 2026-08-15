# dev-cycle (workflow reutilizável)

Ciclo longo de desenvolvimento em 7 etapas:

1. **research** — pesquisa e plano técnico
2. **implement** — implementação
3. **tests** — escrita/execução de testes
4. **review** — revisão de código
5. **review-fix** — correção dos problemas (mesmo "engenheiro" via contexto)
6. **re-review** — segunda revisão
7. **last-fix** — correções finais e resumo

## Como usar

O workflow roda pela tool `workflow`. Ela recebe:

- `script`: o conteúdo de `dev-cycle.workflow.js` (corpo JS puro)
- `meta`: o conteúdo de `dev-cycle.meta.json`
- `args`: `{ "task": "...", "context": "...", "language": "Português" }`

Para rodar no futuro, o agente lê estes arquivos e chama:

\`\`\`js
const script = await tools.read({ file_path: 'workflows/dev-cycle.workflow.js' });
const meta = JSON.parse((await tools.read({ file_path: 'workflows/dev-cycle.meta.json' })).lines.map(l => l.text).join('\n'));
const result = await tools.workflow({
  script: script.lines.map(l => l.text).join('\n'),
  meta,
  args: { task: '...', context: '...' }
});
\`\`\`

## Observação sobre "o mesmo agente"

A tool `workflow` cria um subagente **novo** a cada chamada de `agent()` — não há continuidade de conversa.
Para simular "o mesmo engenheiro que implementou", as etapas `review-fix` e `last-fix` recebem a implementação original
+ o feedback completo no prompt e são instruídas a agir como o mesmo engenheiro.

Se você precisar de continuidade real de sessão (o agente lembrar de tudo), use a tool `subagent` (continuável) + `send_message` no lugar da `workflow`.
