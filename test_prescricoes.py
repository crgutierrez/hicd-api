#!/usr/bin/env python3
"""
Script de teste para o crawler de prescrições médicas
Demonstra como usar as novas funcionalidades de prescrições do HICDCrawler
"""

import asyncio
import json
from datetime import datetime

# Simular o uso do crawler (adaptação para Python)
class TestePrescricoes:
    def __init__(self):
        self.dados_teste = {
            "usuario": "cristiano",
            "senha": "123456",
            "prontuario": "40380"  # Substitua pelo prontuário do paciente
        }
    
    def simular_resultado_prescricoes(self):
        """Simula o resultado que seria retornado pelo crawler JavaScript"""
        return {
            "sucesso": True,
            "paciente": {
                "prontuario": self.dados_teste["prontuario"],
                "nome": "PACIENTE TESTE"
            },
            "prescricoes": [
                {
                    "id": "789123",
                    "codigo": "PM001",
                    "dataHora": "15/12/2024 14:30",
                    "pacienteNome": "PACIENTE TESTE",
                    "registro": "REG001",
                    "internacao": "INT001",
                    "enfLeito": "ENF-LEITO-01",
                    "clinica": "CLÍNICA MÉDICA",
                    "prontuario": self.dados_teste["prontuario"]
                },
                {
                    "id": "789124",
                    "codigo": "PM002",
                    "dataHora": "14/12/2024 08:15",
                    "pacienteNome": "PACIENTE TESTE",
                    "registro": "REG001",
                    "internacao": "INT001",
                    "enfLeito": "ENF-LEITO-01",
                    "clinica": "CARDIOLOGIA",
                    "prontuario": self.dados_teste["prontuario"]
                }
            ]
        }
    
    def simular_detalhes_prescricao(self, id_prescricao):
        """Simula os detalhes de uma prescrição específica"""
        return {
            "id": id_prescricao,
            "cabecalho": {
                "pacienteNome": "PACIENTE TESTE",
                "prontuario": self.dados_teste["prontuario"],
                "leito": "ENF-LEITO-01",
                "dataPrescricao": "15/12/2024",
                "medico": "Dr. João Silva - CRM 12345"
            },
            "medicamentos": [
                {
                    "nome": "DIPIRONA 500MG",
                    "posologia": "1 comprimido de 6/6h",
                    "observacao": "Se dor ou febre"
                },
                {
                    "nome": "OMEPRAZOL 20MG",
                    "posologia": "1 cápsula em jejum",
                    "observacao": "30 minutos antes do café"
                },
                {
                    "nome": "LOSARTANA 50MG",
                    "posologia": "1 comprimido pela manhã",
                    "observacao": "Controle da pressão arterial"
                }
            ],
            "observacoes": [
                "Paciente com histórico de hipertensão",
                "Monitorar pressão arterial diariamente",
                "Atenção para sinais de hipotensão"
            ],
            "assinaturas": [
                "Dr. João Silva",
                "CRM 12345 - RO"
            ],
            "dataHoraImpressao": "15/12/2024 14:35"
        }
    
    def exibir_resultados(self):
        """Exibe os resultados simulados de forma organizada"""
        print("=" * 80)
        print("🏥 TESTE DO CRAWLER DE PRESCRIÇÕES MÉDICAS - HICD")
        print("=" * 80)
        print()
        
        # Dados de entrada
        print("📋 DADOS DE ENTRADA:")
        print(f"   • Usuário: {self.dados_teste['usuario']}")
        print(f"   • Prontuário: {self.dados_teste['prontuario']}")
        print()
        
        # Resultado da busca de prescrições
        resultado_prescricoes = self.simular_resultado_prescricoes()
        
        print("📄 PRESCRIÇÕES ENCONTRADAS:")
        print(f"   • Total: {len(resultado_prescricoes['prescricoes'])} prescrições")
        print(f"   • Paciente: {resultado_prescricoes['paciente']['nome']}")
        print()
        
        for i, prescricao in enumerate(resultado_prescricoes['prescricoes'], 1):
            print(f"   {i}. Prescrição ID: {prescricao['id']}")
            print(f"      ├─ Código: {prescricao['codigo']}")
            print(f"      ├─ Data/Hora: {prescricao['dataHora']}")
            print(f"      ├─ Clínica: {prescricao['clinica']}")
            print(f"      └─ Leito: {prescricao['enfLeito']}")
            print()
        
        # Detalhes de uma prescrição específica
        if resultado_prescricoes['prescricoes']:
            primeira_prescricao = resultado_prescricoes['prescricoes'][0]
            detalhes = self.simular_detalhes_prescricao(primeira_prescricao['id'])
            
            print("💊 DETALHES DA PRIMEIRA PRESCRIÇÃO:")
            print(f"   • ID: {detalhes['id']}")
            print(f"   • Médico: {detalhes['cabecalho']['medico']}")
            print(f"   • Data: {detalhes['cabecalho']['dataPrescricao']}")
            print(f"   • Leito: {detalhes['cabecalho']['leito']}")
            print()
            
            print("   📋 MEDICAMENTOS PRESCRITOS:")
            for j, med in enumerate(detalhes['medicamentos'], 1):
                print(f"      {j}. {med['nome']}")
                print(f"         ├─ Posologia: {med['posologia']}")
                print(f"         └─ Observação: {med['observacao']}")
                print()
            
            print("   ⚠️  OBSERVAÇÕES MÉDICAS:")
            for k, obs in enumerate(detalhes['observacoes'], 1):
                print(f"      {k}. {obs}")
            print()
            
            print("   ✍️  ASSINATURAS:")
            for l, assinatura in enumerate(detalhes['assinaturas'], 1):
                print(f"      {l}. {assinatura}")
            print()
            
            print(f"   🕐 Impressa em: {detalhes['dataHoraImpressao']}")
        
        print()
        print("=" * 80)
        print("✅ TESTE CONCLUÍDO COM SUCESSO!")
        print("=" * 80)
        print()
        
        # Instruções para uso real
        print("📝 COMO USAR NO CÓDIGO REAL:")
        print()
        print("// 1. Instanciar o crawler")
        print("const crawler = new HICDCrawler();")
        print()
        print("// 2. Fazer login")
        print("await crawler.fazerLogin('usuario', 'senha');")
        print()
        print("// 3. Buscar prescrições do paciente")
        print("const prescricoes = await crawler.getPrescricoesPaciente('123456');")
        print()
        print("// 4. Obter detalhes de uma prescrição específica")
        print("const detalhes = await crawler.getPrescricaoDetalhes('789123');")
        print()
        print("// 5. Fazer logout")
        print("await crawler.fazerLogout();")
        print()
        
        # URLs utilizadas
        print("🔗 URLS DO FLUXO DE PRESCRIÇÕES:")
        print("   1. Módulo de prescrições:")
        print("      https://hicd-hospub.sesau.ro.gov.br/prontuario/frontend/controller/controller.php")
        print("      Param=RUNPLUGIN%PM&ParamModule=2751")
        print()
        print("   2. Interface de consulta:")
        print("      https://hicd-hospub.sesau.ro.gov.br/prescricao_medica3/interface/consulta.php")
        print()
        print("   3. Lista de prescrições:")
        print("      https://hicd-hospub.sesau.ro.gov.br/prescricao_medica3/scripts/todas_prescricoes.php")
        print("      reg_int=X&leito=Y&data_ini=Z&data_fim=W")
        print()
        print("   4. Detalhes da prescrição:")
        print("      https://hicd-hospub.sesau.ro.gov.br/prescricao_medica3/interface/imprime.php")
        print("      id_prescricao=ID")
        print()

def main():
    """Função principal do teste"""
    print(f"🚀 Iniciando teste em {datetime.now().strftime('%d/%m/%Y %H:%M:%S')}")
    
    teste = TestePrescricoes()
    teste.exibir_resultados()
    
    print("💡 DICAS:")
    print("   • Substitua 'seu_usuario' e 'sua_senha' pelos dados reais")
    print("   • Use um prontuário válido do sistema HICD")
    print("   • Verifique se tem permissão para acessar prescrições médicas")
    print("   • O crawler manterá a sessão ativa durante as consultas")
    print()

if __name__ == "__main__":
    main()
