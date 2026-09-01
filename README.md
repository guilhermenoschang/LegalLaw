# Legal Flow OS

Sistema web para rotina de estudos juridicos, produtividade e apoio de IA.

## Status real

Este repositorio e um MVP tecnico inicial, nao um produto juridico pronto.

Funcional hoje:

- interface React/Vite com dashboard, tarefas, foco, projetos, metas, agenda, estudos, Constituicao, quiz, calculadora e configuracoes;
- persistencia local via Zustand/localStorage;
- login Google quando Firebase estiver configurado;
- sincronizacao simples em `users/{userId}/appState/main`;
- endpoint serverless `/api/ai` para evitar chave de IA no frontend;
- avisos de uso educacional nos modulos juridicos sensiveis.
- Constituicao com snapshot oficial importado e botao de atualizacao;
- Codigo Penal com catalogo de dispositivos que possuem cominacao de pena;
- registro de sessoes de estudo para continuar o que foi estudado;
- Agenda com Google Calendar mais explicito e criacao de evento no Google quando conectado.
- tarefas com prazo, bloco de horario e exibicao dentro da Agenda semanal.
- metas levadas ao Dashboard com progresso individual, sinal de atencao e acao rapida.

Ainda nao vender como pronto:

- base juridica completa e atualizada;
- documentos com IA;
- CRM/escritorio;
- calculadora penal profissional;
- Google Calendar bidirecional completo;
- dosimetria penal profissional para caso concreto;
- controle fino de custos e quotas de IA;
- testes automatizados e auditoria de seguranca completa.

## Stack

| Camada | Tecnologia |
|---|---|
| Frontend | React 18 + Vite |
| Estilizacao | Tailwind CSS |
| Estado local | Zustand + persist |
| Login/sync | Firebase Auth + Firestore |
| IA | Endpoint `/api/ai` com Gemini ou Anthropic server-side |
| Calendario | Google Calendar API, ainda experimental |
| Hospedagem sugerida | Netlify ou Vercel |

## Setup

```bash
npm install
npm run dev
```

Build:

```bash
npm run build
```

Auditoria de dependencias:

```bash
npm run audit:deps
```

## Deploy no Netlify

Este pacote ja inclui `netlify.toml`.

Use estas configuracoes no Netlify:

```text
Build command: npm run build
Publish directory: dist
Functions directory: netlify/functions
```

Variaveis que devem ser cadastradas em Site configuration > Environment variables:

```env
AI_PROVIDER=gemini
GEMINI_API_KEY=
GEMINI_MODEL=gemini-1.5-flash

VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_STORAGE_BUCKET=
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=
VITE_GOOGLE_CLIENT_ID=
VITE_GOOGLE_API_KEY=
```

Se preferir Anthropic:

```env
AI_PROVIDER=anthropic
ANTHROPIC_API_KEY=
ANTHROPIC_MODEL=claude-sonnet-4-20250514
```

Depois que o Netlify gerar a URL final, adicione o dominio:

- no Firebase Authentication, em Authorized domains;
- no Google Cloud OAuth Client, em Authorized JavaScript origins;
- na Google Calendar API, mantendo a API habilitada no projeto correto.

Sem essas autorizacoes, o site pode abrir normalmente, mas login Google e Google Calendar nao vao autenticar.

## Variaveis de ambiente

Copie `.env.example` para `.env`.

Variaveis publicas usadas pelo frontend:

```env
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_STORAGE_BUCKET=
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=
VITE_GOOGLE_CLIENT_ID=
VITE_GOOGLE_API_KEY=
```

Variaveis secretas server-side:

```env
AI_PROVIDER=gemini
GEMINI_API_KEY=
GEMINI_MODEL=gemini-1.5-flash

# ou
AI_PROVIDER=anthropic
ANTHROPIC_API_KEY=
ANTHROPIC_MODEL=claude-sonnet-4-20250514
```

Nunca use `VITE_ANTHROPIC_API_KEY`, `VITE_GEMINI_API_KEY` ou equivalente. Qualquer variavel `VITE_` pode ir para o bundle do navegador.

## Firebase

Estrutura inicial:

```text
users/{userId}/appState/main
```

Publique as regras de `firestore.rules`:

```js
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId}/{document=**} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

## IA

O frontend chama:

```text
POST /api/ai
```

O endpoint escolhe o provedor por `AI_PROVIDER`.

Isso cria um ponto unico para limites, logs, custos e filtros antes de escalar.

## Fontes juridicas

O projeto inclui snapshots em `public/legal`, gerados por:

```bash
npm run update:legal
```

Fontes usadas:

- Constituicao Federal: https://www.planalto.gov.br/ccivil_03/constituicao/constituicao.htm
- Codigo Penal: https://www.planalto.gov.br/ccivil_03/decreto-lei/del2848compilado.htm

As anotacoes do usuario ficam separadas do texto legal. Assim, uma atualizacao da fonte oficial pode trocar o texto importado sem apagar notas e favoritos.

## Agenda e Google

Para ligar de primeira:

1. Configure `VITE_GOOGLE_CLIENT_ID` e `VITE_GOOGLE_API_KEY`.
2. Habilite Google Calendar API no Google Cloud.
3. Autorize a origem local/deploy.
4. Clique em `Conectar Google Calendar` na Agenda.

Depois de conectado, a tela permite sincronizar eventos e criar novos eventos tambem no Google Calendar.

As tarefas tambem entram na Agenda:

- tarefas com `scheduledStart` e `scheduledEnd` aparecem como blocos no calendario;
- tarefas com prazo na semana, mas sem horario, aparecem na lateral para planejamento;
- ao criar/editar tarefa, informe prazo, inicio e fim na agenda.

## Posicionamento recomendado do MVP

Nao vender como "sistema juridico completo".

Mensagem mais segura e comercial:

> Organize sua rotina de estudos juridicos, revise com flashcards, gere questoes e acompanhe sua evolucao em um unico lugar.

Escopo para validar primeiro:

- tarefas;
- pomodoro;
- flashcards;
- quiz IA;
- cronograma de estudos;
- dashboard de evolucao.

No Dashboard, as metas aparecem como cockpit de execucao:

- metas mais atrasadas primeiro;
- progresso por meta;
- status de ritmo;
- incremento rapido;
- atalho para abrir a area de Metas.

Documentos juridicos, calculadora penal avancada, legislacao completa e area empresarial ficam para fases futuras.
