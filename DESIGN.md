---
name: NEXOPOST Workspace
description: Interface compacta de publicação, baseada na referência aprovada pelo usuário.
colors:
  canvas-light: "#f7f9fc"
  surface-light: "#ffffff"
  border-light: "#e3e9f0"
  text-light: "#0c1924"
  muted-light: "#5b6d84"
  canvas-dark: "#09141d"
  surface-dark: "#101d27"
  border-dark: "#1e2e3b"
  text-dark: "#f2f5fa"
  muted-dark: "#a0b0c2"
  accent-light: "#6046ff"
  accent-dark: "#a08fff"
typography:
  body:
    fontFamily: "DM Sans, system-ui, sans-serif"
    fontSize: "13px"
    fontWeight: 400
  heading:
    fontFamily: "DM Sans, system-ui, sans-serif"
    fontSize: "18px"
    fontWeight: 700
    letterSpacing: "-0.025em"
rounded:
  control: "6px"
  panel: "9px"
spacing:
  compact: "8px"
  group: "16px"
  section: "24px"
components:
  sidebar:
    width: "216px"
  header:
    height: "76px"
  panel:
    rounded: "{rounded.panel}"
  primary-action:
    backgroundColor: "#0b1721"
    textColor: "#ffffff"
    rounded: "{rounded.control}"
---

## Overview

Modo Operate: leitura rápida, consistência e preservação dos fluxos reais. A referência enviada pelo usuário define a direção. Não adicionar controles ou métricas fictícias para preencher a composição.

## Colors

Tokens normativos `--nexo-*` em `src/app/globals.css`. Fundo claro frio e superfície branca; fundo escuro azul-preto e superfície azul escura. Violeta para seleção e recursos de IA; verde, âmbar e vermelho identificam status. Ação principal preta no tema claro e branca no escuro.

## Typography

DM Sans no aplicativo, com títulos de 18px, seções de 13–15px e rótulos de 11–13px. Números tabulares. A página pública mantém a hierarquia tipográfica existente com Sora.

## Layout

`AppShell` centraliza navegação, cabeçalho e conteúdo nas dez rotas internas. Sidebar fixa acima de 1024px; drawer móvel com Escape, contenção de foco, conteúdo inerte e bloqueio de rolagem. Conteúdo até 1480px e formulários focados até 1100px. Espaçamento reduzido abaixo de 640px.

## Elevation & Depth

Painéis definidos por borda de 1px, sem sombra decorativa. Notificações usam elevação discreta e fechamento por Escape/clique externo.

## Shapes

Controles de 6px e painéis de 8–10px conforme a referência. Pills reservadas para status. Calendário com células separadas por contornos finos.

## Components

`ThemeProvider`: claro, escuro e sistema; persistência, sincronização entre abas e acompanhamento da preferência do sistema. `Header` e `Sidebar`: identidade e navegação compartilhadas. `AuthLayout`: login/cadastro com contexto do produto e tema acessível. `nexo-panel`: superfície comum dos formulários, métricas e configurações. `nexo-upload-tabs`: seleção individual/massa por `aria-pressed`.

## Do's and Don'ts

Preservar handlers, endpoints e validações. Usar dados reais e estados vazios acionáveis. Seguir tokens para novas telas. Não copiar números da referência, adicionar gradientes decorativos ou esconder funcionalidades para simplificar o visual.
