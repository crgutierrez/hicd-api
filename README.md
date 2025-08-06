# HICD Crawler

Crawler em Node.js para extrair dados do sistema HICD (Sistema de Prontuário) hospedado em https://hicd-hospub.sesa### 📊 **Dados Extraídos**

O crawler agora extrai dados completos de pacientes internados:

```json
{
  "nome": "NOME DO PACIENTE",
  "prontuario": "12345",
  "leito": "007.007-0001",
  "cid": "CID10 se disponível",
  "dataInternacao": "05/08/2025 14:30",
  "diasInternado": 15,
  "clinica": "007",
  "registroEletronico": true,
  "kanban": true,
  "clinicaNome": "U T I",
  "clinicaCodigo": "007",
  "timestamp": "2025-08-06T02:05:56.719Z",
  "url": "https://hicd-hospub.sesau.ro.gov.br/..."
}
```

#### **Campos Extraídos:**
- **Nome**: Nome completo do paciente
- **Prontuário**: Número do prontuário médico  
- **Leito**: Código do leito (formato: XXX.XXX-XXXX)
- **CID**: Código CID10 (quando disponível)
- **Data Internação**: Data e hora da internação
- **Dias Internado**: Número de dias desde a internação
- **Clínica**: Código da clínica
- **Registro Eletrônico**: Indica se tem registro eletrônico
- **Kanban**: Indica se tem acesso ao kanban

### ✅ **Testado e Funcionando**

### 🏥 Clínicas Disponíveis

O sistema HICD possui as seguintes clínicas para consulta de pacientes internados:

- **001** - EMERGENCIA - INTERNADOS
- **002** - C I P
- **003** - UIR 1 UNID-INTERN RAPIDA
- **004** - UIR 2 UNID-INTERN RAPIDA  
- **005** - UIR 3 UNID-INTERN RAPIDA
- **007** - U T I
- **008** - ENFERMARIA A
- **009** - ENFERMARIA B
- **010** - ENFERMARIA C
- **011** - ENFERMARIA D
- **012** - ENFERMARIA G
- **013** - ENFERMARIA H
- **014** - ISOLAMENTO
- **015** - ENFERMARIA J
- **016** - ENFERMARIA K
- **017** - ENFERMARIA L
- **018** - ENFERMARIA M
- **019** - HOSPITAL DIA
- **020** - SALA DE PROCEDIMENTO

### Headers e User-Agento.gov.br/prontuario/frontend/index.php

## ✨ Características

- **Autenticação robusta**: Implementa retry automático para contornar o bug do sistema onde a primeira requisição sempre falha
- **Gerenciamento de sessão**: Mantém cookies/sessão após login bem-sucedido
- **Rate limiting**: Delays configuráveis entre requisições para não sobrecarregar o servidor
- **Tratamento de erros**: Error handling robusto com logs detalhados
- **Múltiplos formatos**: Salva dados extraídos em JSON e CSV
- **Configuração flexível**: Configurações através de arquivo `.env`

## 🚀 Funcionalidades Principais

### 📋 Extração de Dados Básicos
- ✅ **Lista de clínicas** disponíveis no sistema
- ✅ **Pacientes por clínica** com informações básicas (nome, prontuário, leito, CID, etc.)

### 👤 Dados Detalhados do Paciente
- ✅ **Cadastro completo** com dados pessoais, endereço e documentos
- ✅ **Evoluções médicas** completas com histórico de todos os profissionais
- ✅ **Informações de internação** (data, dias internado, clínica/leito)

### 📊 Análise e Relatórios
- ✅ **Estatísticas automáticas** por clínica e atividade profissional
- ✅ **Distribuição de casos** por especialidade médica
- ✅ **Histórico temporal** das evoluções
- ✅ **Modo debug** para análise de respostas HTML

### 🔧 Recursos Técnicos
- ✅ **Parser HTML robusto** para extrair dados estruturados
- ✅ **Formatação JSON e CSV** para diferentes usos
- ✅ **Logs detalhados** para acompanhamento e debug
- ✅ **Tratamento de erros** com retry automático

## 🚀 Instalação

1. Clone ou baixe os arquivos do projeto
2. Instale as dependências:

```bash
npm install
```

## ⚙️ Configuração

1. Edite o arquivo `.env` com suas credenciais:

```env
# Credenciais de login
HICD_USERNAME=seu_usuario
HICD_PASSWORD=sua_senha

# Configurações de Rate Limiting
REQUEST_DELAY=1000
MAX_RETRIES=3

# Configurações de Output
OUTPUT_FORMAT=json
OUTPUT_DIR=./output
```

## 🎯 Uso

### Execução completa do crawler:

```bash
npm start          # Execução padrão
npm run full       # Execução completa otimizada (recomendado)
```

### Execução em modo de desenvolvimento:

```bash
npm run dev        # Com reinicialização automática
```

### Teste das funcionalidades:

```bash
npm run clinicas               # Exemplos específicos de clínicas
npm run test-html              # Teste do parser HTML de pacientes
npm run test-extracao          # Teste de extração completa limitada
npm run test-paciente-detalhado    # Teste de cadastro e evoluções de um paciente
npm run test-multiplos-detalhados  # Teste de múltiplos pacientes com dados completos
node teste-clinicas.js         # Teste completo das clínicas
node teste-clinicas.js --rapido    # Teste rápido
```

### Uso programático:

```javascript
const HICDCrawler = require('./hicd-crawler');

async function exemplo() {
    const crawler = new HICDCrawler();
    crawler.setDebugMode(true); // Habilitar modo debug
    
    try {
        await crawler.login();
        
        // Buscar todas as clínicas disponíveis
        const clinicas = await crawler.getClinicas();
        console.log(`Encontradas ${clinicas.length} clínicas`);
        
        // Buscar pacientes de uma clínica específica
        const resultadoPacientes = await crawler.getPacientesClinica('007'); // UTI
        console.log(`UTI tem ${resultadoPacientes.pacientes.length} pacientes`);
        
        // Obter dados detalhados de um paciente
        const paciente = resultadoPacientes.pacientes[0];
        const cadastro = await crawler.getPacienteCadastro(paciente.prontuario);
        const evolucoes = await crawler.getEvolucoes(paciente.prontuario);
        
        console.log(`Paciente: ${cadastro.dadosBasicos.nome}`);
        console.log(`Evoluções: ${evolucoes.totalEvolucoes}`);
        
        // Extrair dados de todas as clínicas
        const todosDados = await crawler.extractData();
        await crawler.saveData(todosDados);
        
    } finally {
        await crawler.logout();
    }
}
```

### Funcionalidades Específicas:

#### 🏥 Buscar Clínicas
```javascript
const clinicas = await crawler.getClinicas();
// Retorna array com: { codigo, nome, index }
```

#### 👥 Buscar Pacientes por Clínica
```javascript
const pacientes = await crawler.getPacientesClinica(
    '007',          // código da clínica
    '',             // referência (opcional)
    'Silva',        // filtro nome (opcional)
    'N'             // ordem: N=nome, C=clínica+leito (opcional)
);
```

## 🏗️ Estrutura do Projeto

```
hicd-bot/
├── hicd-crawler.js     # Classe principal do crawler
├── index.js            # Script de execução principal
├── test-crawler.js     # Script de teste
├── package.json        # Dependências e scripts
├── .env               # Configurações (credenciais)
├── README.md          # Este arquivo
└── output/            # Diretório de saída (criado automaticamente)
    ├── hicd-data-*.json
    ├── hicd-data-*.csv
    └── hicd-log-*.txt
```

## 🔧 Funcionalidades Técnicas

### Autenticação
- **URL de Login**: `https://hicd-hospub.sesau.ro.gov.br/prontuario/frontend/controller/controller.php`
- **Método**: POST
- **Payload**: `Param=LOGIN&user=usuario&pass=senha&session=undefined`
- **Bug do Sistema**: A primeira requisição sempre falha, implementamos retry automático

### Headers e User-Agent
O crawler usa headers realistas para simular um navegador:
- User-Agent do Chrome
- Headers de Accept apropriados
- Referer correto
- Cookies de sessão mantidos automaticamente

### Rate Limiting
- Delay configurável entre requisições (padrão: 1000ms)
- Máximo de tentativas configurável (padrão: 3)
- Delays aumentados em caso de erro

## 📊 Formato dos Dados

### JSON
```json
[
  {
    "url": "https://...",
    "timestamp": "2025-08-05T10:30:00.000Z",
    "title": "Título da página",
    "extractedData": {
      // Dados específicos extraídos
    }
  }
]
```

### CSV
Formato tabular com todas as colunas dos dados extraídos.

## 🐛 Tratamento do Bug do Sistema

O sistema HICD tem um bug conhecido onde a primeira requisição de login sempre falha. O crawler implementa a seguinte estratégia:

1. **Primeira tentativa**: Sempre falha (esperado)
2. **Aguarda 2 segundos**
3. **Segunda tentativa**: Geralmente bem-sucedida
4. **Retry adicional**: Se necessário, até atingir MAX_RETRIES

## 📝 Logs

O crawler gera logs detalhados durante a execução:
- `[LOGIN]`: Operações de autenticação
- `[EXTRAÇÃO]`: Processo de coleta de dados
- `[SALVAMENTO]`: Operações de arquivo
- `[LOGOUT]`: Encerramento de sessão

## ⚠️ Considerações Importantes

1. **Respeite o servidor**: Use delays apropriados entre requisições
2. **Credenciais seguras**: Nunca commite o arquivo `.env` com credenciais reais
3. **Adapte os seletores**: Os seletores CSS/jQuery podem precisar ser ajustados conforme a estrutura real das páginas
4. **Teste primeiro**: Use `npm test` antes de executar extrações completas

## 🔄 Personalização

Para extrair dados específicos, edite o método `extractPageData()` na classe `HICDCrawler`:

```javascript
async extractPageData(url) {
    const response = await this.client.get(url);
    const $ = cheerio.load(response.data);

    // Customize os seletores conforme necessário
    const pageData = {
        patientName: $('.patient-name').text().trim(),
        patientId: $('.patient-id').text().trim(),
        records: []
    };

    // Adicione sua lógica de extração aqui
    
    return pageData;
}
```

## 🆘 Solução de Problemas

### Erro de login
- Verifique credenciais no `.env`
- Confirme que o sistema está online
- Aumente o número de MAX_RETRIES

### Dados não extraídos
- Verifique os seletores CSS no método `extractPageData()`
- Use o modo de debug para ver o HTML das páginas
- Confirme que você está logado corretamente

### Problemas de rede
- Aumente o timeout nas configurações do axios
- Reduza a frequência de requisições aumentando REQUEST_DELAY
- Verifique sua conexão com o servidor

## 📄 Licença

MIT License - Veja o arquivo de licença para detalhes.
