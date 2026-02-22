# Módulo de Passagem de Plantão - HICD System

## 📋 Visão Geral

O módulo de Passagem de Plantão é uma interface especializada para facilitar a transição de cuidados entre equipes médicas. O sistema foi desenvolvido seguindo os melhores padrões de UI/UX e foca na validação de **evoluções diárias completas**.

## 🎯 Características Principais

### ✅ Validação de Evolução Diária
O sistema verifica automaticamente se o paciente possui uma **evolução diária completa**, definida como uma evolução que atende aos seguintes critérios:

- **Data recente**: Evolução das últimas 24 horas
- **Metadados completos**:
  - `metadata.temDiagnostico = true`
  - `metadata.temMedicamentos = true` 
  - `metadata.temSinaisVitais = true`

### 🔄 Fluxo de Navegação em 3 Etapas

#### **Etapa 1: Seleção de Clínica**
- Interface de busca e filtro de clínicas
- Visualização em grid responsivo
- Estatísticas por clínica (pacientes, leitos ocupados)
- Busca por nome ou código

#### **Etapa 2: Seleção de Paciente**
- Lista de pacientes da clínica selecionada
- **Indicador visual** de status da evolução diária:
  - 🟢 **Verde**: Evolução completa (todos os metadados presentes)
  - 🟡 **Amarelo**: Evolução incompleta (metadados faltando)
- Filtros por nome, prontuário e status
- Estatísticas em tempo real

#### **Etapa 3: Relatório de Passagem**
- Relatório completo e estruturado
- Seções organizadas por importância clínica
- Formatação otimizada para impressão
- Configurações personalizáveis

## 📊 Estrutura do Relatório

### 🏥 **Cabeçalho do Paciente**
- Nome, prontuário, leito
- Clínica, data de internação
- Convênio, médico responsável
- **Status da evolução diária** (completa/incompleta)

### 🩺 **Seções Clínicas**

1. **Diagnósticos Principais**
   - Extraídos do campo `hipotesesDiagnosticas`
   - Diferenciação entre principal e secundários
   - Código de cores por prioridade

2. **Medicamentos em Uso**
   - Lista dos medicamentos ativos
   - Baseado no campo `medicamentos` da evolução
   - Informações de dose e horário quando disponíveis

3. **Sinais Vitais Recentes**
   - Grid responsivo com últimos registros
   - Valores extraídos do campo `sinaisVitais`
   - Indicação de horário do último registro

4. **Exames Recentes**
   - Últimos 5 exames realizados
   - Integração com API de exames
   - Data e tipo de exame

5. **Evolução Médica**
   - Texto completo da evolução mais recente
   - Metadados (profissional, data, horário)
   - Formatação preservada

6. **Observações e Cuidados Especiais**
   - Alertas automáticos baseados nos metadados
   - Identificação de dados faltantes
   - Recomendações de cuidado

## 🛠️ Funcionalidades Técnicas

### 📱 **Design Responsivo**
- Layout adaptável para desktop, tablet e mobile
- Interface touch-friendly
- Otimização para diferentes tamanhos de tela

### ♿ **Acessibilidade**
- Navegação por teclado
- Contraste adequado para daltonismo
- Screen reader friendly
- Indicadores visuais claros

### 🖨️ **Impressão Otimizada**
- CSS específico para impressão
- Remoção de elementos desnecessários
- Formatação profissional
- Quebras de página inteligentes

### ⚙️ **Configurações Personalizáveis**
- Seções visíveis/ocultas
- Período de dados (24h, 48h, 72h, 1 semana)
- Preferências salvas localmente

### 🔌 **Integração com API**
- Endpoints utilizados:
  - `GET /api/clinicas` - Lista de clínicas
  - `GET /api/clinicas/{codigo}/pacientes` - Pacientes por clínica
  - `GET /api/pacientes/{prontuario}/evolucoes` - Evoluções do paciente
  - `GET /api/pacientes/{prontuario}/exames` - Exames do paciente

## 🚀 Como Usar

### 1. **Acesso ao Módulo**
- Via navegação principal: "Passagem de Plantão"
- Via dashboard: botão de acesso rápido
- URL direta: `/passagem-plantao.html`

### 2. **Fluxo de Uso**
1. **Selecione a clínica** desejada na primeira tela
2. **Escolha o paciente** na lista filtrada
3. **Visualize o relatório** completo gerado automaticamente
4. **Configure** as seções conforme necessário
5. **Imprima** ou exporte o relatório

### 3. **Interpretação dos Indicadores**

#### Status de Evolução Diária:
- ✅ **Completa**: Todos os metadados presentes, evolução recente
- ⚠️ **Incompleta**: Metadados ausentes ou evolução antiga

#### Cores dos Indicadores:
- 🟢 **Verde**: Dados completos e atualizados
- 🟡 **Amarelo**: Dados parciais ou observações
- 🔴 **Vermelho**: Dados críticos ausentes

## 📋 Requisitos do Sistema

### **Dados Necessários**
Para o funcionamento ideal, o sistema precisa de:

1. **Clínicas cadastradas** com códigos válidos
2. **Pacientes associados** às clínicas
3. **Evoluções médicas** com estrutura padronizada:
   ```javascript
   {
     metadata: {
       temDiagnostico: boolean,
       temMedicamentos: boolean,
       temSinaisVitais: boolean
     },
     dadosClinicosEstruturados: {
       hipotesesDiagnosticas: array,
       medicamentos: array,
       sinaisVitais: object
     }
   }
   ```

### **APIs Funcionais**
- Servidor HICD rodando na porta 3000
- Endpoints de clínicas, pacientes e evoluções disponíveis
- Autenticação configurada no sistema

## 🔧 Configuração e Personalização

### **Ajustar Período de Evolução**
No arquivo `passagem-plantao.js`, modifique:
```javascript
// Linha ~127
const diffHours = (hoje - evolucaoData) / (1000 * 60 * 60);
if (diffHours > 24) return false; // Alterar de 24 para outro valor
```

### **Adicionar Novos Campos**
1. Modifique o modelo `Evolucao.js` no backend
2. Atualize a função `renderEvolucaoData()` no frontend
3. Adicione nova seção no HTML se necessário

### **Personalizar Estilos**
- Modifique `css/passagem-plantao.css` para ajustes visuais
- Use variáveis CSS para mudanças de cores/fontes
- Mantenha responsividade ao fazer alterações

## 🐛 Solução de Problemas

### **Problemas Comuns**

#### "Nenhuma clínica encontrada"
- Verificar se API está rodando
- Verificar endpoint `/api/clinicas`
- Checar logs do servidor

#### "Evolução diária incompleta"
- Verificar se evolução tem todos os metadados
- Confirmar se data é das últimas 24h
- Validar estrutura dos dados

#### "Erro ao carregar dados"
- Verificar conexão com API
- Checar CORS no servidor
- Validar formato de resposta da API

### **Debug e Logs**
O sistema inclui logs detalhados no console do navegador:
```javascript
// Ativar logs verbosos
localStorage.setItem('debug', 'true');
```

## 📈 Melhorias Futuras

### **Funcionalidades Planejadas**
- [ ] Exportação para PDF nativo
- [ ] Notificações push para evoluções pendentes
- [ ] Integração com prontuário eletrônico
- [ ] Dashboard de indicadores de qualidade
- [ ] Histórico de passagens de plantão
- [ ] Assinatura digital do responsável

### **Otimizações Técnicas**
- [ ] Cache inteligente de dados
- [ ] Lazy loading de imagens
- [ ] Service Worker para offline
- [ ] Progressive Web App completa

## 📞 Suporte

Para suporte técnico ou dúvidas sobre o módulo:
- Consulte logs do console do navegador
- Verifique documentação da API HICD
- Teste endpoints individualmente
- Valide estrutura de dados do backend

---

**Desenvolvido para Sistema HICD**  
*Versão 1.0 - Setembro 2025*