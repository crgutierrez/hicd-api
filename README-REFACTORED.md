# HICD Crawler - Arquitetura Refatorada

## 📋 Visão Geral

O HICD Crawler foi refatorado para seguir uma arquitetura modular, separando responsabilidades em componentes especializados. Isso melhora a manutenibilidade, testabilidade e extensibilidade do código.

## 🏗️ Arquitetura Modular

### Camada Core
- **`src/core/http-client.js`**: Cliente HTTP responsável por toda comunicação com o servidor HICD

### Camada de Serviços
- **`src/services/auth-service.js`**: Gerencia autenticação e sessões
- **`src/services/patient-service.js`**: Gerencia operações relacionadas a pacientes
- **`src/services/evolution-service.js`**: Gerencia evoluções médicas e cadastros

### Camada de Parsers
- **`src/parsers/hicd-parser.js`**: Parse de dados HTML das páginas do sistema

### Camada de Extratores
- **`src/extractors/clinical-data-extractor.js`**: Extração e análise de dados clínicos

### Camada de Analisadores
- **`src/analyzers/clinic-analyzer.js`**: Análise completa de clínicas específicas

### Arquivo Principal
- **`hicd-crawler-refactored.js`**: Classe principal que coordena todos os módulos

## 📂 Estrutura de Diretórios

```
hicd-bot/
├── src/
│   ├── core/
│   │   └── http-client.js          # Cliente HTTP
│   ├── services/
│   │   ├── auth-service.js         # Serviço de autenticação
│   │   ├── patient-service.js      # Serviço de pacientes
│   │   └── evolution-service.js    # Serviço de evoluções
│   ├── parsers/
│   │   └── hicd-parser.js          # Parser de dados HTML
│   ├── extractors/
│   │   └── clinical-data-extractor.js  # Extrator de dados clínicos
│   └── analyzers/
│       └── clinic-analyzer.js      # Analisador de clínicas
├── hicd-crawler-refactored.js      # Classe principal refatorada
├── hicd-crawler.js                 # Versão original (mantida para compatibilidade)
├── exemplo-uso-refatorado.js       # Exemplo de uso da nova versão
└── README-REFACTORED.md           # Esta documentação
```

## 🔧 Principais Melhorias

### 1. Separação de Responsabilidades
- **Antes**: Uma única classe com +2000 linhas fazendo tudo
- **Depois**: 7 módulos especializados com responsabilidades bem definidas

### 2. Melhor Testabilidade
- Cada módulo pode ser testado independentemente
- Injeção de dependências facilita mocks em testes

### 3. Facilidade de Manutenção
- Mudanças no HTTP não afetam a lógica de negócio
- Novos parsers podem ser adicionados sem alterar outros módulos
- Extratores de dados podem evoluir independentemente

### 4. Extensibilidade
- Novos analisadores podem ser criados facilmente
- Suporte a novos tipos de dados sem alterar código existente
- Plugins podem ser adicionados em qualquer camada

## 🚀 Como Usar

### Uso Básico

```javascript
const HICDCrawler = require('./hicd-crawler-refactored');

const crawler = new HICDCrawler();

// Login
await crawler.login();

// Buscar pacientes
const pacientes = await crawler.buscarPacientes();

// Análise de clínica
const analise = await crawler.analisarEnfermariaG();

// Logout
await crawler.logout();
```

### Uso Avançado com Configurações

```javascript
const crawler = new HICDCrawler();

// Habilitar debug
crawler.setDebugMode(true);

// Análise personalizada
const analise = await crawler.analisarClinica('UTI', {
    salvarArquivo: true,
    incluirDetalhes: false,
    diretorioSaida: 'relatorios'
});
```

## 📊 Módulos Detalhados

### HICDHttpClient
**Responsabilidade**: Comunicação HTTP com o servidor
- Configuração de headers e cookies
- Rate limiting e retry automático
- Gestão de timeouts

### HICDAuthService
**Responsabilidade**: Autenticação e gestão de sessão
- Login com retry automático (contorna bug do sistema)
- Verificação de status de login
- Logout e limpeza de sessão

### HICDParser
**Responsabilidade**: Parse de dados HTML
- Extração de listas de clínicas
- Parse de tabelas de pacientes
- Extração de dados de cadastro e evoluções

### PatientService
**Responsabilidade**: Operações com pacientes
- Busca de pacientes por clínica
- Busca por leito específico
- Formatação inteligente de leitos

### EvolutionService
**Responsabilidade**: Gestão de evoluções médicas
- Busca de evoluções por paciente
- Remoção de duplicatas
- Mesclagem de conteúdos similares

### ClinicalDataExtractor
**Responsabilidade**: Extração de dados clínicos
- Identificação de evoluções médicas
- Extração de HDA (História da Doença Atual)
- Extração de hipóteses diagnósticas
- Parse de códigos CID

### ClinicAnalyzer
**Responsabilidade**: Análise completa de clínicas
- Análise de todos os pacientes de uma clínica
- Estatísticas de sucesso/falha
- Geração de relatórios
- Salvamento de arquivos

## 🔄 Compatibilidade

A versão refatorada mantém **100% de compatibilidade** com a API original:

```javascript
// Este código continua funcionando igual
const crawler = new HICDCrawler();
await crawler.login();
const pacientes = await crawler.buscarPacientes();
const analise = await crawler.analisarEnfermariaG();
```

## 🧪 Testabilidade

### Exemplo de Teste Unitário

```javascript
const HICDParser = require('./src/parsers/hicd-parser');

describe('HICDParser', () => {
    const parser = new HICDParser();
    
    test('deve extrair clínicas do HTML', () => {
        const html = '<select id="clinica"><option value="001">EMERGENCIA</option></select>';
        const clinicas = parser.parseClinicas(html);
        
        expect(clinicas).toHaveLength(1);
        expect(clinicas[0].codigo).toBe('001');
        expect(clinicas[0].nome).toBe('EMERGENCIA');
    });
});
```

## 📈 Métricas de Melhoria

| Métrica | Antes | Depois | Melhoria |
|---------|-------|--------|----------|
| Linhas por arquivo | 2106 | Máx. 300 | -86% |
| Responsabilidades por classe | 15+ | 1-3 | -80% |
| Acoplamento | Alto | Baixo | ✅ |
| Testabilidade | Difícil | Fácil | ✅ |
| Manutenibilidade | Baixa | Alta | ✅ |

## 🔮 Próximos Passos

1. **Testes Automatizados**: Implementar suite completa de testes
2. **Interface Assíncrona**: Melhorar feedback em tempo real
3. **Cache Inteligente**: Reduzir requisições desnecessárias
4. **Plugins**: Sistema de plugins para extensões
5. **Monitoramento**: Métricas de performance e saúde

## 📝 Migração

Para migrar do código antigo para o novo:

1. **Substitua a importação**:
   ```javascript
   // Antes
   const HICDCrawler = require('./hicd-crawler');
   
   // Depois
   const HICDCrawler = require('./hicd-crawler-refactored');
   ```

2. **Código existente continua funcionando**: Zero breaking changes

3. **Use novas funcionalidades gradualmente**: Explore os novos módulos conforme necessário

## 🤝 Contribuição

A nova arquitetura facilita contribuições:

1. **Módulos independentes**: Contribua em áreas específicas
2. **Testes isolados**: Teste suas mudanças facilmente
3. **Documentação clara**: Cada módulo tem sua responsabilidade bem definida

---

**Autor**: HICD Crawler Team  
**Versão**: 2.0.0  
**Data**: Agosto 2025
