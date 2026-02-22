# Parsers HICD - Documentação

## Visão Geral

O sistema de parsers do HICD foi refatorado para uma arquitetura modular com parsers especializados para cada entidade médica. Esta nova estrutura oferece maior flexibilidade, melhor manutenibilidade e novos recursos avançados.

## Estrutura dos Parsers

### Parser Principal (HICDParser)
Mantém 100% de compatibilidade com o código existente e atua como orquestrador dos parsers especializados.

### Parsers Especializados
- **BaseParser**: Classe base com utilitários comuns
- **ClinicaParser**: Parser para dados de clínicas
- **PacienteParser**: Parser para dados de pacientes
- **ExamesParser**: Parser para exames e resultados
- **EvolucaoParser**: Parser para evoluções médicas
- **ProntuarioParser**: Parser para prontuários completos

## Uso Básico (Compatível com versão anterior)

```javascript
const HICDParser = require('./src/parsers/hicd-parser');
const parser = new HICDParser();

// Métodos existentes (mantidos)
const clinicas = parser.parseClinicas(html);
const pacientes = parser.parsePacientes(html, codigoClinica);
const exames = parser.parseExames(html, prontuario);
const evolucoes = parser.parseEvolucoes(html, prontuario);
```

## Novos Recursos

### 1. Parse Automático
Detecta automaticamente o tipo de página e aplica o parser apropriado:

```javascript
const resultado = parser.parseAuto(html, { 
    codigoClinica: '123', 
    prontuario: '456' 
});

console.log(resultado.tipo); // 'clinicas', 'pacientes', 'exames', etc.
console.log(resultado.dados); // Dados extraídos
```

### 2. Parse Múltiplo
Tenta todos os parsers em páginas complexas:

```javascript
const resultado = parser.parseMultiple(html, context);
// resultado.dados conterá dados de todas as entidades encontradas
```

### 3. Filtros Avançados

#### Pacientes
```javascript
const pacientesFiltrados = parser.filterPacientes(pacientes, {
    nome: 'João',
    sexo: 'M',
    convenio: 'Unimed',
    idadeMin: 18,
    idadeMax: 65
});
```

#### Exames
```javascript
// Por tipo
const examesLab = parser.filterExamesByTipo(exames, 'laboratorial');

// Por período
const examesRecentes = parser.filterExamesByPeriodo(
    exames, 
    '2024-01-01', 
    '2024-12-31'
);

// Agrupamento por tipo
const examesAgrupados = parser.groupExamesByTipo(exames);

// Busca por termo
const examesEncontrados = parser.searchExames(exames, 'hemograma');
```

#### Evoluções
```javascript
// Por profissional
const evolucoesDrJoao = parser.filterEvolucoesByProfissional(
    evolucoes, 
    'Dr. João'
);

// Por período
const evolucoesRecentes = parser.filterEvolucoesByPeriodo(
    evolucoes,
    '2024-01-01',
    '2024-01-31'
);

// Agrupamento por data
const evolucoesAgrupadas = parser.groupEvolucoesByDate(evolucoes);
```

## Uso de Parsers Especializados

Para casos específicos, você pode usar os parsers especializados diretamente:

```javascript
const { ClinicaParser, PacienteParser, ExamesParser } = require('./src/parsers');

// Parser de clínicas
const clinicaParser = new ClinicaParser();
const clinicas = clinicaParser.parse(html);
const clinica = clinicaParser.findByCode(html, '123');

// Parser de pacientes
const pacienteParser = new PacienteParser();
const pacientes = pacienteParser.parse(html, codigoClinica);
const paciente = pacienteParser.findByProntuario(html, '456');

// Parser de exames
const examesParser = new ExamesParser();
const exames = examesParser.parse(html, prontuario);
const tipos = examesParser.extractAvailableTypes(html);
```

## Constantes Úteis

```javascript
const { TIPOS_EXAMES, TIPOS_EVOLUCAO, STATUS_EVOLUCAO } = require('./src/parsers');

// Tipos de exames
console.log(TIPOS_EXAMES.LABORATORIAL); // 'laboratorial'
console.log(TIPOS_EXAMES.IMAGEM); // 'imagem'

// Tipos de evolução
console.log(TIPOS_EVOLUCAO.CONSULTA); // 'consulta'
console.log(TIPOS_EVOLUCAO.INTERNACAO); // 'internacao'

// Status de evolução
console.log(STATUS_EVOLUCAO.FINALIZADA); // 'finalizada'
```

## Debug e Desenvolvimento

### Modo Debug
```javascript
parser.setDebugMode(true); // Habilita logs detalhados
const resultado = parser.parseAuto(html);
parser.setDebugMode(false);

// Ou use o método de debug
const resultado = parser.debugParse(html, context);
```

### Estatísticas
```javascript
const resultado = parser.parseAuto(html);
const stats = parser.getParseStats(resultado);
console.log(stats); // Mostra totais e timestamp
```

## Métodos de Conveniência

### Clínicas
```javascript
const codigos = parser.getAvailableClinicaCodes(html);
const clinica = parser.findClinicaByCodigo(html, '123');
```

### Pacientes
```javascript
const prontuarios = parser.getAvailableProntuarios(html, codigoClinica);
const paciente = parser.findPacienteByProntuario(html, '456');
```

### Exames
```javascript
const tipos = parser.getAvailableExamTypes(html);
```

### Evoluções
```javascript
const profissionais = parser.getUniqueProfissionais(evolucoes);
```

## Prontuário Completo (Novo)

```javascript
// Parse completo de prontuário
const prontuario = parser.parseProntuario(html, numeroProntuario);

console.log(prontuario.dadosPaciente); // Dados do paciente
console.log(prontuario.internacoes); // Lista de internações
console.log(prontuario.consultas); // Lista de consultas
console.log(prontuario.diagnosticos); // Lista de diagnósticos
console.log(prontuario.medicamentos); // Lista de medicamentos
console.log(prontuario.alergias); // Lista de alergias

// Resumo do prontuário
const resumo = parser.extractProntuarioResumo(prontuario);
```

## Validação e Tratamento de Erros

```javascript
try {
    parser.validateHTML(html);
    const resultado = parser.parseAuto(html);
} catch (error) {
    console.error('Erro no parse:', error.message);
}
```

## Migração e Rollback

Se necessário fazer rollback para a versão anterior:

```bash
node src/parsers/migrate.js --rollback
```

Para ver informações sobre a migração:

```bash
node src/parsers/migrate.js --info
```

## Exemplos Práticos

### Buscar Pacientes de uma Clínica com Filtros
```javascript
const clinicas = parser.parseClinicas(htmlClinicas);
const codigoClinica = clinicas[0].codigo;

const htmlPacientes = await fetch(`/api/clinicas/${codigoClinica}/pacientes`);
const pacientes = parser.parsePacientes(htmlPacientes, codigoClinica);

const pacientesFiltrados = parser.filterPacientes(pacientes, {
    sexo: 'F',
    idadeMin: 25,
    idadeMax: 45
});
```

### Análise de Exames por Período
```javascript
const exames = parser.parseExames(htmlExames, prontuario);
const examesRecentes = parser.filterExamesByPeriodo(exames, '2024-01-01', '2024-12-31');
const examesAgrupados = parser.groupExamesByTipo(examesRecentes);

console.log(`Exames laboratoriais: ${examesAgrupados.laboratorial?.length || 0}`);
console.log(`Exames de imagem: ${examesAgrupados.imagem?.length || 0}`);
```

### Evolução Médica com Filtros
```javascript
const evolucoes = parser.parseEvolucoes(htmlEvolucoes, prontuario);
const evolucoesJaneiro = parser.filterEvolucoesByPeriodo(evolucoes, '2024-01-01', '2024-01-31');
const profissionais = parser.getUniqueProfissionais(evolucoesJaneiro);

for (const profissional of profissionais) {
    const evolucoesProfissional = parser.filterEvolucoesByProfissional(
        evolucoesJaneiro, 
        profissional
    );
    console.log(`${profissional}: ${evolucoesProfissional.length} evoluções`);
}
```

## Suporte e Manutenção

- **Compatibilidade**: Mantida com código existente
- **Backup**: Parser original salvo como `hicd-parser-original.js`
- **Logs**: Disponíveis em modo debug
- **Rollback**: Possível a qualquer momento

Esta nova arquitetura oferece maior flexibilidade e recursos avançados mantendo a simplicidade de uso da versão anterior.
