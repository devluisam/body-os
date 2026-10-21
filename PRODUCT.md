# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Um único usuário: o próprio dono do app, atleta de Jiu-Jitsu. Ele acompanha peso, composição corporal, alimentação, treino e recuperação no dia a dia, principalmente pelo celular (PWA instalada no iPhone), com a meta de chegar a um campeonato dentro da categoria de peso. Não há outros públicos confirmados.

## Product Purpose

Sistema pessoal de composição corporal, performance e consistência. Serve para registrar rápido (peso, refeições, treinos, medidas, check-ins, fotos) e transformar esses registros em decisões conservadoras: média e tendência de peso, metas de calorias e proteína, plano do dia por refeição, readiness, projeção de peso e alertas de risco de recuperação. O sucesso é chegar ao evento na categoria com o desempenho preservado, sem métodos agressivos.

## Positioning

É um painel feito para um atleta só, com os dados dele, e não um app genérico de dieta. Ele conhece a pesagem com e sem kimono, as datas e categorias dos eventos e as fases (redução, preparação e outras), e diz claramente quando um número é estimativa, referência ou regra do próprio app. Nunca finge precisão.

## Operating Context

- Uso diário no celular: pesagem da manhã, refeições ao longo do dia, treinos de Jiu-Jitsu e musculação, check-in de sono, energia, fadiga, dor e estresse.
- Funciona offline para peso, refeições, treinos, medidas, check-ins e água, e sincroniza quando a conexão volta. Um selo no topo mostra se está sincronizado, pendente ou offline; registros ainda não enviados aparecem como “no aparelho”. Fotos, chat e exclusões exigem conexão.
- O dia alimentar só é “completo” quando o atleta o fecha; até lá os totais são parciais e ficam fora das médias.
- O resumo semanal é gerado ao abrir o app no domingo ou depois. Eventos passados são arquivados na abertura e têm revisão pós-evento.
- O assistente usa Ollama no PC (llama3.2:3b) ou roda em "modo básico" por regras, identificado na interface quando não há IA configurada.

## Capabilities and Constraints

- Stack: React 19 + TypeScript, rotas App Router executadas por Vinext/Vite em Cloudflare Workers (não é Next.js em Node). Tailwind CSS 4, shadcn/ui, Lucide e um gráfico SVG próprio (`app/chart.tsx`). D1/SQLite e R2 privado para fotos.
- Interface em português (pt-BR), com modo claro e escuro.
- O domínio fica em `lib/body.ts`, as decisões e leituras rotuladas (observação, estimativa, sugestão, dados insuficientes) em `lib/decisions.ts`, o contexto da IA em `lib/coach.ts`, as telas em `app/views.tsx` e os formulários em `app/forms.tsx`.
- As regras de cálculo estão documentadas no README (Mifflin–St Jeor, US Navy BF, janelas de 7 dias, divisão de refeições). As telas devem manter coerência com elas.
- Não há integração com Apple Health, Garmin ou WHOOP, nem push, cron em segundo plano, leitura de rótulo ou foto da comida, ou análise visual de BF.
- Supabase não está conectado. `supabase/schema.sql` é só base para uma futura migração.

## Brand Commitments

- Nome: BODY OS, editável nas configurações. Título: "BODY OS · Composição & Performance".
- Voz: direta e honesta sobre incerteza. Rotula estimativas como estimativas ("não é medição exata", "sugestão, não prescrição", "não validada clinicamente").

## Evidence on Hand

- Capturas em `docs/screenshots/` feitas com um atleta de demonstração de dados sintéticos.
- O banco começa vazio: uma conta nova não tem perfil preenchido, pesagem nem objetivos, e a tela inicial pede o perfil primeiro. Não existem pesagens históricas, fotos, BF ou medidas inventados. O repositório é público, então dados pessoais do atleta ficam só no banco, nunca no código ou nas capturas.
- O catálogo inicial de alimentos é aproximado.

## Product Principles

Os princípios abaixo vêm do README. O usuário ainda não os confirmou nesta entrevista.

1. **Nunca inventar dados.** Mostrar ausências como ausências e declarar quando o app está em modo básico ou fazendo estimativa.
2. **Segurança no corte de peso.** Proibido sugerir diuréticos, laxantes, vômito, desidratação severa, restrição extrema de água, sauna agressiva, jejum prolongado ou medicamentos não prescritos. Ajustes são sugestões conservadoras, nunca automáticos.
3. **Registrar deve ser rápido.** O registro diário precisa ser curto no celular e funcionar offline.
4. **Organização, não prescrição.** Metas e planos são pontos de partida editáveis, não acompanhamento profissional.
