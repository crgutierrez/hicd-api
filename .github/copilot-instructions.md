# Diretrizes para o GitHub Copilot neste Repositório

Este documento fornece orientações para ajudar o Copilot a entender a estrutura e os padrões deste projeto, permitindo uma assistência mais eficaz.

## Visão Geral da Arquitetura

Este projeto é um sistema de web scraping (crawler) para o sistema de prontuários HICD, com uma API para expor os dados coletados e um frontend para visualização.

- **Crawler Principal**: O núcleo do robô está em `hicd-crawler.js`. Ele é responsável pelo login, navegação e extração de dados do sistema HICD.
- **Parsers de Dados**: O diretório `src/parsers/` contém a lógica especializada para analisar diferentes seções do HTML extraído (ex: exames, prescrições, balanço hídrico). Ao adicionar ou modificar a extração de dados, verifique os parsers existentes.
- **Servidor de API**: Um servidor Express.js, com o ponto de entrada em `api-server.js` e a lógica principal no diretório `api/`, expõe os dados coletados através de uma API RESTful. A estrutura da API (rotas, controladores, middlewares) está organizada dentro de `api/`.
- **Scripts de Execução**:
  - `index.js`: Script simples para uma execução única do crawler.
  - `crawler-completo.js`: Script mais robusto para uma extração detalhada, processando cada clínica individualmente.
- **Frontend**: O diretório `frontend/` contém uma aplicação web para interagir com a API e visualizar os dados.
- **Configuração**: As configurações, como credenciais e URLs, são gerenciadas através do arquivo `config.js` e variáveis de ambiente (usando `dotenv`).

## Fluxos de Trabalho Essenciais

### 1. Executando o Crawler

Para extrair dados do HICD, use os seguintes comandos:

- **Execução simples**: `npm start`
- **Execução completa com estatísticas**: `npm run full`

Os dados extraídos são salvos no diretório `output/` em formatos como JSON e CSV.

### 2. Executando a API

Para iniciar o servidor que expõe os dados coletados:

- **Produção**: `npm run api`
- **Desenvolvimento (com auto-reload)**: `npm run api-dev`

A documentação da API (Swagger) geralmente está disponível em `/api/docs` quando o servidor está no ar.

### 3. Testes

O projeto possui uma variedade de scripts de teste para diferentes funcionalidades.

- **Teste principal do crawler**: `npm test`
- Outros testes específicos podem ser executados diretamente com `node`, por exemplo: `node test-balanco-hidrico.js`. Explore os arquivos `test-*.js` para ver os casos de uso.

## Padrões e Convenções

- **Modularidade**: A lógica de extração é dividida em múltiplos parsers em `src/parsers/`. Ao adicionar uma nova extração, crie um novo parser ou estenda um existente.
- **Tratamento de Erros**: O crawler deve ser robusto a falhas de rede e mudanças no HTML. Use blocos `try...catch` e registre erros detalhados.
- **Seletores CSS**: A extração de dados depende fortemente de seletores CSS para o Cheerio. Mantenha os seletores organizados e comentados, preferencialmente em arquivos de configuração ou no início dos parsers.
- **API Estruturada**: A API segue um padrão com rotas, controladores e serviços. Ao adicionar um novo endpoint, siga essa estrutura.

## Dependências Externas

- **`axios`**: Para fazer requisições HTTP ao sistema HICD.
- **`cheerio`**: Para fazer o parsing do HTML retornado e extrair os dados (semelhante ao jQuery).
- **`express`**: Para construir a API RESTful.
- **`dotenv`**: Para gerenciar variáveis de ambiente.
- **`swagger-ui-express` e `swagger-jsdoc`**: Para documentação da API.
