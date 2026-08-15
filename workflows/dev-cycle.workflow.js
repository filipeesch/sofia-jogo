// Workflow: dev-cycle
// Ciclo: research -> implement -> tests -> review -> review-fix -> re-review -> last-fix
// Uso: chamar tools.workflow({ script: <este arquivo>, meta: <dev-cycle.meta.json>, args: { task: "...", context: "..." } })

const task = (args && args.task) || '';
const context = (args && args.context) || 'Nenhum contexto adicional.';
const language = (args && args.language) || 'Português';

if (!task) {
  throw new Error('args.task é obrigatório. Ex.: args: { task: "sua tarefa aqui" }');
}

phase('research');
const research = await agent(
  'Você é um pesquisador sênior. Pesquise e produza um plano técnico para a tarefa abaixo. Responda em ' + language + '.\n\n' +
  'TAREFA:\n' + task + '\n\n' +
  'CONTEXTO:\n' + context + '\n\n' +
  'Entregue: objetivo, abordagem, arquivos/áreas a tocar, riscos e decisões técnicas.',
  { label: 'research', phase: 'research' }
);
log('Pesquisa concluída.');

phase('implement');
const implementation = await agent(
  'Você é um engenheiro. Implemente a tarefa com base na pesquisa abaixo. Responda em ' + language + '.\n\n' +
  'TAREFA:\n' + task + '\n\n' +
  'PESQUISA:\n' + research + '\n\n' +
  'Escreva o código e, ao final, liste exatamente: (1) arquivos criados/alterados, (2) o que cada mudança faz, (3) como rodar.',
  { label: 'implement', phase: 'implement' }
);
log('Implementação concluída.');

phase('tests');
const tests = await agent(
  'Você é um engenheiro de QA. Escreva e rode testes para a implementação abaixo. Responda em ' + language + '.\n\n' +
  'TAREFA:\n' + task + '\n\n' +
  'IMPLEMENTAÇÃO:\n' + implementation + '\n\n' +
  'Entregue: testes adicionados/rodados, como executá-los, resultados e falhas encontradas.',
  { label: 'tests', phase: 'tests' }
);
log('Testes concluídos.');

phase('review');
const review = await agent(
  'Você é um revisor sênior e criterioso. Revise a implementação abaixo. Responda em ' + language + '.\n\n' +
  'TAREFA:\n' + task + '\n\n' +
  'IMPLEMENTAÇÃO:\n' + implementation + '\n\n' +
  'TESTES:\n' + tests + '\n\n' +
  'Liste cada problema encontrado (bugs, segurança, qualidade, performance) com: severidade, arquivo/trecho, e instrução clara de correção. Se não houver problemas, diga explicitamente "APROVADO".',
  { label: 'review', phase: 'review' }
);
log('Revisão concluída.');

phase('review-fix');
const fix = await agent(
  'Você é O MESMO engenheiro que fez a implementação original abaixo. Agora você recebeu o feedback da revisão e deve corrigir todos os problemas apontados. Responda em ' + language + '.\n\n' +
  'TAREFA:\n' + task + '\n\n' +
  'SUA IMPLEMENTAÇÃO ORIGINAL:\n' + implementation + '\n\n' +
  'FEEDBACK DA REVISÃO:\n' + review + '\n\n' +
  'Corrija todos os problemas listados e descreva, item por item, o que foi alterado e por quê.',
  { label: 'review-fix', phase: 'review-fix' }
);
log('Correção da revisão concluída.');

phase('re-review');
const reReview = await agent(
  'Você é um revisor sênior. Revise novamente a implementação agora que as correções foram aplicadas. Responda em ' + language + '.\n\n' +
  'TAREFA:\n' + task + '\n\n' +
  'IMPLEMENTAÇÃO ORIGINAL:\n' + implementation + '\n\n' +
  'CORREÇÕES APLICADAS:\n' + fix + '\n\n' +
  'REVISÃO ANTERIOR:\n' + review + '\n\n' +
  'Liste apenas os problemas que AINDA restam (com instrução de correção) ou confirme "APROVADO" se estiver tudo certo.',
  { label: 're-review', phase: 're-review' }
);
log('Segunda revisão concluída.');

phase('last-fix');
const lastFix = await agent(
  'Você é O MESMO engenheiro que implementou. Aplique as correções finais apontadas na segunda revisão e feche a tarefa. Responda em ' + language + '.\n\n' +
  'TAREFA:\n' + task + '\n\n' +
  'CORREÇÕES ANTERIORES:\n' + fix + '\n\n' +
  'SEGUNDA REVISÃO (o que ainda falta):\n' + reReview + '\n\n' +
  'Aplique as correções finais e entregue um resumo final: o que foi feito, como validar, e o estado final.',
  { label: 'last-fix', phase: 'last-fix' }
);
log('Correções finais concluídas.');

return {
  task,
  research,
  implementation,
  tests,
  review,
  fix,
  reReview,
  lastFix
};
