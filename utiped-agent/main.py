# Squad de Análise de Prontuários - UTI Pediátrica
# Integração Crew AI + Visual Hospub API

from crewai import Agent, Task, Crew, Process
from crewai.tools import BaseTool
import requests
import pandas as pd
import json
import re
from datetime import datetime, timedelta
from typing import List, Dict, Any

# =============================================================================
# FERRAMENTAS DE INTEGRAÇÃO COM VISUAL HOSPUB
# =============================================================================

class VisualHospubTool(BaseTool):
    """Ferramenta base para integração com Visual Hospub API"""
    
    def __init__(self, base_url: str, api_key: str):
        super().__init__()
        object.__setattr__(self, 'base_url', base_url)
        object.__setattr__(self, 'api_key', api_key)
        object.__setattr__(self, 'headers', {
            'Authorization': f'Bearer {api_key}',
            'Content-Type': 'application/json'
        })
    
    def _make_request(self, endpoint: str, method: str = 'GET', params: Dict = None):
        """Faz requisições para a API do Visual Hospub"""
        url = f"{self.base_url}/{endpoint}"
        try:
            response = requests.request(method, url, headers=self.headers, params=params)
            response.raise_for_status()
            return response.json()
        except requests.RequestException as e:
            return {"error": f"Erro na API: {str(e)}"}

class BuscarEvolucoesTool(VisualHospubTool):
    """Busca evoluções do paciente"""
    name: str = "buscar_evolucoes"
    description: str = "Busca todas as evoluções médicas do paciente nos últimos dias"
    
    def _run(self, paciente_id: str, dias: int = 7) -> str:
        """Busca evoluções do paciente"""
        endpoint = f"pacientes/{paciente_id}/evolucoes"
        params = {
            'formato': 'detalhado'
        }
        
        result = self._make_request(endpoint, params=params)
        
        if 'error' in result:
            return f"Erro: {result['error']}"
        
        # Verificar se a resposta está no formato esperado
        if not result.get('success', False):
            return f"Erro: API retornou falha - {result.get('message', 'Erro desconhecido')}"
        
        # Obter dados das evoluções
        evolucoes_data = result.get('data', [])
        
        if not evolucoes_data:
            return f"Nenhuma evolução encontrada para o paciente {paciente_id}"
        
        # Processar evoluções
        evolucoes_formatadas = [
            self._processar_evolucao(evo, paciente_id, i) 
            for i, evo in enumerate(evolucoes_data)
        ]
        
        # Retornar no formato especificado
        resultado_final = {
            "success": True,
            "prontuario": paciente_id,
            "data": evolucoes_formatadas
        }
        
        # Converter para string JSON para retorno
        import json
        return json.dumps(resultado_final, ensure_ascii=False, indent=2)
    
    def _processar_evolucao(self, evo: dict, paciente_id: str, index: int) -> dict:
        """Processa uma evolução individual"""
        # Extrair informações básicas
        data_evolucao = evo.get('dataEvolucao') or evo.get('data') or 'Data não informada'
        profissional = evo.get('profissional') or evo.get('medico', {}).get('nome') or 'Profissional não informado'
        atividade = evo.get('atividade') or evo.get('categoria') or 'MEDICO (QUALQUER ESPECIALIDADE)'
        
        # Extrair conteúdo
        conteudo_completo = evo.get('conteudo') or evo.get('textoCompleto') or evo.get('texto') or ''
        
        # Garantir que conteudo_completo seja uma string
        if isinstance(conteudo_completo, dict):
            # Se for dict, tentar extrair texto de possíveis campos
            conteudo_completo = (
                conteudo_completo.get('texto') or 
                conteudo_completo.get('textoCompleto') or 
                conteudo_completo.get('descricao') or 
                str(conteudo_completo)
            )
        elif not isinstance(conteudo_completo, str):
            conteudo_completo = str(conteudo_completo) if conteudo_completo else ''
        
        # Criar resumo (primeiras 20 palavras + ...)
        palavras = conteudo_completo.split()
        resumo = ' '.join(palavras[:20]) + ('...' if len(palavras) > 20 else '')
        
        # Extrair sinais vitais
        sinais_vitais = self._extrair_sinais_vitais(conteudo_completo)
        
        # Detectar presença de informações clínicas
        tem_diagnosticos, tem_medicamentos = self._detectar_informacoes_clinicas(conteudo_completo)
        
        return {
            "id": f"{paciente_id}_{index}",
            "pacienteId": paciente_id,
            "dataEvolucao": data_evolucao,
            "dataAtualizacao": evo.get('dataAtualizacao'),
            "profissional": profissional,
            "atividade": atividade,
            "subAtividade": evo.get('subAtividade'),
            "clinicaLeito": evo.get('clinicaLeito'),
            "conteudo": {
                "textoCompleto": conteudo_completo,
                "resumo": resumo
            },
            "dadosClinicosEstruturados": {
                "hipotesesDiagnosticas": [],
                "medicamentos": [],
                "exames": [],
                "sinaisVitais": sinais_vitais,
                "procedimentos": []
            },
            "metadata": {
                "tamanhoTexto": len(conteudo_completo),
                "temDiagnostico": tem_diagnosticos,
                "temMedicamentos": tem_medicamentos,
                "temSinaisVitais": bool(sinais_vitais),
                "dataExtracao": datetime.now().isoformat(),
                "fonte": "HICD",
                "versao": "1.0"
            }
        }
    
    def _extrair_sinais_vitais(self, texto: str) -> dict:
        """Extrai sinais vitais do texto usando regex"""
        import re
        sinais_vitais = {}
        
        # Garantir que texto seja uma string
        if not isinstance(texto, str):
            texto = str(texto) if texto else ''
        
        if not texto:
            return sinais_vitais
        
        # PAM ou PA
        pam_match = re.search(r'PAM?:?\s*(\d+-?\d*\s*mmHg)', texto, re.IGNORECASE)
        if pam_match:
            sinais_vitais['pressao'] = pam_match.group(1)
        
        # FC
        fc_match = re.search(r'FC:?\s*(\d+-?\d*\s*bpm)', texto, re.IGNORECASE)
        if fc_match:
            sinais_vitais['frequenciaCardiaca'] = fc_match.group(1)
        
        # FR
        fr_match = re.search(r'FR:?\s*(\d+-?\d*\s*i?rpm)', texto, re.IGNORECASE)
        if fr_match:
            sinais_vitais['frequenciaRespiratoria'] = fr_match.group(1)
        
        # Saturação
        sat_match = re.search(r'Sat:?\s*(\d+-?\d*\s*%)', texto, re.IGNORECASE)
        if sat_match:
            sinais_vitais['saturacao'] = sat_match.group(1)
        
        return sinais_vitais
    
    def _detectar_informacoes_clinicas(self, texto: str) -> tuple:
        """Detecta presença de diagnósticos e medicamentos no texto"""
        import re
        
        # Garantir que texto seja uma string
        if not isinstance(texto, str):
            texto = str(texto) if texto else ''
        
        tem_diagnosticos = bool(re.search(r'(diagnóstico|hipótese|cid)', texto, re.IGNORECASE))
        tem_medicamentos = bool(re.search(r'(medicamento|droga|prescrição|mg|ml)', texto, re.IGNORECASE))
        
        return tem_diagnosticos, tem_medicamentos

class BuscarExamesTool(VisualHospubTool):
    """Busca resultados de exames"""
    name: str = "buscar_exames"
    description: str = "Busca resultados de exames laboratoriais e de imagem do paciente"
    
    def _run(self, paciente_id: str, dias: int = 3) -> str:
        """Busca exames do paciente"""
        endpoint = f"pacientes/{paciente_id}/exames"
        
        result = self._make_request(endpoint)
        
        if 'error' in result:
            return json.dumps({
                "success": False,
                "prontuario": paciente_id,
                "error": result['error']
            }, indent=2, ensure_ascii=False)
        
        exames = result.get('data', [])
        exames_processados = []
        
        for exame in exames:
            exame_estruturado = self._processar_exame(exame, paciente_id)
            if exame_estruturado:
                exames_processados.append(exame_estruturado)
        
        response = {
            "success": True,
            "prontuario": paciente_id,
            "data": exames_processados
        }
        
        return json.dumps(response, indent=2, ensure_ascii=False)
    
    def _processar_exame(self, exame, paciente_id):
        """Processa um exame individual para o formato estruturado"""
        try:
            # Extrair informações básicas do exame
            requisicao_id = exame.get('requisicaoId')
            data = exame.get('data')
            hora = exame.get('hora')
            medico = exame.get('medico')
            clinica = exame.get('clinica')
            
            # Extrair status do exame
            status = {
                "coletado": exame.get('status', {}).get('coletado', False),
                "processado": exame.get('status', {}).get('processado', False),
                "liberado": exame.get('status', {}).get('liberado', False),
                "temResultados": exame.get('status', {}).get('temResultados', False)
            }
            
            # Extrair resumo
            resumo = exame.get('resumo', {})
            resumo_estruturado = {
                "totalExamesSolicitados": resumo.get('totalExamesSolicitados', 0),
                "totalResultados": resumo.get('totalResultados', 0),
                "siglasDisponveis": resumo.get('siglasDisponveis', [])
            }
            
            # Metadata
            metadata = {
                "dataProcessamento": datetime.now().isoformat(),
                "fonte": "HICD"
            }
            
            return {
                "id": exame.get('id'),
                "pacienteId": exame.get('pacienteId'),
                "requisicaoId": requisicao_id,
                "data": data,
                "hora": hora,
                "medico": medico,
                "clinica": clinica,
                "status": status,
                "resumo": resumo_estruturado,
                "metadata": metadata
            }
            
        except Exception as e:
            print(f"Erro ao processar exame: {e}")
            return None

class BuscarPrescricaoTool(VisualHospubTool):
    """Busca prescrições atuais"""
    name: str = "buscar_prescricao"
    description: str = "Busca prescrição médica atual do paciente"
    
    def _run(self, paciente_id: str) -> str:
        """Busca prescrição atual"""
        endpoint = f"pacientes/{paciente_id}/prescricoes"
        
        result = self._make_request(endpoint)
        
        if 'error' in result:
            return json.dumps({
                "success": False,
                "prontuario": paciente_id,
                "error": result['error']
            }, indent=2, ensure_ascii=False)
        
        prescricoes = result.get('data', [])
        prescricoes_processadas = []
        
        for prescricao in prescricoes:
            prescricao_estruturada = self._processar_prescricao(prescricao, paciente_id)
            if prescricao_estruturada:
                prescricoes_processadas.append(prescricao_estruturada)
        
        response = {
            "success": True,
            "prontuario": paciente_id,
            "data": prescricoes_processadas
        }
        
        return json.dumps(response, indent=2, ensure_ascii=False)
    
    def _processar_prescricao(self, prescricao, paciente_id):
        """Processa uma prescrição individual para o formato estruturado"""
        try:
            # Extrair informações básicas da prescrição
            id_prescricao = prescricao.get('id')
            codigo = prescricao.get('codigo', id_prescricao)
            data_hora = prescricao.get('dataHora')  # A API retorna 'dataHora' 
            
            # Os dados do cabeçalho estão dentro de 'detalhes'
            detalhes = prescricao.get('detalhes', {})
            cabecalho = detalhes.get('cabecalho', {})
            medicamentos = detalhes.get('medicamentos', [])
            
            # Extrair detalhes
            detalhes_estruturados = {
                "id": id_prescricao,
                "cabecalho": {
                    "pacienteNome": cabecalho.get('pacienteNome'),
                    "registro": cabecalho.get('registro'),
                    "prontuario": cabecalho.get('prontuario'),
                    "leito": cabecalho.get('leito'),
                    "dataNascimento": cabecalho.get('dataNascimento'),
                    "idade": cabecalho.get('idade'),
                    "peso": cabecalho.get('peso'),
                    "dataInternacao": cabecalho.get('dataInternacao'),
                    "clinica": cabecalho.get('clinica'),
                    "dataPrescricao": cabecalho.get('dataPrescricao'),
                    "hospital": cabecalho.get('hospital'),
                    "medico": cabecalho.get('medico'),
                    "crm": cabecalho.get('crm'),
                    "dataAssinatura": cabecalho.get('dataAssinatura'),
                    "acompanhante": cabecalho.get('acompanhante')
                },
                "medicamentos": self._processar_medicamentos(medicamentos)
            }
            
            return {
                "id": id_prescricao,
                "codigo": codigo,
                "dataHora": data_hora,
                "pacienteNome": prescricao.get('pacienteNome'),
                "registro": prescricao.get('registro'),
                "internacao": prescricao.get('internacao'),
                "enfLeito": prescricao.get('enfLeito'),
                "clinica": prescricao.get('clinica'),
                "prontuario": prescricao.get('prontuario', paciente_id),
                "detalhes": detalhes_estruturados
            }
            
        except Exception as e:
            print(f"Erro ao processar prescrição: {e}")
            return None
    
    def _processar_medicamentos(self, medicamentos):
        """Processa a lista de medicamentos"""
        medicamentos_processados = []
        
        for med in medicamentos:
            if isinstance(med, dict):
                # Extrair informações do medicamento usando campos corretos da API
                nome = med.get('nome', '')  # API usa 'nome'
                dose = med.get('dose', '')
                apresentacao = med.get('apresentacao', '')
                via = med.get('via', '')
                intervalo = med.get('intervalo', '')
                observacao = med.get('observacao', '')
                dias = med.get('dias', '')
                texto_completo = med.get('textoMedicamento', '')  # API usa 'textoMedicamento'
                
                # Detectar se é medicamento não padronizado
                nao_padronizado = med.get('naoPadronizado', False)
                
                medicamento_estruturado = {
                    "nome": nome,
                    "dose": dose,
                    "apresentacao": apresentacao,
                    "via": via,
                    "intervalo": intervalo,
                    "observacao": observacao,
                    "dias": dias,
                    "textoMedicamento": texto_completo
                }
                
                # Adicionar campos específicos para não padronizados
                if nao_padronizado:
                    medicamento_estruturado["naoPadronizado"] = True
                    medicamento_estruturado["posologia"] = med.get('posologia', '')
                
                medicamentos_processados.append(medicamento_estruturado)
        
        return medicamentos_processados

# =============================================================================
# DEFINIÇÃO DOS AGENTES
# =============================================================================

# Configuração das ferramentas (substitua pelos seus dados reais)
BASE_URL = "http://localhost:3000/api"
API_KEY = "sua_chave_api_aqui"

buscar_evolucoes = BuscarEvolucoesTool(BASE_URL, API_KEY)
buscar_exames = BuscarExamesTool(BASE_URL, API_KEY)
buscar_prescricao = BuscarPrescricaoTool(BASE_URL, API_KEY)

# AGENTE 1: REVISOR DE PRONTUÁRIOS
agente_revisor = Agent(
    role='Especialista em Revisão de Prontuários Pediátricos',
    goal='Analisar evoluções anteriores e identificar padrões clínicos relevantes',
    backstory="""Sou um intensivista pediátrico experiente com 15 anos de UTI. 
    Tenho expertise em identificar padrões sutis na evolução clínica de pacientes 
    críticos pediátricos. Analiso tendências, melhora ou piora clínica, e 
    correlaciono com intervenções realizadas.""",
    
    verbose=True,
    allow_delegation=False,
    tools=[buscar_evolucoes, buscar_exames],
    
    system_message="""Você deve:
    1. Revisar todas as evoluções dos últimos 7 dias
    2. Identificar tendências clínicas (melhora/piora/estabilidade)
    3. Correlacionar intervenções com outcomes
    4. Destacar mudanças significativas nos parâmetros
    5. Identificar padrões que precisam de atenção especial"""
)

# AGENTE 2: SINTETIZADOR CLÍNICO
agente_sintetizador = Agent(
    role='Especialista em Síntese Clínica Pediátrica',
    goal='Criar resumos executivos concisos e clinicamente relevantes',
    backstory="""Sou especialista em comunicação médica e síntese de informações 
    complexas. Transformo dados clínicos extensos em resumos claros, objetivos 
    e acionáveis para rounds médicos e tomada de decisão rápida.""",
    
    verbose=True,
    allow_delegation=False,
    
    system_message="""Você deve:
    1. Consolidar informações de múltiplas fontes
    2. Criar resumo executivo de no máximo 200 palavras
    3. Destacar pontos críticos para tomada de decisão
    4. Organizar informações por prioridade clínica
    5. Usar linguagem médica precisa e objetiva"""
)

# AGENTE 3: DETECTOR DE ALERTAS
agente_alertas = Agent(
    role='Especialista em Detecção de Riscos Pediátricos',
    goal='Identificar valores críticos e situações que demandam atenção imediata',
    backstory="""Sou especialista em medicina de emergência pediátrica e 
    segurança do paciente. Minha função é identificar precocemente sinais 
    de deterioração clínica e situações que requerem intervenção urgente.""",
    
    verbose=True,
    allow_delegation=False,
    tools=[buscar_exames, buscar_prescricao],
    
    system_message="""Você deve:
    1. Identificar valores laboratoriais críticos
    2. Detectar tendências preocupantes nos sinais vitais
    3. Alertar sobre possíveis interações medicamentosas
    4. Sinalizar necessidade de ajustes terapêuticos
    5. Priorizar alertas por urgência (CRÍTICO/ALTO/MÉDIO/BAIXO)"""
)

# =============================================================================
# DEFINIÇÃO DAS TAREFAS
# =============================================================================

# TAREFA 1: ANÁLISE EVOLUTIVA
tarefa_analise_evolutiva = Task(
    description="""Analisar a evolução clínica do paciente ID: {paciente_id} 
    nos últimos 7 dias.
    
    Você deve:
    - Buscar todas as evoluções médicas
    - Buscar resultados de exames recentes
    - Identificar padrões e tendências clínicas
    - Correlacionar intervenções com resultados
    - Destacar mudanças significativas
    
    Forneça uma análise estruturada com:
    1. Resumo da evolução geral
    2. Principais intervenções realizadas
    3. Resposta às intervenções
    4. Tendências preocupantes ou promissoras
    5. Pontos que merecem atenção especial""",
    
    agent=agente_revisor,
    expected_output="Relatório detalhado da evolução clínica com padrões identificados"
)

# TAREFA 2: SÍNTESE EXECUTIVA
tarefa_sintese = Task(
    description="""Com base na análise evolutiva realizada, criar um resumo 
    executivo conciso para o round médico.
    
    O resumo deve incluir:
    - Estado atual do paciente (1-2 frases)
    - Principais mudanças desde a última avaliação
    - Pontos críticos para discussão
    - Recomendações preliminares
    - Próximos passos sugeridos
    
    Máximo 200 palavras, linguagem objetiva e clinicamente precisa.""",
    
    agent=agente_sintetizador,
    expected_output="Resumo executivo de até 200 palavras para round médico",
    context=[tarefa_analise_evolutiva]
)

# TAREFA 3: DETECÇÃO DE ALERTAS
tarefa_alertas = Task(
    description="""Analisar dados atuais do paciente ID: {paciente_id} para 
    detectar situações que requerem atenção imediata.
    
    Você deve:
    - Revisar exames mais recentes
    - Verificar prescrição atual
    - Identificar valores críticos
    - Detectar possíveis interações medicamentosas
    - Avaliar necessidade de ajustes terapêuticos
    
    Para cada alerta identificado, informar:
    1. Tipo de alerta
    2. Prioridade (CRÍTICO/ALTO/MÉDIO/BAIXO)
    3. Justificativa clínica
    4. Ação recomendada
    5. Prazo para ação""",
    
    agent=agente_alertas,
    expected_output="Lista priorizada de alertas com recomendações de ação",
    context=[tarefa_analise_evolutiva]
)

# =============================================================================
# CRIAÇÃO DO SQUAD
# =============================================================================

squad_analise_prontuarios = Crew(
    agents=[agente_revisor, agente_sintetizador, agente_alertas],
    tasks=[tarefa_analise_evolutiva, tarefa_sintese, tarefa_alertas],
    process=Process.sequential,
    verbose=True,
    memory=False
)

# =============================================================================
# FUNÇÃO PRINCIPAL DE EXECUÇÃO
# =============================================================================

def executar_analise_prontuario(paciente_id: str) -> Dict[str, Any]:
    """
    Executa análise completa do prontuário de um paciente
    
    Args:
        paciente_id: ID do paciente no Visual Hospub
    
    Returns:
        Dict com resultados da análise
    """
    
    print(f"🏥 Iniciando análise do prontuário - Paciente: {paciente_id}")
    print("📋 Squad: Revisor → Sintetizador → Detector de Alertas")
    print("=" * 50)
    
    try:
        # Executa o squad
        resultado = squad_analise_prontuarios.kickoff(
            inputs={"paciente_id": paciente_id}
        )
        
        print("✅ Análise concluída com sucesso!")
        
        return {
            "status": "sucesso",
            "paciente_id": paciente_id,
            "timestamp": datetime.now().isoformat(),
            "resultado": resultado,
            "agentes_utilizados": [
                "Revisor de Prontuários",
                "Sintetizador Clínico", 
                "Detector de Alertas"
            ]
        }
        
    except Exception as e:
        print(f"❌ Erro na análise: {str(e)}")
        return {
            "status": "erro",
            "paciente_id": paciente_id,
            "erro": str(e),
            "timestamp": datetime.now().isoformat()
        }

# =============================================================================
# EXEMPLO DE USO
# =============================================================================

if __name__ == "__main__":
    # Exemplo de execução
    paciente_id = "40380"  # ID do paciente no Visual Hospub
    
    resultado = executar_analise_prontuario(paciente_id)
    
    if resultado["status"] == "sucesso":
        print("\n" + "="*50)
        print("📊 RESULTADO DA ANÁLISE")
        print("="*50)
        print(resultado["resultado"])
    else:
        print(f"\n❌ Falha na análise: {resultado['erro']}")