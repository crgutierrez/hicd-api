# 🏥 Crawler de Prescrições Médicas - HICD

## 📋 Visão Geral

O crawler de prescrições médicas foi desenvolvido para extrair informações detalhadas sobre prescrições médicas de pacientes do sistema HICD (Hospital de Urgência e Emergência de Rondônia). Esta funcionalidade permite acesso automatizado às prescrições médicas seguindo o fluxo específico do sistema.

## 🚀 Funcionalidades Principais

### 1. Busca de Prescrições por Paciente
- Extração de todas as prescrições de um paciente específico
- Filtros por período de tempo
- Informações básicas de cada prescrição

### 2. Detalhes de Prescrições
- Medicamentos prescritos com posologia
- Observações médicas
- Assinaturas e CRM dos médicos
- Data e hora de impressão

### 3. Parsing Inteligente
- Extração automática de dados das tabelas HTML
- Fallback para parsing de texto livre
- Validação e limpeza dos dados extraídos

## 🔧 Como Usar

### Instalação e Configuração

```javascript
const HICDCrawler = require('./hicd-crawler-refactored');

// Instanciar o crawler
const crawler = new HICDCrawler(true); // debug mode ativado
```

### Exemplo Básico

```javascript
async function buscarPrescricoes() {
    try {
        // 1. Fazer login
        const login = await crawler.fazerLogin('usuario', 'senha');
        if (!login.sucesso) {
            throw new Error('Falha no login');
        }
        
        // 2. Buscar prescrições do paciente
        const prescricoes = await crawler.getPrescricoesPaciente('123456');
        console.log(`Encontradas ${prescricoes.lista.length} prescrições`);
        
        // 3. Obter detalhes de uma prescrição específica
        if (prescricoes.lista.length > 0) {
            const detalhes = await crawler.getPrescricaoDetalhes(prescricoes.lista[0].id);
            console.log('Medicamentos prescritos:', detalhes.dados.medicamentos);
        }
        
        // 4. Fazer logout
        await crawler.fazerLogout();
        
    } catch (error) {
        console.error('Erro:', error.message);
    }
}
```

## 📡 Fluxo de URLs

O crawler segue um fluxo específico de 3 etapas para acessar as prescrições:

### 1. Acesso ao Módulo de Prescrições
```
URL: https://hicd-hospub.sesau.ro.gov.br/prontuario/frontend/controller/controller.php
Parâmetros: Param=RUNPLUGIN%PM&ParamModule=2751
```

### 2. Interface de Consulta
```
URL: https://hicd-hospub.sesau.ro.gov.br/prescricao_medica3/interface/consulta.php
Método: GET
```

### 3. Lista de Prescrições
```
URL: https://hicd-hospub.sesau.ro.gov.br/prescricao_medica3/scripts/todas_prescricoes.php
Parâmetros: reg_int={registro}&leito={leito}&data_ini={dataInicio}&data_fim={dataFim}
```

### 4. Detalhes da Prescrição
```
URL: https://hicd-hospub.sesau.ro.gov.br/prescricao_medica3/interface/imprime.php
Parâmetros: id_prescricao={id}
```

## 📊 Estrutura dos Dados

### Objeto de Prescrição (Lista)
```javascript
{
    id: "789123",                    // ID único da prescrição
    codigo: "PM001",                 // Código da prescrição
    dataHora: "15/12/2024 14:30",   // Data e hora da prescrição
    pacienteNome: "PACIENTE TESTE",  // Nome do paciente
    registro: "REG001",              // Número do registro
    internacao: "INT001",            // Código da internação
    enfLeito: "ENF-LEITO-01",       // Enfermaria e leito
    clinica: "CLÍNICA MÉDICA",      // Clínica responsável
    prontuario: "123456"            // Número do prontuário
}
```

### Objeto de Detalhes da Prescrição
```javascript
{
    id: "789123",
    cabecalho: {
        pacienteNome: "PACIENTE TESTE",
        prontuario: "123456",
        leito: "ENF-LEITO-01",
        dataPrescricao: "15/12/2024",
        medico: "Dr. João Silva - CRM 12345"
    },
    medicamentos: [
        {
            nome: "DIPIRONA 500MG",
            posologia: "1 comprimido de 6/6h",
            observacao: "Se dor ou febre"
        }
    ],
    observacoes: [
        "Paciente com histórico de hipertensão"
    ],
    assinaturas: [
        "Dr. João Silva",
        "CRM 12345 - RO"
    ],
    dataHoraImpressao: "15/12/2024 14:35"
}
```

## 🛠️ Métodos Disponíveis

### `getPrescricoesPaciente(prontuario, opcoes)`
Busca todas as prescrições de um paciente.

**Parâmetros:**
- `prontuario` (string): Número do prontuário do paciente
- `opcoes` (object, opcional): Opções de filtro
  - `filtroData` (boolean): Aplicar filtro de data
  - `diasAtras` (number): Número de dias para buscar no passado

**Retorno:**
```javascript
{
    sucesso: true,
    lista: [...], // Array de prescrições
    total: 5,
    erro: null
}
```

### `getPrescricaoDetalhes(idPrescricao)`
Obtém os detalhes completos de uma prescrição específica.

**Parâmetros:**
- `idPrescricao` (string): ID da prescrição

**Retorno:**
```javascript
{
    sucesso: true,
    dados: {...}, // Objeto com detalhes da prescrição
    erro: null
}
```

## 🧩 Métodos de Parsing

### `parsePrescricoesList(html, prontuario)`
Extrai lista de prescrições do HTML da página de listagem.

### `parsePrescricaoDetalhes(html, idPrescricao)`
Extrai detalhes completos de uma prescrição específica.

### Métodos Auxiliares de Parsing
- `extrairCabecalhoPrescricao()`: Extrai informações do cabeçalho
- `extrairMedicamentosPrescricao()`: Extrai medicamentos da tabela
- `extrairObservacoesPrescricao()`: Extrai observações médicas
- `extrairAssinaturasPrescricao()`: Extrai assinaturas dos médicos

## ⚠️ Considerações Importantes

### Autenticação e Sessão
- É necessário estar logado no sistema HICD
- A sessão deve permanecer ativa durante toda a extração
- Sempre fazer logout ao final das operações

### Permissões
- Verificar se o usuário tem permissão para acessar prescrições médicas
- Alguns dados podem estar restritos por perfil de usuário
- Respeitar as políticas de acesso do hospital

### Performance
- Incluir pausas entre requisições para não sobrecarregar o servidor
- Processar prescrições em lotes quando necessário
- Monitorar timeouts e reconexões

### Tratamento de Erros
- Validar sempre o sucesso das operações
- Implementar retry para falhas temporárias
- Logs detalhados para troubleshooting

## 📝 Exemplos Avançados

### Buscar Prescrições Recentes
```javascript
async function prescricoesRecentes(prontuario, dias = 7) {
    const prescricoes = await crawler.getPrescricoesPaciente(prontuario);
    
    const recentes = prescricoes.lista.filter(p => {
        const dataPrescricao = new Date(p.dataHora.split(' ')[0].split('/').reverse().join('-'));
        const agora = new Date();
        const diasAtras = new Date(agora.getTime() - (dias * 24 * 60 * 60 * 1000));
        
        return dataPrescricao >= diasAtras;
    });
    
    return recentes;
}
```

### Análise de Medicamentos
```javascript
async function analisarMedicamentos(prescricoes) {
    const medicamentos = {};
    
    for (const prescricao of prescricoes) {
        const detalhes = await crawler.getPrescricaoDetalhes(prescricao.id);
        
        if (detalhes.sucesso) {
            detalhes.dados.medicamentos.forEach(med => {
                const nome = med.nome.toUpperCase();
                medicamentos[nome] = (medicamentos[nome] || 0) + 1;
            });
        }
        
        // Pausa entre requisições
        await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    return medicamentos;
}
```

### Exportar para CSV
```javascript
async function exportarCSV(prescricoes, nomeArquivo) {
    const fs = require('fs').promises;
    
    let csv = 'ID,Data,Paciente,Clinica,Medicamento,Posologia,Observacao\n';
    
    for (const prescricao of prescricoes) {
        const detalhes = await crawler.getPrescricaoDetalhes(prescricao.id);
        
        if (detalhes.sucesso) {
            detalhes.dados.medicamentos.forEach(med => {
                const linha = [
                    prescricao.id,
                    prescricao.dataHora,
                    prescricao.pacienteNome,
                    prescricao.clinica,
                    med.nome,
                    med.posologia,
                    med.observacao
                ].map(campo => `"${campo}"`).join(',');
                
                csv += linha + '\n';
            });
        }
    }
    
    await fs.writeFile(nomeArquivo, csv, 'utf8');
}
```

## 🔍 Troubleshooting

### Problemas Comuns

1. **Erro de Login**
   - Verificar credenciais
   - Confirmar se o usuário tem acesso ao sistema
   - Verificar se não há captcha ou outros bloqueios

2. **Prescrições Não Encontradas**
   - Verificar se o prontuário está correto
   - Confirmar se há prescrições para o período consultado
   - Verificar permissões de acesso

3. **Erro de Parsing**
   - HTML do sistema pode ter mudado
   - Verificar se os seletores CSS ainda são válidos
   - Ativar modo debug para análise detalhada

4. **Timeout de Sessão**
   - Fazer login novamente
   - Reduzir tempo entre requisições
   - Implementar renovação automática de sessão

### Debug e Logs
```javascript
// Ativar modo debug
const crawler = new HICDCrawler(true);

// Salvar HTML para análise
await fs.writeFile('debug.html', html, 'utf8');

// Logs detalhados
console.log('[DEBUG] URL:', url);
console.log('[DEBUG] Parâmetros:', params);
console.log('[DEBUG] Resposta:', response.status);
```

## 📞 Suporte

Para problemas ou dúvidas sobre o uso do crawler de prescrições:

1. Verificar este documento de documentação
2. Executar os exemplos de teste
3. Ativar modo debug para análise detalhada
4. Consultar logs do sistema HICD

## 🔄 Versionamento

**Versão 1.0.0**
- Implementação inicial
- Busca de prescrições por paciente
- Extração de detalhes de prescrições
- Parsing de medicamentos e observações

---

**Última atualização:** Dezembro 2024  
**Compatibilidade:** Sistema HICD v3.x
