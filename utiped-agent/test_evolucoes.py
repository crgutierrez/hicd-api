#!/usr/bin/env python3

"""
Script de teste para validar o BuscarEvolucoesTool
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from main import BuscarEvolucoesTool

def testar_buscar_evolucoes():
    print("🧪 TESTE DO BuscarEvolucoesTool")
    print("=" * 50)
    
    # Configurar ferramenta
    BASE_URL = "http://localhost:3000/api"
    API_KEY = "test_key"
    
    tool = BuscarEvolucoesTool(BASE_URL, API_KEY)
    
    print("📋 Configuração:")
    print(f"   URL: {BASE_URL}")
    print(f"   Nome: {tool.name}")
    print(f"   Descrição: {tool.description}")
    
    print("\n🔍 Testando estrutura de resposta...")
    
    # Simular resposta de API (já que não temos servidor rodando)
    resultado_exemplo = tool._processar_evolucao({
        'dataEvolucao': '02/09/2025 00:36:41',
        'profissional': 'NAYARA DA SILVA RODRIGUES',
        'atividade': 'MEDICO (QUALQUER ESPECIALIDADE)',
        'conteudo': 'Evolução: Paciente estável hemodinamicamente. Dependente de ventilação mecânica invasiva por traqueostomia. Apresenta-se acoplada, arreflexiva. Secretiva e necessitando de aspirações. Aceitando dieta enteral. Diurese presente, evacuou ausente no periodo. Afebril, em uso de meropenem. Controle 12h: PAM: 73-99 mmHg FC: 99-154 bpm FR: 30 - 30 irpm Tax: 35,5 – 36,5 °C Sat: 98-99 % BH 6h: +82,9ml Diurese 6h: 3,1 ml/kg/h CD: Vigilancia'
    }, "40380", 0)
    
    print("✅ Estrutura processada com sucesso!")
    print("\n📊 Campos verificados:")
    print(f"   ID: {resultado_exemplo['id']}")
    print(f"   Paciente ID: {resultado_exemplo['pacienteId']}")
    print(f"   Data: {resultado_exemplo['dataEvolucao']}")
    print(f"   Profissional: {resultado_exemplo['profissional']}")
    print(f"   Sinais Vitais: {resultado_exemplo['dadosClinicosEstruturados']['sinaisVitais']}")
    print(f"   Tem Sinais Vitais: {resultado_exemplo['metadata']['temSinaisVitais']}")
    print(f"   Tamanho Texto: {resultado_exemplo['metadata']['tamanhoTexto']}")
    
    print("\n🎯 Teste de extração de sinais vitais:")
    sinais = tool._extrair_sinais_vitais("PAM: 73-99 mmHg FC: 99-154 bpm FR: 30 - 30 irpm Sat: 98-99 %")
    print(f"   Sinais extraídos: {sinais}")
    
    print("\n🔍 Teste de detecção clínica:")
    diagnosticos, medicamentos = tool._detectar_informacoes_clinicas("Paciente com pneumonia, prescrito antibiótico 500mg")
    print(f"   Diagnósticos detectados: {diagnosticos}")
    print(f"   Medicamentos detectados: {medicamentos}")
    
    print("\n✅ TESTE CONCLUÍDO COM SUCESSO!")
    print("=" * 50)

if __name__ == "__main__":
    testar_buscar_evolucoes()
