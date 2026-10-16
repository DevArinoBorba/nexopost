# Integração NexoPost ↔ Agente Hermes (Automação de Agência via WhatsApp & MCP)

> **Documento de Especificação de Arquitetura e Roteiro de Implementação**  
> **Objetivo:** Permitir que o Agente Hermes (orquestrado via WhatsApp na mesma VPS da agência) comande o NexoPost para agendamento, publicação e consulta de métricas de múltiplos clientes, preservando a arquitetura multi-tenant do NexoPost como futuro SaaS.

---

## 1. Visão Geral e Princípios Arquiteturais

O NexoPost está sendo construído para se tornar um **SaaS comercial multi-tenant**, enquanto o **Hermes** é o agente de IA operacional da sua agência que possui acesso ao cofre de arquivos, banco de dados, logos e diretrizes de cada cliente.

Para garantir escalabilidade, segurança e zero acoplamento indevido, a integração adota o padrão em duas camadas:

```
┌────────────────────────────────────────────────────────────────────────┐
│                        SUA AGÊNCIA / WHATSAPP                         │
│  "Hermes, agenda o vídeo novo da Gordinho Celulares pra terça às 18h"  │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                           AGENTE HERMES                                │
│  • Localiza o arquivo de vídeo no cofre/disco da VPS                   │
│  • Usa o contexto da marca do cliente                                  │
│  • Dispara a ferramenta MCP nativa: `nexopost_schedule_post()`         │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ (Protocolo MCP / Stdio ou SSE)
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                        NEXOPOST MCP SERVER                             │
│       (Camada leve que expõe as ferramentas de IA para o Hermes)       │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ (HTTP REST: Authorization: Bearer nex_live_...)
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                      NEXOPOST CORE (Seu SaaS)                          │
│  • Rotas REST em /api/v1/* com autenticação via API Key                │
│  • Isolamento por Perfil (profile_id) no SQLite                        │
│  • Motor de agendamento (/api/scheduler/run) e publicadores sociais    │
└────────────────────────────────────────────────────────────────────────┘
```

### Por que essa abordagem é superior:
1. **O NexoPost continua 100% SaaS:** Ele não possui código customizado do Hermes em seu núcleo. Ele apenas expõe uma API REST segura com API Keys que no futuro você poderá vender para qualquer usuário.
2. **O Hermes ganha ferramentas nativas (MCP):** O Hermes não precisa aprender endpoints HTTP manuais; ele recebe ferramentas com esquemas JSON prontos, podendo raciocinar de forma autônoma.
3. **Isolamento e Segurança Multi-Cliente:** Cada cliente cadastrado no NexoPost possui sua própria chave de API (`nex_live_...`). O Hermes armazena a chave de cada cliente no seu cofre seguro.
4. **Zero Custo de Tráfego (Localhost):** Ambos residindo na mesma VPS, a comunicação roda internamente (`http://localhost:3000`), sem latência de internet e sem gastar banda pública.

---

## 2. Camada 1: API REST do NexoPost (`/api/v1/`)

O NexoPost deve expor endpoints padrão sob o prefixo `/api/v1/`, protegidos por um cabeçalho de autorização:
```http
Authorization: Bearer nex_live_xxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

### 2.1. Estrutura de Banco de Dados (`api_keys`)
Tabela no SQLite para gerenciar as chaves de acesso:
```sql
CREATE TABLE IF NOT EXISTS api_keys (
  id          TEXT PRIMARY KEY,
  user_id     TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  profile_id  TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,          -- Ex: "Hermes Agent - Gordinho Celulares"
  token_hash  TEXT UNIQUE NOT NULL,   -- SHA-256 da chave gerada
  last_used_at TEXT,
  created_at  TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_api_keys_token ON api_keys(token_hash);
```

### 2.2. Endpoints Principais

#### `POST /api/v1/publish`
Agenda ou publica uma mídia no perfil vinculado à API Key.
* **Headers:** `Authorization: Bearer <API_KEY>`
* **Content-Type:** `multipart/form-data` ou `application/json` (se usar caminho de arquivo local).
* **Parâmetros:**
  - `media`: Arquivo binário enviado via upload **OU**
  - `local_media_path`: Caminho absoluto do arquivo no disco da VPS (ex: `/var/data/agency/clients/gordinho/video01.mp4`).
  - `title`: Título do post / vídeo.
  - `description`: Legenda completa, hashtags e links.
  - `platforms`: Lista de plataformas alvo (ex: `["instagram", "facebook", "youtube"]`).
  - `scheduled_at`: Data/hora ISO para agendamento (ex: `2026-10-20T18:00:00Z`). Se omitido, publica imediatamente.
  - `media_type`: `'video'` | `'photo'` | `'text'`.
  - `format`: `'feed'` | `'reel'` | `'story'`.
* **Resposta de Sucesso (201):**
  ```json
  {
    "success": true,
    "post_id": "post_982348234",
    "status": "scheduled",
    "scheduled_at": "2026-10-20T18:00:00Z",
    "platforms": ["instagram", "facebook"]
  }
  ```

#### `GET /api/v1/accounts`
Retorna as redes sociais conectadas e o status de sincronização do perfil.
* **Resposta (200):**
  ```json
  {
    "profile": "Gordinho Celulares",
    "accounts": [
      { "platform": "instagram", "handle": "@gordinhocelulares", "connected": true, "followers": 14200 },
      { "platform": "facebook", "name": "Gordinho Celulares", "connected": true, "followers": 8500 }
    ]
  }
  ```

#### `GET /api/v1/schedule`
Lista os próximos posts agendados na fila daquele cliente.
* **Resposta (200):**
  ```json
  {
    "scheduled_posts": [
      {
        "id": "post_123",
        "title": "Troca de tela em 40 minutos",
        "scheduled_date": "2026-10-20T18:00:00Z",
        "platforms": ["instagram"]
      }
    ],
    "total": 1
  }
  ```

#### `GET /api/v1/audience`
Retorna os números consolidados de seguidores, alcance e engajamento daquele perfil para o Hermes gerar relatórios no WhatsApp.

---

## 3. Camada 2: Servidor MCP (`nexopost-mcp`)

O **NexoPost MCP** é um processo Node.js leve que roda via `npx` ou comando local configurado no manifesto de MCP do Hermes:

### 3.1. Configuração no Hermes (`mcp_config.json` ou settings do Hermes)
```json
{
  "mcpServers": {
    "nexopost": {
      "command": "node",
      "args": ["/var/www/nexopost/mcp-server/dist/index.js"],
      "env": {
        "NEXOPOST_BASE_URL": "http://localhost:3000"
      }
    }
  }
}
```

### 3.2. Catálogo de Ferramentas Expostas ao Hermes (MCP Tools)

#### Tool 1: `nexopost_schedule_post`
* **Descrição para o LLM:** "Agenda uma nova publicação de vídeo ou foto para um cliente específico nas redes sociais selecionadas."
* **Input Schema:**
  ```json
  {
    "type": "object",
    "properties": {
      "client_api_key": {
        "type": "string",
        "description": "Chave de API do cliente no NexoPost recuperada do cofre."
      },
      "media_path": {
        "type": "string",
        "description": "Caminho do arquivo de vídeo ou foto no sistema de arquivos local."
      },
      "title": { "type": "string", "description": "Título ou gancho da publicação." },
      "description": { "type": "string", "description": "Legenda completa com hashtags e CTA." },
      "platforms": {
        "type": "array",
        "items": { "type": "string", "enum": ["instagram", "facebook", "youtube", "tiktok"] },
        "description": "Redes sociais onde o conteúdo será postado."
      },
      "scheduled_at": {
        "type": "string",
        "description": "Data e hora ISO 8601 para publicação (ex: 2026-10-18T15:30:00Z)."
      }
    },
    "required": ["client_api_key", "media_path", "title", "description", "platforms", "scheduled_at"]
  }
  ```

#### Tool 2: `nexopost_list_schedule`
* **Descrição para o LLM:** "Consulta a fila de postagens agendadas para informar ao usuário quais conteúdos entrarão no ar nos próximos dias."

#### Tool 3: `nexopost_get_metrics`
* **Descrição para o LLM:** "Obtém as métricas consolidadas de seguidores, alcance e crescimento das redes do cliente."

---

## 4. Fluxo Prático no WhatsApp (Experiência do Usuário)

1. **Mensagem no WhatsApp para o Hermes:**
   > *"Hermes, o cliente Gordinho Celulares aprovou o Reels sobre troca de tela. Pega o arquivo final na pasta dele e agenda para amanhã às 11:30 no Instagram e Facebook."*

2. **Raciocínio Autônomo do Hermes:**
   1. Acessa o cofre da agência e busca o token do cliente: `nex_live_gordinho_...`.
   2. Localiza o arquivo de vídeo aprovado: `/var/data/agency/gordinho/reels_tela.mp4`.
   3. Formula o título e legenda usando a identidade da marca que ele já conhece.
   4. Executa a tool `nexopost_schedule_post`:
      ```json
      {
        "client_api_key": "nex_live_gordinho_...",
        "media_path": "/var/data/agency/gordinho/reels_tela.mp4",
        "title": "Troca de tela express em Campo Grande! 📱⚡",
        "description": "Seu celular novo em até 40 minutos com garantia...\n\n#campogrande #gordinhocelulares",
        "platforms": ["instagram", "facebook"],
        "scheduled_at": "2026-10-17T11:30:00-04:00"
      }
      ```
   5. O NexoPost salva no banco SQLite e enfileira no cron.
   6. O Hermes responde no WhatsApp:
      > *"Tudo pronto, Arino! O Reels da Gordinho Celulares foi agendado para amanhã (17/10) às 11h30 no Instagram e Facebook com sucesso."*

---

## 5. Roteiro de Execução para o `agy` (Argon)

Quando você for iniciar a implementação desta integração, utilize as etapas abaixo diretamente no `agy`:

### Prompt para a Fase 1: Criar a API REST v1 no NexoPost
```markdown
Implemente a Fase 1 da especificação descrita em INTEGRACAO_HERMES.md:
1. No SQLite (src/lib/db.ts), crie a tabela `api_keys` com vínculo a `profiles` e `users`.
2. Crie uma tela ou aba em /settings para gerar, listar e revogar chaves de API para o perfil ativo.
3. Crie os endpoints autenticados em:
   - src/app/api/v1/publish/route.ts (com suporte a upload multipart ou arquivo local via local_media_path)
   - src/app/api/v1/schedule/route.ts
   - src/app/api/v1/accounts/route.ts
4. Escreva testes automatizados garantindo que tokens inválidos retornam 401 e tokens válidos manipulam apenas o perfil associado.
```

### Prompt para a Fase 2: Criar o Servidor MCP (`nexopost-mcp`)
```markdown
Implemente a Fase 2 da especificação descrita em INTEGRACAO_HERMES.md:
1. Crie o pacote `mcp-server/` na raiz do NexoPost usando o SDK `@modelcontextprotocol/sdk`.
2. Implemente as tools: `nexopost_schedule_post`, `nexopost_list_schedule` e `nexopost_get_metrics`.
3. Conecte as tools à API REST local (http://localhost:3000/api/v1/*).
4. Forneça o arquivo de configuração de exemplo para plugar o MCP no agente Hermes.
```
