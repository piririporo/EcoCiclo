# Decisões e validação

## Aplicação das skills

| Skill | Implementação concreta |
| --- | --- |
| frontend-design | Composição editorial da home, marca circular, paleta de esmeralda e verde suave, tipografia Manrope local e ilustrações originais de eletrônicos. |
| tailwind-design-system | Tailwind v4, tokens semânticos CSS, temas e Button/Modal no padrão shadcn, CVA e Radix. |
| responsive-design | Tipografia com clamp, grid fluido, menu e navegação inferior mobile, colunas adaptadas para formulários e painéis. |
| interaction-design | Transição curta entre etapas com Motion, foco de modais com Radix, feedback de validação e estados de carregamento, respeito a movimento reduzido. |
| threejs-animation | Cena procedural de placa, CPU e RAM em chunk sob demanda, animação independente da taxa de quadros, pausa, suspensão fora da tela, limpeza de recursos e fallback SVG. |
| vercel-react-best-practices | Páginas estáticas, módulos sob demanda, leituras independentes paralelas, recursos pesados isolados, imagens e fontes locais. |
| web-design-guidelines | Revisão de semântica, labels, foco visível, skip link, ícones com rótulos, mensagens aria-live, contraste e preferências de movimento. |
| webapp-testing | Verificação dos fluxos pelo Playwright disponibilizado no navegador gerenciado; os auxiliares de testes foram inspecionados com --help. A infraestrutura de prévia exige esse navegador, portanto não foi iniciado um navegador Python separado. |

## Verificações realizadas

- TypeScript estrito e build de produção Next.js com todas as rotas exportadas.
- Testes de upload (tipos inseguros, limites de bytes e quantidade), busca por especificações e qualidade de senha.
- Migração executada em PostgreSQL local descartável; testes verificam isolamento por RLS, proibição de autopromoção e autoaprovação, exigência de fotos, avaliação apenas por técnico, publicação apenas pelo responsável, estoque, pedido pendente, cancelamento e comprovantes de destinação.
- Inspeção da home no navegador; cadastro passa da primeira para a segunda etapa e impede avanço sem fotografia.
- O navegador gerenciado não dispõe de WebGL; o fallback SVG foi observado. A execução GPU da cena precisa ser verificada em um dispositivo com WebGL habilitado.

A validação local não equivale à validação do Supabase hospedado. A migração remota e a verificação de autenticação por e-mail dependem da conclusão das confirmações e da configuração do projeto.

## Refinamento da experiência no celular

- Cabeçalho fixo com carrinho acessível, menu em sheet com foco protegido e navegação inferior com indicação da página atual e respeito à área segura.
- Tipografia maior, campos com 16 px, áreas de toque de 44–52 px e modais adaptados à altura disponível. A barra inferior se recolhe quando a viewport indica teclado aberto durante a edição.
- Cadastro com progresso compacto, escolha de equipamentos em duas colunas, tipos adicionais por expansão e botão de captura de foto pelo seletor nativo.
- Abas dos módulos do painel disponíveis em telas pequenas; busca, filtros e ordenação reorganizados para toque.
- A cena Three.js não é carregada inicialmente em larguras de até 767 px; a ilustração SVG mantém o conceito com menor custo gráfico.
- Verificação no navegador com viewports de 320, 390, 768 e 1280 px: nenhuma rolagem horizontal global observada; menu e carrinho abriram/fecharam; formulário avançou de etapa; entradas de conta e cadastro mediram 16 px. Em 320 px, filtros mediram 44–46 px de altura e a ordenação 48 px.
- Validação feita por viewport em iframe de revisão local, sem alterar os controles de segurança do navegador. A captura real pela câmera, o teclado virtual e áreas seguras físicas ainda precisam ser conferidos em dispositivos iOS/Android; não foram simulados cadastros no banco hospedado.

## Paleta e publicação na Vercel

- Azul-petróleo define ações e navegação; cobre claro destaca o ciclo de recuperação. Os temas claro e escuro têm superfícies, texto e estados próprios.
- Contraste verificado nos pares principais: texto 12,09:1 / 14,85:1; botão principal 7,55:1 / 9,32:1; botão de destaque 8,47:1 / 7,52:1 (claro / escuro).
- Layout inspecionado em 390 px e 1280 px, preservando a navegação e os campos adaptados ao celular. TypeScript e exportação de produção passaram.
- A Vercel recebe a exportação estática de `out/`, sem arquivos de ambiente ou credenciais administrativas. A publicação não aplica a migração pendente do Supabase.
