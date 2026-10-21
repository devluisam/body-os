---
name: BODY OS
description: Painel pessoal de composição corporal e performance no Jiu-Jitsu.
colors:
  verde-sinal: "#c3f576"
  tinta-musgo: "#18210d"
  carvao-verde: "#101412"
  carvao-lateral: "#141915"
  grafite-folha: "#191e1b"
  superficie-botao: "#252d27"
  borda-musgo: "#2b332d"
  borda-campo: "#303a32"
  selecao-musgo: "#273021"
  selecao-aba: "#34402d"
  faixa-destaque: "#24301e"
  borda-destaque: "#34482a"
  texto-nevoa: "#edf2ee"
  texto-liquen: "#99a59e"
  carbo-ceu: "#84b9db"
  gordura-ambar: "#efa26b"
  treino-ouro: "#e0bb77"
  erro-salmao: "#ffada1"
  claro-fundo: "#f3f5f2"
  claro-cartao: "#ffffff"
  claro-texto: "#17211a"
  claro-texto-suave: "#5a6c5e"
  claro-borda: "#dce3d9"
  claro-verde: "#3b671a"
typography:
  display:
    fontFamily: "Arial, Helvetica, sans-serif"
    fontSize: "30px"
    fontWeight: 600
    lineHeight: 1.2
    letterSpacing: "-1.1px"
  headline:
    fontFamily: "Arial, Helvetica, sans-serif"
    fontSize: "34px"
    fontWeight: 500
    lineHeight: 1.15
    letterSpacing: "-1px"
  title:
    fontFamily: "Arial, Helvetica, sans-serif"
    fontSize: "18px"
    fontWeight: 600
    lineHeight: 1.5
  body:
    fontFamily: "Arial, Helvetica, sans-serif"
    fontSize: "14px"
    fontWeight: 400
    lineHeight: 1.7
  label:
    fontFamily: "Arial, Helvetica, sans-serif"
    fontSize: "12px"
    fontWeight: 400
    lineHeight: 1.5
    letterSpacing: "0px"
rounded:
  xs: "4px"
  sm: "7px"
  md: "10px"
  lg: "14px"
  pill: "20px"
spacing:
  xs: "8px"
  sm: "12px"
  md: "16px"
  lg: "22px"
  xl: "38px"
components:
  button-primary:
    backgroundColor: "{colors.verde-sinal}"
    textColor: "{colors.tinta-musgo}"
    rounded: "{rounded.sm}"
    padding: "11px 16px"
    height: "44px"
  button-secondary:
    backgroundColor: "{colors.superficie-botao}"
    textColor: "{colors.texto-nevoa}"
    rounded: "{rounded.sm}"
    padding: "11px 16px"
    height: "44px"
  input:
    backgroundColor: "{colors.carvao-verde}"
    textColor: "{colors.texto-nevoa}"
    rounded: "{rounded.sm}"
    padding: "11px 12px"
  card:
    backgroundColor: "{colors.grafite-folha}"
    rounded: "{rounded.md}"
    padding: "22px"
  card-destaque:
    backgroundColor: "{colors.faixa-destaque}"
    rounded: "{rounded.md}"
    padding: "19px 21px"
  pill:
    textColor: "{colors.verde-sinal}"
    rounded: "{rounded.pill}"
    padding: "5px 10px"
  nav-item-active:
    backgroundColor: "{colors.selecao-musgo}"
    textColor: "{colors.verde-sinal}"
    rounded: "{rounded.sm}"
    padding: "12px"
  tab-selected:
    backgroundColor: "{colors.selecao-aba}"
    textColor: "{colors.verde-sinal}"
    rounded: "5px"
    padding: "7px 12px"
---

# Design System: BODY OS

## Overview

**Creative North Star: "O Painel do Atleta"**

O BODY OS é um instrumento de precisão, como o painel de um carro à noite. O fundo é um carvão esverdeado quase preto, os números aparecem grandes e com a unidade sempre ao lado, e um único verde-lima acende apenas o que pede atenção agora: a ação principal, o item ativo, a média que importa. Todo o resto fica em tons de musgo e líquen, recuando para que o dado apareça e a interface desapareça.

O clima é calmo e focado. A densidade é moderada: poucos blocos por tela, cada um com um número principal e uma legenda honesta ("Estimativa aproximada", "Sem kimono · 2026-09-19"). A profundidade vem da variação de tom, não de sombras. Não há confete, conquistas ou alarme visual. Um valor ausente aparece como travessão, nunca como zero inventado.

O visual rejeita três coisas: o app fitness genérico (laranja ou vermelho de academia, fotos de modelo sarado, frases de motivação agressivas), a gamificação (badges, sequências com fogo, mascotes) e o dashboard corporativo (muitos gráficos coloridos sem hierarquia).

**Key Characteristics:**
- Escuro por padrão, com tema claro equivalente em verde-oliva.
- Um só acento (verde-sinal), usado com parcimônia.
- Números como protagonistas, com a unidade em corpo menor e cor suave.
- Superfícies planas separadas por borda de 1px e degraus de tom.
- Pensado primeiro para o celular: alvos de toque de 44px, gaveta lateral e feedback de pressão.

## Colors

É uma paleta monocromática de musgos quase pretos com um único verde elétrico. As cores de apoio aparecem apenas para codificar dados.

### Primary
- **Verde-Sinal** (`verde-sinal`): o único acento. Aparece no botão primário, no item de navegação ativo, na aba selecionada, nas pills, no ícone do cartão Hoje, no anel de calorias, na linha de média de 7 dias e no anel de foco. No código é sempre `var(--primary)`, nunca o hex fixo, para que o tema claro troque o tom. Sobre ele, o texto usa **Tinta-Musgo** (`tinta-musgo`).

### Secondary
- **Céu de Carbo** (`carbo-ceu`): carboidratos nos medidores e BF (%) no gráfico de composição.
- **Âmbar de Gordura** (`gordura-ambar`): gorduras nos medidores e massa gorda no gráfico.
- **Ouro de Treino** (`treino-ouro`): ícone dos blocos de treino, sobre fundo oliva escuro (#333126).

### Neutral
- **Carvão Verde** (`carvao-verde`): fundo da página e dos campos de formulário.
- **Carvão Lateral** (`carvao-lateral`): fundo da barra lateral, um degrau acima da página.
- **Grafite Folha** (`grafite-folha`): cartões, modais e mensagens do assistente.
- **Superfície de Botão** (`superficie-botao`): botão secundário. Os atalhos rápidos usam um tom vizinho (#202822).
- **Borda Musgo** (`borda-musgo`): todas as bordas de 1px, divisores e linhas de tabela.
- **Borda de Campo** (`borda-campo`): contorno de inputs e selects.
- **Seleção Musgo** e **Seleção de Aba** (`selecao-musgo`, `selecao-aba`): fundo do item ativo na navegação e nas abas.
- **Faixa de Destaque** (`faixa-destaque`, com `borda-destaque`): início do gradiente do cartão Hoje e dos blocos de campeonato.
- **Texto Névoa** (`texto-nevoa`): texto principal e números.
- **Texto Líquen** (`texto-liquen`): legendas, unidades, parágrafos e rótulos secundários.
- **Salmão de Erro** (`erro-salmao`, token `--danger`): mensagens de erro e o texto do botão de confirmação destrutiva. No tema claro vira #a3382a.

### Séries de gráfico e superfícies auxiliares
- `--chart-weight` (#7b8d77 / claro #8b9a86): peso diário. `--chart-carb` (#84b9db / claro #2f77a6) e `--chart-fat` (#efa26b / claro #b8622a): carboidrato, gordura e BF. A média de 7 dias usa sempre `--primary`.
- `--sunken` (#141915 / claro #eef2eb): caixas de fato secundário dentro de um cartão (média e tendência do peso, prévia de restauração).
- Rótulo de campo: #b7c2ba no escuro, #52634b no claro.

### Tema claro
Os tokens `claro-*` substituem os neutros em `[data-theme="light"]`. O acento passa a ser o **Verde Claro** (`claro-verde`) com texto branco, porque o verde-sinal perde contraste sobre fundo claro. Os destaques viram gradientes de pistache (#e5efdc → #f2f6ed).

### Named Rules
**The One Signal Rule.** O verde-sinal marca apenas o que está ativo, selecionado ou é a próxima ação. Se ele aparecer em mais de um botão por bloco, um deles está errado.

**The Data-Only Color Rule.** Azul, âmbar e ouro existem apenas para distinguir séries e macros. Nunca decoram botões, fundos ou títulos.

## Typography

**Display Font:** Arial (com Helvetica, sans-serif)
**Body Font:** Arial (com Helvetica, sans-serif)

**Character:** Uma única família neutra, sem personalidade tipográfica própria. A hierarquia vem do tamanho, do peso e do tracking negativo nos números grandes, como na leitura de um instrumento.

### Hierarchy
- **Display** (`display`): o h1 da página. Na Visão geral é a data por extenso ("Sábado, 26 de setembro"); nas outras seções, o nome da seção. Não há slogan. Fica com 34px em telas ≥1500px, 25px até 1100px e 28px no celular.
- **Headline** (`headline`): os valores de estatística (peso, média, readiness). A unidade vem ao lado em 14px na cor Texto Líquen, com espaçamento normal. O número do anel de calorias usa 31px no mesmo estilo.
- **Title** (`title`): o h2 das seções. Nos cabeçalhos de cartão usa 16px e, no celular, 15px.
- **Body** (`body`): parágrafos e legendas longas, em Texto Líquen. A interface usa 14px em quase tudo; a base do documento é 16px com altura de linha 1.5.
- **Label** (`label`): rótulos curtos acima de um título ("Próximo registro", "Fase atual"), em 12px, caixa normal e sem tracking. Não há eyebrows em caixa alta acima dos títulos; o contexto de um cartão vai numa legenda abaixo do h2 (`small`), como em "Evolução corporal / Peso diário e média móvel de 7 dias".

No celular, campos de formulário usam 16px: abaixo disso o Safari do iPhone dá zoom ao focar. É a única exceção à rampa acima.

### Named Rules
**The Unit-Beside Rule.** Todo número grande vem com a unidade ao lado, menor e mais suave (kg, %, cm, kcal). Um número sem unidade é um número ambíguo. O inverso também vale: o travessão de valor ausente aparece sozinho, em Texto Líquen, sem unidade ("—", nunca "— %" ou "—/100").

## Layout

O desktop tem uma barra lateral fixa de 240px (210px até 1100px), com a marca, a navegação e a fase atual no rodapé, e a área principal com margem igual à largura dela. Não há barra superior nem footer no desktop. O conteúdo fica num `main` de até 1500px, com padding de 40px 38px.

A Visão geral segue esta ordem: cabeçalho (data, contagem até o evento e objetivo, com o selo de sincronização à direita), cartão Hoje, grade principal 1.65fr/1fr (painel de peso e alimentação de hoje), leituras dos dados, grade inferior de 3 colunas (treino, recuperação, evento ou composição) e a barra de registro rápido (só no desktop). As outras seções começam pelo h1 e por uma barra de ferramentas com a ação primária. O espaçamento entre blocos fica em torno de 22px e, dentro da grade de estatísticas, em 16px.

A seção aberta vive no hash da URL (`#Alimentação`), que é a fonte da verdade: links diretos abrem a seção certa, e o voltar do navegador ou o gesto de voltar do iOS troca de seção.

Breakpoints: em 1100px as grades apertam. Entre 761px e 960px (tablet em pé) a barra lateral fica, as estatísticas passam a 2 colunas e a grade principal vira 1 coluna. Em 760px a barra lateral vira gaveta com scrim, aparece uma topbar de 56px com a marca e a fase, e uma barra inferior fixa (Hoje, Peso, Refeição, Check-in, Menu) substitui o registro rápido. As estatísticas ficam em 2 colunas e as grades em 1.

## Elevation & Depth

O sistema é plano. Não há sombras em cartões, botões ou campos. A profundidade vem de degraus de tom (página → barra lateral → cartão → botão, cada um um pouco mais claro) e de bordas de 1px em Borda Musgo. Os blocos de destaque usam um gradiente horizontal sutil de oliva escuro para musgo, com borda mais verde. As camadas sobrepostas (modal, gaveta) usam um scrim preto translúcido, e o fundo do modal ganha `backdrop-filter: blur(5px)`.

### Named Rules
**The Flat Instrument Rule.** Nada flutua em repouso. Uma superfície se destaca porque é um tom mais clara ou tem um gradiente de destaque, nunca por causa de uma sombra.

## Shapes

As formas são retangulares com cantos levemente suavizados. Botões, campos, abas e itens de navegação usam 7px (`rounded.sm`). Cartões e toasts usam 10px (`rounded.md`) e modais, 14px (`rounded.lg`). Pills têm 20px, avatares são círculos e o anel de calorias é um círculo completo com traço de 8px. As barras de progresso são trilhos de 5px com pontas arredondadas. Os slots de foto usam borda tracejada para indicar espaço vazio.

## Components

### Buttons
Botões firmes e silenciosos, que afundam ao toque.
- **Shape:** cantos suaves (7px), altura mínima de 44px, 14px em peso 600.
- **Primary:** fundo Verde-Sinal com texto Tinta-Musgo. Só existe um por contexto.
- **Secondary:** fundo Superfície de Botão com borda Borda Musgo.
- **Hover / Focus:** no hover, `brightness(1.08)`, apenas em dispositivos com ponteiro fino. O foco usa contorno de 2px em Verde-Sinal com offset de 3px. Ao pressionar, `scale(0.97)` em 160ms com a curva ease-out.
- **Text button:** texto em Verde-Sinal sem fundo, altura mínima de 40px.

### Chips (Pills)
- **Style:** fundo transparente, borda de 1px (#465b34), texto em Verde-Sinal a 12px, formato cápsula. Indicam a fase ou o status (por exemplo, "Redução de gordura").

### Cards / Containers
- **Corner Style:** 10px.
- **Background:** Grafite Folha. Os cartões de destaque usam o gradiente Faixa de Destaque.
- **Shadow Strategy:** nenhuma (ver Elevation & Depth).
- **Border:** 1px em Borda Musgo.
- **Internal Padding:** 22px (19px no celular). Os cartões de estatística usam 19px 20px.

### Inputs / Fields
- **Style:** fundo Carvão Verde (mais escuro que o cartão, dando sensação de campo rebaixado), borda em Borda de Campo, 7px, padding de 11px 12px. O rótulo fica acima, em 14px e tom #b7c2ba.
- **Focus:** contorno de 2px em Verde-Sinal.
- **Error:** texto em Salmão de Erro.

### Navigation
- **Style:** itens de 14px com ícone Lucide, padding de 12px, texto #a5afa8. O item ativo ganha fundo Seleção Musgo e texto Verde-Sinal. No hover, apenas com ponteiro fino, o fundo muda para #242d25. O rótulo de seção fica em caixa alta com tracking de 1.5px.
- **Mobile:** vira uma gaveta lateral que abre com a curva de gaveta do iOS (320ms), sobre um scrim que esmaece.

### Tabs (seletor de período)
- **Style:** trilho com fundo da página, borda e padding de 4px. A aba selecionada ganha fundo Seleção de Aba e texto Verde-Sinal e expõe `aria-pressed`. Trocar de aba não tem animação. As abas de período do gráfico (30d/60d/90d) têm no mínimo 44×34px e nunca quebram de linha.

### Anel de calorias e medidores (signature)
O anel usa `conic-gradient` com a variável `--progress`: Verde-Sinal sobre um trilho #323c2d, com o miolo em cor de cartão e o número restante no centro. Os medidores de macro são trilhos de 5px, com o preenchimento em `transform: scaleX()` em vez de `width`. Proteína usa Verde-Sinal, carboidratos Céu de Carbo e gorduras Âmbar de Gordura. Os dois deslizam até o novo valor em 500ms com ease-in-out, sem animar na montagem.

### Cartão Hoje (signature)
É o primeiro bloco da Visão geral e mostra uma única ação: o próximo registro do dia, na ordem em que o dia acontece (pesagem da manhã, depois check-in, depois a próxima refeição do plano; com tudo feito, sugere registrar o treino). Tem ícone em quadrado oliva, o rótulo "Próximo registro", o título da ação, uma frase de contexto e, abaixo, o estado dos registros do dia em pills (Pesagem · Check-in · Refeições 2/6), com check verde quando feito e círculo vazado quando pendente. À direita ficam o único botão primário da tela e um link "Orientação do dia" para o Assistente. Usa o gradiente de destaque. No celular, o botão ocupa a largura toda, embaixo do texto.

### Painel de peso (signature)
O número da última pesagem em 34px, com a unidade ao lado e, abaixo, há quanto tempo foi feita ("hoje", "há 25 dias"). Com mais de 3 dias, a idade ganha um anel verde-sinal e o convite para pesar de novo. Ao lado, duas caixas rebaixadas: média de 7 dias e tendência semanal, cada uma com a base ("1 de 3 pesagens nesta semana"). Sem base, travessão. O gráfico SVG quebra a linha em intervalos de mais de 7 dias, desenha a referência informada como ponto vazado e só traça a média onde a janela tem 3 pesagens.

### Leituras dos dados
Lista sem cartões internos: cada item tem uma etiqueta de tipo (observação com borda sólida neutra, estimativa tracejada, sugestão em verde-sinal, dados insuficientes pontilhada com texto suave), o texto e a linha "Base: …". Nunca usa faixa lateral colorida.

### Estado do dia e sincronização
Cápsulas de 12px: "Sem registro" neutra, "Dia em andamento" e "Incompleto" tracejadas, "Dia completo" em verde-sinal. O selo de sincronização segue o mesmo desenho (sólido quando sincronizado, tracejado quando pendente ou offline) e é um botão que sincroniza na hora. Registros não enviados levam o selo "no aparelho", tracejado.

### Escala 0–10
Rádios nativos visualmente ocultos sobre 11 casas de 40–44px; a escolhida vira um bloco verde-sinal com Tinta-Musgo. Abaixo, as âncoras dos extremos ("0 = descansado · 10 = exausto"). Nada vem marcado: escala intocada é "não respondido". Campos opcionais ficam em "Mais detalhes".

### Nota explicativa (`.insight`)
Texto de método ou contexto ("Horários e divisão são sugestões de rotina…"). Fica num painel com um leve tom do Verde-Sinal (5%), borda de 1px e raio de 8px. Nunca usa faixa lateral colorida.

### Diálogo de confirmação
Exclusões e descartes usam um diálogo do próprio app, nunca `window.confirm`. O título é a pergunta ("Excluir esta foto?") e a descrição, a consequência ("O arquivo é apagado… e não pode ser recuperado."). Os botões são Cancelar (secundário, com o foco inicial) e a ação destrutiva, com texto Salmão de Erro sobre a superfície neutra, sem bloco vermelho. No celular vira bottom sheet, como os formulários.

### Perguntas frequentes
Em Configurações, os critérios e limitações do app ficam num acordeão de `<details>` com linhas de 52px e um chevron que gira 90° ao abrir. As referências aparecem abaixo, uma por linha.

## Do's and Don'ts

### Do:
- **Do** manter o Verde-Sinal como único acento, e apenas em ação primária, item ativo, foco e série principal.
- **Do** mostrar cada número grande com a unidade ao lado, em 14px na cor Texto Líquen.
- **Do** representar dados ausentes com travessão ("—") sem unidade e uma legenda honesta, sem mostrar zero.
- **Do** manter um único botão primário por tela. Na Visão geral ele fica no cartão Hoje.
- **Do** criar profundidade com degraus de tom e bordas de 1px (Borda Musgo).
- **Do** garantir alvos de toque de 44px, hover só em `(hover: hover) and (pointer: fine)` e respeito a `prefers-reduced-motion`.
- **Do** repetir cada token de cor no bloco `[data-theme="light"]` ao criar uma nova superfície.
- **Do** mostrar a base de toda média, tendência ou sugestão (período e quantidade de registros) e distinguir "não medido" de zero.

### Don't:
- **Don't** usar laranja ou vermelho de academia, fotos de modelo ou frases motivacionais agressivas. O BODY OS não é um app fitness genérico.
- **Don't** adicionar badges, sequências com fogo, confete, mascotes ou qualquer gamificação.
- **Don't** encher uma tela com gráficos multicoloridos sem hierarquia, no estilo de dashboard corporativo.
- **Don't** usar azul, âmbar ou ouro fora da codificação de dados.
- **Don't** adicionar sombras a cartões ou botões em repouso.
- **Don't** animar ações repetidas, como troca de aba, nem animar barras e anéis na montagem.
- **Don't** usar eyebrows em caixa alta, slogans no cabeçalho ou footer institucional. É um painel pessoal, não um site.
