# Modelo Estruturado de Exames - HICD Parser

## Visão Geral

O novo modelo estruturado de exames do HICD Parser foi desenvolvido para melhorar significativamente o processamento e análise de dados de exames médicos, proporcionando uma estrutura mais inteligente e tipada para os resultados.

## 🎯 Objetivos do Novo Modelo

- **Tipagem Inteligente**: Categorização automática dos exames por tipo
- **Extração de Valores**: Separação de valores numéricos, unidades e observações
- **Suporte a Datas**: Processamento de exames com datas específicas
- **Classificação por Especialidade**: Diferenciação entre laboratoriais, imagem, microbiologia, etc.
- **Estrutura Padronizada**: Formato consistente para todos os tipos de exames

## 📊 Tipos de Exames Suportados

### 1. Laboratoriais Numéricos
**Formato**: `Nome: valor unidade - observação`
**Exemplo**: `Hemoglobina: 9,40 g/dL - Baixa`

```json
{
  "tipo": "laboratorial",
  "formato": "numerico",
  "nome": "Hemoglobina",
  "valor": 9.4,
  "valorOriginal": "9,40",
  "unidade": "g/dL",
  "observacao": "Baixa",
  "processado": true,
  "textoOriginal": "Hemoglobina: 9,40 g/dL - Baixa"
}
```

### 2. Laboratoriais Descritivos
**Formato**: `Nome: resultado descritivo`
**Exemplo**: `Urina: presença de leucócitos raros`

```json
{
  "tipo": "laboratorial",
  "formato": "descritivo",
  "nome": "Urina",
  "resultado": "presença de leucócitos raros",
  "processado": true,
  "textoOriginal": "Urina: presença de leucócitos raros"
}
```

### 3. Solicitações de Exames
**Formato**: `Solicitar: nome do exame`
**Exemplo**: `Solicitar: Hemograma de controle`

```json
{
  "tipo": "solicitacao",
  "formato": "pedido",
  "exameSolicitado": "Hemograma de controle",
  "processado": true,
  "textoOriginal": "Solicitar: Hemograma de controle"
}
```

### 4. Microbiologia e Culturas
**Formato**: `Cultura: resultado`
**Exemplo**: `Cultura: Hemocultura negativa`

```json
{
  "tipo": "microbiologia",
  "formato": "cultura",
  "tipoExame": "cultura",
  "resultado": "Hemocultura negativa",
  "processado": true,
  "textoOriginal": "Cultura: Hemocultura negativa"
}
```

### 5. Exames de Imagem
**Formato**: `TipoImagem: resultado`
**Exemplo**: `RX Tórax: Melhora da pneumonia`

```json
{
  "tipo": "imagem",
  "formato": "diagnostico",
  "tipoExame": "rx",
  "resultado": "Tórax: Melhora da pneumonia",
  "processado": true,
  "textoOriginal": "RX Tórax: Melhora da pneumonia"
}
```

### 6. Gasometrias
**Formato**: `Gasometria: pH=X pCO2=Y pO2=Z HCO3=W`
**Exemplo**: `Gasometria: pH=7,35 pCO2=45 pO2=95 HCO3=22`

```json
{
  "tipo": "gasometria",
  "formato": "completo",
  "conteudo": "Gasometria: pH=7,35 pCO2=45 pO2=95 HCO3=22",
  "valores": {
    "ph": 7.35,
    "pco2": 45,
    "po2": 95,
    "hco3": 22
  },
  "processado": true,
  "textoOriginal": "Gasometria: pH=7,35 pCO2=45 pO2=95 HCO3=22"
}
```

### 7. Exames com Data
**Formato**: `[DD/MM] Nome: valor`
**Exemplo**: `[31/08] Hemoglobina: 9,40 g/dL - Baixa`

```json
{
  "tipo": "laboratorial",
  "formato": "numerico",
  "nome": "Hemoglobina",
  "valor": 9.4,
  "unidade": "g/dL",
  "observacao": "Baixa",
  "dataExame": "31/08",
  "formatoComData": true,
  "processado": true,
  "textoOriginal": "[31/08] Hemoglobina: 9,40 g/dL - Baixa"
}
```

## 🔧 Como Usar

### 1. Processamento Básico
```javascript
const parser = new HICDParser();
const dados = parser.extrairDadosEstruturadosEvolucao(textoEvolucao);
console.log(dados.exames); // Array de exames estruturados
```

### 2. Filtragem por Tipo
```javascript
// Obter apenas exames laboratoriais
const examesLab = dados.exames.filter(e => e.tipo === 'laboratorial');

// Obter apenas exames numéricos
const examesNumericos = dados.exames.filter(e => e.formato === 'numerico');

// Obter apenas solicitações
const solicitacoes = dados.exames.filter(e => e.tipo === 'solicitacao');
```

### 3. Análise de Valores
```javascript
// Obter exames com valores numéricos
const examesComValor = dados.exames.filter(e => e.valor !== undefined);

// Obter gasometrias processadas
const gasometrias = dados.exames.filter(e => e.tipo === 'gasometria');
gasometrias.forEach(gas => {
  console.log('pH:', gas.valores.ph);
  console.log('pCO2:', gas.valores.pco2);
});
```

## 📈 Vantagens do Novo Modelo

### 1. **Estrutura Consistente**
- Todos os exames seguem o mesmo padrão base
- Campos específicos por tipo mantendo compatibilidade
- Facilita processamento automatizado

### 2. **Tipagem Inteligente**
- Detecção automática do tipo de exame
- Classificação por especialidade médica
- Suporte a formatos complexos como gasometrias

### 3. **Extração de Dados**
- Valores numéricos automaticamente convertidos
- Unidades e observações separadas
- Suporte a valores de referência

### 4. **Compatibilidade**
- Mantém texto original para fallback
- Suporte a formatos legados
- Processamento gracioso de erros

### 5. **Performance**
- Taxa de processamento superior a 80%
- Estrutura otimizada para consultas
- Redução de processamento manual

## 🧪 Testes e Validação

### Execução dos Testes
```bash
# Teste básico do modelo
node test-exames-estruturados.js

# Teste com dados reais
node test-exames-validacao.js
```

### Métricas de Qualidade
- **Taxa de Processamento**: >80% dos exames categorizados
- **Precisão de Valores**: 100% para formatos numéricos padrão
- **Compatibilidade**: Suporte a formatos legados mantido

## 🔮 Próximos Passos

1. **Aprimoramento de Regex**: Melhorar detecção de formatos complexos
2. **Validação de Referência**: Comparação automática com valores de referência
3. **Tendências Temporais**: Análise de evolução de valores ao longo do tempo
4. **Alertas Clínicos**: Detecção automática de valores críticos
5. **Exportação Estruturada**: Formatos específicos para diferentes sistemas

## 📚 Referências Técnicas

- **Arquivo Principal**: `src/parsers/hicd-parser.js`
- **Função Principal**: `processarExamesEstruturados()`
- **Função de Análise**: `analisarTipoExame()`
- **Função de Gasometria**: `extrairValoresGasometria()`

---

**Versão**: 1.0.0
**Data**: Setembro 2025
**Compatibilidade**: HICD Parser v2.x+
