# Guia de Uso da API HICD - Modelos Estruturados

## Visão Geral

A API foi atualizada para usar modelos estruturados próprios que fornecem dados validados e organizados. Agora temos três modelos principais:

- **Paciente**: Dados de cadastro e informações pessoais
- **Evolucao**: Registros de evolução médica e análise clínica
- **Exame**: Resultados de exames laboratoriais

## Formatos de Resposta

Todos os endpoints agora suportam diferentes formatos de resposta através do parâmetro `formato`:

- `resumido` (padrão): Dados essenciais
- `detalhado`: Dados completos com informações adicionais
- `completo`: Todos os dados disponíveis
- `clinico`: Foco em dados clínicos (para evoluções e exames)
- `resultados`: Apenas resultados (para exames)

## Endpoints Principais

### 1. Buscar Paciente

```bash
GET /api/pacientes/search?prontuario=123456&formato=resumido
```

**Formatos disponíveis:**
- `resumido`: Nome, prontuário, leito, idade
- `detalhado`: + contatos, endereço, internação
- `completo`: Todos os dados disponíveis

**Exemplo de resposta (resumido):**
```json
{
  "success": true,
  "data": {
    "prontuario": "123456",
    "nome": "João Silva",
    "leito": "101A",
    "idade": 45,
    "status": "internado"
  },
  "formato": "resumido",
  "metadata": {
    "timestamp": "2024-01-15T10:30:00Z",
    "fonte": "HICD",
    "versao": "1.0"
  }
}
```

### 2. Obter Evoluções

```bash
GET /api/pacientes/123456/evolucoes?formato=clinico
```

**Formatos disponíveis:**
- `resumido`: Data, médico, diagnóstico principal
- `detalhado`: + HDA, exame físico, prescrições
- `completo`: Todos os dados
- `clinico`: Foco em dados clínicos estruturados

**Exemplo de resposta (clínico):**
```json
{
  "success": true,
  "data": [
    {
      "data": "2024-01-15",
      "medico": "Dr. Carlos Santos",
      "diagnosticos": ["Pneumonia", "Hipertensão"],
      "medicamentos": ["Amoxicilina", "Losartana"],
      "dadosClinicos": {
        "sinaisVitais": {
          "pressao": "140/90",
          "temperatura": "37.2°C",
          "frequenciaCardiaca": "88 bpm"
        },
        "sintomas": ["febre", "tosse", "dispneia"],
        "condicaoGeral": "estável"
      },
      "resumoAutomatico": "Paciente apresenta melhora do quadro respiratório..."
    }
  ],
  "total": 1,
  "formato": "clinico"
}
```

### 3. Obter Exames

```bash
GET /api/pacientes/123456/exames?formato=resultados
```

**Formatos disponíveis:**
- `resumido`: Data, tipo, status
- `detalhado`: + todos os resultados
- `completo`: + análises e comparações
- `resultados`: Apenas valores dos resultados
- `clinico`: Agrupado por tipo clínico

**Exemplo de resposta (resultados):**
```json
{
  "success": true,
  "data": [
    {
      "data": "2024-01-15",
      "tipo": "Hemograma Completo",
      "resultados": {
        "LEUC": { "valor": "8.5", "unidade": "mil/mm³", "referencia": "4.0-11.0", "status": "normal" },
        "HB": { "valor": "12.8", "unidade": "g/dL", "referencia": "12.0-16.0", "status": "normal" },
        "HT": { "valor": "38.5", "unidade": "%", "referencia": "36.0-46.0", "status": "normal" }
      },
      "estatisticas": {
        "totalExames": 3,
        "normais": 3,
        "alterados": 0,
        "percentualNormal": 100
      }
    }
  ],
  "formato": "resultados"
}
```

### 4. Análise Clínica Completa

```bash
GET /api/pacientes/123456/analise
```

**Resposta integrada com todos os modelos:**
```json
{
  "success": true,
  "paciente": {
    "prontuario": "123456",
    "nome": "João Silva",
    "idade": 45,
    "leito": "101A"
  },
  "resumoClinico": {
    "ultimaEvolucao": "2024-01-15",
    "diagnosticoPrincipal": "Pneumonia",
    "medicamentosAtuais": ["Amoxicilina", "Losartana"],
    "ultimosExames": {
      "data": "2024-01-15",
      "principais": ["Hemograma", "Gasometria"]
    }
  },
  "indicadoresRisco": {
    "febre": true,
    "alteracoesLaboratoriais": false,
    "medicamentosAltoRisco": false
  }
}
```

### 5. Listar Pacientes de Clínica

```bash
GET /api/clinicas/CLINICA_MEDICA/pacientes?formato=resumido
```

## Recursos dos Modelos

### Validação Automática
- Todos os dados são validados antes da resposta
- Campos obrigatórios são verificados
- Formatos de data e valores são padronizados

### Análise Inteligente
- **Evoluções**: Extração automática de sintomas, medicamentos e diagnósticos
- **Exames**: Categorização por tipo e análise de normalidade
- **Pacientes**: Estruturação de dados de contato e internação

### Metadados
- Timestamp de geração dos dados
- Fonte de origem (HICD)
- Versão do modelo utilizado

## Exemplo de Uso Completo

```javascript
// 1. Buscar paciente
const paciente = await fetch('/api/pacientes/search?prontuario=123456&formato=detalhado');

// 2. Obter evoluções clínicas
const evolucoes = await fetch('/api/pacientes/123456/evolucoes?formato=clinico');

// 3. Obter exames recentes
const exames = await fetch('/api/pacientes/123456/exames?formato=resultados');

// 4. Análise integrada
const analise = await fetch('/api/pacientes/123456/analise');
```

## Tratamento de Erros

Todos os endpoints retornam estrutura consistente de erro:

```json
{
  "success": false,
  "error": "Tipo do erro",
  "message": "Descrição detalhada do erro",
  "codigo": "ERRO_CODIGO" // quando aplicável
}
```

## Performance

- Cache inteligente para clínicas (10 minutos)
- Validação lazy loading para dados completos
- Compressão automática de respostas grandes
- Timeouts configuráveis por tipo de operação
