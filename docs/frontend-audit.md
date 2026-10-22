# Auditoria do front-end — 16/10/2026

## Escopo

Dez telas internas: painel, publicação, agendamentos, fila, métricas, audiência, contas/clientes, estúdio, AutoDM e configurações. Também foram revisados início, login, cadastro e saída.

## Achados no código anterior

| Prioridade | Evidência | Correção |
|---|---|---|
| P1 | `Sidebar`/`Header` e wrappers repetidos nas dez rotas | Layout compartilhado `AppShell` |
| P1 | Menu móvel fixo sobre a área do título | Botão dentro do cabeçalho; drawer com Escape e foco |
| P1 | Tema implementado separadamente em início, cabeçalho e configurações | `ThemeProvider` centralizado |
| P1 | Tema `system` ignorado no bootstrap e sem listener de mudança | Inicialização e acompanhamento de `matchMedia` |
| P2 | Tooltip/grids de métricas com cores fixas | Cores por tokens nos gráficos |
| P2 | Gradientes e raios inconsistentes nos formulários | Superfícies e contornos da referência |
| P2 | Botões de tema/notificações sem nomes acessíveis | Rótulos e estados ARIA |
| P2 | Login/cadastro sempre com fundo escuro | `AuthLayout` com tema e estrutura responsiva |
| P2 | Import de fontes após diretivas Tailwind | Import no início do CSS |
| P2 | Painel sem evolução temporal e falhas de carregamento silenciosas | Gráfico real, períodos e ação de atualização |

## Limites da validação

Verificação local usa banco temporário; não publica em redes, não chama Gemini nem processa mídia real. Fluxos de OAuth e integrações externas dependem das credenciais e dos serviços existentes. As APIs, banco e lógica de publicação permanecem fora do escopo das alterações.

`scripts/verify-ui.cjs` verifica rotas, temas, overflow e interações locais; requer `QA_BASE_URL` e Playwright. Não executar contra produção. Screenshots e relatório são gravados em `QA_OUTPUT`.

## Verificação final

TypeScript (`npx tsc --noEmit`) e build de produção (`npm run build`) aprovados. Foram verificadas 48 combinações: 12 rotas × 2 temas × larguras de 1440px e 390px, sem overflow de documento/conteúdo principal. Seis verificações de interação passaram sem exceções não tratadas: menu móvel, persistência de tema, preferência do sistema, modos de upload, adição de horário sem salvar e login inválido.

Comparação das funções existentes via AST confirmou os handlers de negócio preservados nas dez rotas comparadas; nenhuma alteração em `src/lib` ou `src/app/api`. Revisão independente confirmou a correção da sobreposição entre texto e Exportar em Métricas móvel. Screenshots finais do painel em `docs/previews/`. Registro consolidado em `docs/ui-verification.json`.
