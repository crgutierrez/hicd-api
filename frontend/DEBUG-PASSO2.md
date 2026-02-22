# Debug Passo 2 - Pacientes não aparecem

## Situação Atual

### ✅ APIs Testadas e Funcionando
1. **Clínicas**: `GET /api/clinicas` → 20 clínicas
2. **Pacientes**: `GET /api/clinicas/001/pacientes` → 1 paciente (ADRYAN RAVI)
3. **Evolução**: `GET /api/pacientes/41182/evolucoes` → dados detalhados

### 🛠️ Debug Implementado

#### JavaScript Principal (`js/passagem-plantao.js`)
- ✅ `loadPacientes()` com logging detalhado
- ✅ `loadEvolucoesPacientes()` com logs step-by-step
- ✅ `renderPacientes()` com debug completo
- ✅ `showSelectedClinica()` para verificar clínica selecionada

#### Interface HTML (`passagem-plantao.html`)
- ✅ Botões de debug no Passo 2:
  - "Recarregar Pacientes"
  - "Info Clínica"

#### Páginas de Teste
- ✅ `teste-pacientes.html` - teste isolado da API de pacientes
- ✅ `debug-plantao.html` - teste geral das APIs

## Como Debugar

### 1. Usar a Interface Principal
1. Abrir: http://localhost:8080/passagem-plantao.html
2. Selecionar clínica na Etapa 1
3. Ir para Etapa 2
4. Pressionar F12 para ver console
5. Usar botões "Recarregar Pacientes" e "Info Clínica"

### 2. Usar Página de Teste
1. Abrir: http://localhost:8080/teste-pacientes.html
2. Verificar se pacientes carregam corretamente
3. Comparar comportamento

### 3. Verificar Logs no Console
Os logs mostrarão:
- URL sendo chamada
- Status da resposta
- Dados recebidos
- Processo de renderização
- Erros específicos

## Estrutura Esperada da API

### Resposta de Pacientes
```json
{
  "success": true,
  "clinica": {"id": "001", "nome": "EMERGENCIA - INTERNADOS", "codigo": "001"},
  "data": [
    {
      "id": "41182",
      "prontuario": "41182", 
      "nome": "ADRYAN RAVI CRUZ VIEIRA LOREDOS",
      "idade": null,
      "sexo": null,
      "leito": null,
      "clinica": null
    }
  ],
  "total": 1
}
```

### Resposta de Evolução
```json
{
  "success": true,
  "data": [
    {
      "indicadores": {
        "temDiagnostico": false,
        "temMedicamentos": false, 
        "temSinaisVitais": false
      }
    }
  ]
}
```

## Próximos Passos

1. **Verificar console** após selecionar clínica e ir para Passo 2
2. **Identificar** onde o processo para de funcionar
3. **Corrigir** problema específico encontrado nos logs
4. **Testar** fluxo completo Passo 1 → Passo 2 → Passo 3