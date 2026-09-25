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
    letterSpacing: "1.4px"
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
- **Verde-Sinal** (`verde-sinal`): o único acento. Aparece no botão primário, no item de navegação ativo, na aba selecionada, nas pills, no eyebrow das páginas, no anel de calorias, na linha de média de 7 dias e no anel de foco. Sobre ele, o texto usa **Tinta-Musgo** (`tinta-musgo`).

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
- **Faixa de Destaque** (`faixa-destaque`, com `borda-destaque`): início do gradiente dos blocos de objetivo, próximo passo e campeonato.
- **Texto Névoa** (`texto-nevoa`): texto principal e números.
- **Texto Líquen** (`texto-liquen`): legendas, unidades, parágrafos e rótulos secundários.
- **Salmão de Erro** (`erro-salmao`): mensagens de erro.

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
- **Display** (`display`): o h1 da página ("Sua melhor versão, todos os dias."). Fica com 34px em telas ≥1500px, 25px até 1100px e 28px no celular, com largura máxima de 340px.
- **Headline** (`headline`): os valores de estatística (peso, média, readiness). A unidade vem ao lado em 14px na cor Texto Líquen, com espaçamento normal. O número do anel de calorias usa 31px no mesmo estilo.
- **Title** (`title`): o h2 das seções. Nos cabeçalhos de cartão usa 16px e, no celular, 15px.
- **Body** (`body`): parágrafos e legendas longas, em Texto Líquen. A interface usa 14px em quase tudo; a base do documento é 16px com altura de linha 1.5.
- **Label** (`label`): eyebrows, rótulos de navegação e faixas de destaque, em caixa alta e com tracking de 1–1.5px. O eyebrow usa Verde-Sinal e cai para 10px no celular.

### Named Rules
**The Unit-Beside Rule.** Todo número grande vem com a unidade ao lado, menor e mais suave (kg, %, cm, kcal). Um número sem unidade é um número ambíguo.

## Layout

O desktop tem uma barra lateral fixa de 240px (210px até 1100px) e a área principal com margem igual à largura dela. A barra superior tem 75px, com breadcrumb e rótulo "Espaço pessoal". O conteúdo fica num `main` de até 1500px, com padding de 36px 38px.

A página segue sempre esta ordem: cabeçalho (eyebrow, h1 e subtítulo, com a ação primária à direita), faixa de objetivo, grade de 4 estatísticas, grade principal 1.65fr/1fr (gráfico e alimentação) e grade inferior de 3 colunas. O espaçamento entre blocos fica em torno de 22px e, dentro da grade de estatísticas, em 16px.

Breakpoints: em 1100px as grades apertam e a pill da faixa de objetivo some. Em 760px a barra lateral vira gaveta com scrim, a topbar cai para 61px, as estatísticas passam a 2 colunas, as grades viram 1 coluna e a ação do cabeçalho desce para baixo do título.

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
- **Style:** trilho com fundo da página, borda e padding de 4px. A aba selecionada ganha fundo Seleção de Aba e texto Verde-Sinal. Trocar de aba não tem animação.

### Anel de calorias e medidores (signature)
O anel usa `conic-gradient` com a variável `--progress`: Verde-Sinal sobre um trilho #323c2d, com o miolo em cor de cartão e o número restante no centro. Os medidores de macro são trilhos de 5px. Proteína usa Verde-Sinal, carboidratos Céu de Carbo e gorduras Âmbar de Gordura. Os dois deslizam até o novo valor em 500ms com ease-in-out, sem animar na montagem.

### Faixa de objetivo (signature)
É um bloco horizontal com ícone em quadrado oliva, rótulo em caixa alta, a frase do objetivo e uma pill de fase à direita. Aparece sobre o gradiente de destaque.

## Do's and Don'ts

### Do:
- **Do** manter o Verde-Sinal como único acento, e apenas em ação primária, item ativo, foco e série principal.
- **Do** mostrar cada número grande com a unidade ao lado, em 14px na cor Texto Líquen.
- **Do** representar dados ausentes com travessão ("—") e uma legenda honesta, sem mostrar zero.
- **Do** criar profundidade com degraus de tom e bordas de 1px (Borda Musgo).
- **Do** garantir alvos de toque de 44px, hover só em `(hover: hover) and (pointer: fine)` e respeito a `prefers-reduced-motion`.
- **Do** repetir cada token de cor no bloco `[data-theme="light"]` ao criar uma nova superfície.

### Don't:
- **Don't** usar laranja ou vermelho de academia, fotos de modelo ou frases motivacionais agressivas. O BODY OS não é um app fitness genérico.
- **Don't** adicionar badges, sequências com fogo, confete, mascotes ou qualquer gamificação.
- **Don't** encher uma tela com gráficos multicoloridos sem hierarquia, no estilo de dashboard corporativo.
- **Don't** usar azul, âmbar ou ouro fora da codificação de dados.
- **Don't** adicionar sombras a cartões ou botões em repouso.
- **Don't** animar ações repetidas, como troca de aba, nem animar barras e anéis na montagem.
