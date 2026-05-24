# Documentação da API - HICD-BOT

Esta documentação descreve os endpoints disponíveis na API do HICD-BOT, responsável por fazer o crawling e a extração de dados do sistema HICD.

**URL Base:** `http://localhost:3000/api`

**Autenticação:** Todos os endpoints requerem uma sessão de usuário autenticada. A autenticação é gerenciada via cookies (`connect.sid`) que devem ser enviados em cada requisição após o login.

---

## 1. Clínicas

Endpoints relacionados à listagem e detalhamento de clínicas.

### 1.1 Listar Todas as Clínicas

Recupera uma lista de todas as clínicas disponíveis no sistema.

-   **Método:** `GET`
-   **Endpoint:** `/clinicas`
-   **Resposta de Sucesso (200 OK):**
    ```json
    {
      "success": true,
      "source": "live",
      "data": [
        {
          "codigo": "1",
          "nome": "UTI PEDIATRICA",
          "endereco": "Rua Exemplo, 123",
          "telefone": "(00) 1234-5678"
        }
      ]
    }
    ```

### 1.2 Listar Pacientes de uma Clínica

Recupera a lista de pacientes atualmente internados em uma clínica específica.

-   **Método:** `GET`
-   **Endpoint:** `/clinicas/:id/pacientes`
-   **Parâmetros da URL:**
    -   `id` (string): O ID da clínica.
-   **Resposta de Sucesso (200 OK):**
    ```json
    {
      "success": true,
      "source": "live",
      "data": [
        {
          "prontuario": "12345",
          "nome": "NOME DO PACIENTE",
          "leito": "01A",
          "dataNascimento": "01/01/2020"
        }
      ]
    }
    ```

### 1.3 Obter Estatísticas da Clínica

Retorna estatísticas sobre os pacientes de uma clínica, como total de pacientes e status da evolução diária.

-   **Método:** `GET`
-   **Endpoint:** `/clinicas/:id/stats`
-   **Parâmetros da URL:**
    -   `id` (string): O ID da clínica.
-   **Resposta de Sucesso (200 OK):**
    ```json
    {
        "totalPacientes": 15,
        "comEvolucaoDiaria": 10,
        "semEvolucaoDiaria": 5
    }
    ```

### 1.4 Buscar Pareceres por Clínica

Recupera uma lista de todas as solicitações de parecer encontradas nas evoluções dos pacientes de uma determinada clínica.

-   **Método:** `GET`
-   **Endpoint:** `/clinicas/:idClinica/pareceres`
-   **Parâmetros da URL:**
    -   `idClinica` (string): O ID da clínica.
-   **Resposta de Sucesso (200 OK):**
    ```json
    {
      "success": true,
      "source": "live",
      "data": [
        {
          "urgente": false,
          "solicitante": "PEDIATRIA",
          "solicitado": "CARDIOPEDIATRA",
          "motivo": "Elucidação diagnóstica",
          "hipoteseDiagnostica": "1. Dispneia em repouso...",
          "historiaClinica": "Paciente com quadro de dispneia...",
          "conduta": "Solicito avaliação, grata.",
          "paciente": {
            "nome": "NOME DO PACIENTE",
            "prontuario": "12345",
            "leito": "01A"
          },
          "dataEvolucao": "16/10/2025 10:30:00",
          "profissional": "NOME DO PROFISSIONAL"
        }
      ]
    }
    ```

---

## 2. Pacientes

Endpoints para obter informações detalhadas de um paciente específico.

### 2.1 Buscar Dados de um Paciente

Recupera os dados cadastrais de um paciente pelo número do prontuário.

-   **Método:** `GET`
-   **Endpoint:** `/pacientes/:prontuario`
-   **Parâmetros da URL:**
    -   `prontuario` (string): O número do prontuário do paciente.
-   **Resposta de Sucesso (200 OK):**
    ```json
    {
      "success": true,
      "source": "live",
      "data": {
        "dadosBasicos": {
          "prontuario": "12345",
          "nome": "NOME DO PACIENTE",
          "dataNascimento": "01/01/2020",
          "nomeMae": "NOME DA MÃE"
        },
        "dadosDemograficos": {
            "endereco": "Rua Exemplo, 123",
            "cidade": "Cidade Exemplo"
        }
      }
    }
    ```

### 2.2 Buscar Evoluções de um Paciente

Recupera o histórico de evoluções de um paciente.

-   **Método:** `GET`
-   **Endpoint:** `/pacientes/:prontuario/evolucoes`
-   **Parâmetros da URL:**
    -   `prontuario` (string): O número do prontuário do paciente.
-   **Resposta de Sucesso (200 OK):**
    ```json
    {
      "success": true,
      "prontuario": "12345",
      "data": [
        {
          "id": "12345_0_0",
          "pacienteId": "12345",
          "dataEvolucao": "16/10/2025 10:30:00",
          "profissional": "NOME DO PROFISSIONAL",
          "atividade": "MEDICO",
          "conteudo": {
            "textoCompleto": "Evolução médica do dia...",
            "resumo": "Evolução médica..."
          },
          "metadata": {
            "temDiagnostico": true,
            "temMedicamentos": true,
            "temSinaisVitais": true
          }
        }
      ]
    }
    ```

### 2.3 Buscar Exames de um Paciente

Recupera a lista de exames (laboratoriais e de imagem) de um paciente.

-   **Método:** `GET`
-   **Endpoint:** `/pacientes/:prontuario/exames`
-   **Parâmetros da URL:**
    -   `prontuario` (string): O número do prontuário do paciente.
-   **Resposta de Sucesso (200 OK):**
    ```json
    {
      "success": true,
      "data": [
        {
          "requisicao": "98765",
          "data": "15/10/2025",
          "medico": "NOME DO MÉDICO",
          "exames": [
            { "codigo": "HEMO", "nome": "Hemograma Completo" }
          ]
        }
      ]
    }
    ```

### 2.4 Buscar Prescrições de um Paciente

Recupera as prescrições médicas ativas e anteriores de um paciente.

-   **Método:** `GET`
-   **Endpoint:** `/pacientes/:prontuario/prescricoes`
-   **Parâmetros da URL:**
    -   `prontuario` (string): O número do prontuário do paciente.
-   **Resposta de Sucesso (200 OK):**
    ```json
    {
      "success": true,
      "data": [
        {
          "id": "54321",
          "dataPrescricao": "16/10/2025",
          "status": "Ativa",
          "itens": [
            {
              "medicamento": "DIPIRONA 500MG",
              "posologia": "1 comprimido a cada 6 horas",
              "observacao": "Se dor ou febre"
            }
          ]
        }
      ]
    }
    ```