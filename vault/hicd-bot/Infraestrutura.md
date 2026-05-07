# Infraestrutura e Dependências

## Banco de Dados

**Nenhum banco de dados próprio.** Os dados vêm exclusivamente do servidor HICD externo via scraping HTTP. O único estado persistente é o arquivo `.env` com credenciais.

Cache é **in-memory** e não sobrevive a restarts.

---

## Servidor HICD (dependência externa crítica)

| Atributo | Valor |
|---|---|
| Protocolo | HTTP POST |
| Endpoint único | `controller.php` |
| Auth | Session cookie (mantido pelo `http-client.js`) |
| Diferenciação de módulos | Campo `ParamModule` no corpo form-encoded |

### Módulos do HICD

| ParamModule | Dados |
|---|---|
| `Evo` | Histórico de evoluções |
| `Exames` → redireciona para `exame.php` | Exames laboratoriais |
| `Paciente` | Cadastro e lista de pacientes |
| `Prescricao` | Prescrições médicas |

### HTML estruturas relevantes

**Evoluções** (`#areaHistEvol`):
- Blocos de 5 `.row` por evolução
- Row 0: Profissional + Data Evolução
- Row 1: Atividade + Data Atualização (label: `"Data Atualização:"`)
- Row 2: `"Clinica / Leito:"` (sem acento, com espaços ao redor do `/`)
- Row 3: Descrição com `<br>` tags
- Row 4: divider/duplicata

**Exames** (`table.table1 tr[id]`):
- ID da row = sigla do exame
- Formato: `"Resultado---------------> VALUE UNIT\nV.R     : REF"`

---

## Cache

Implementado em `api/utils/cache.js`:

```
TTL: 10 minutos
Cleanup automático: a cada 5 minutos
Estratégia: cache.getOrSet(key, asyncFn)
```

Chaves de cache por tipo:
- `cadastro:<prontuario>`
- `evolucoes:<prontuario>:<limite>:<formato>`
- `exames-raw:<prontuario>`
- `exames-resultados:<prontuario>`
- `prescricoes:<prontuario>`
- `analise:<prontuario>`

---

## Docker (não configurado — referência para containerizar)

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --production
COPY . .
EXPOSE 3000
CMD ["node", "api-server.js"]
```

Variáveis de ambiente devem ser passadas via `docker run -e` ou arquivo `.env` montado como volume.

---

## Comandos de operação

```bash
# Produção
npm run api

# Desenvolvimento (auto-reload)
npm run api-dev

# Validar configuração
npm run validate

# Debug com saída em output/
node debug-evolucoes.js <prontuario>
node debug-exames.js <prontuario>

# Limpar cache de arquivos
npm run clean
```
