#!/usr/bin/env python3
"""
Script de teste para validar o formato do BuscarExamesTool
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

try:
    from main import BuscarExamesTool
    import json
    
    print("🧪 Testando BuscarExamesTool...")
    
    # Configurações da API
    base_url = "http://localhost:3000/api"
    api_key = "fake_token"  # Para teste local
    
    # Instanciar a ferramenta
    tool = BuscarExamesTool(base_url=base_url, api_key=api_key)
    
    # Testar com paciente de exemplo
    paciente_id = "40380"
    print(f"📋 Buscando exames do paciente {paciente_id}...")
    
    # Executar a ferramenta
    resultado = tool._run(paciente_id)
    
    print("📊 Resultado da ferramenta:")
    print(resultado)
    
    # Tentar parsear como JSON para validar formato
    try:
        data = json.loads(resultado)
        print("\n✅ JSON válido!")
        print(f"📈 Success: {data.get('success')}")
        print(f"🏥 Prontuário: {data.get('prontuario')}")
        print(f"📋 Total de exames: {len(data.get('data', []))}")
        
        if data.get('data'):
            primeiro_exame = data['data'][0]
            print(f"🔬 Primeiro exame - Requisição: {primeiro_exame.get('requisicaoId')}")
            print(f"📅 Data: {primeiro_exame.get('data')} às {primeiro_exame.get('hora')}")
            print(f"👨‍⚕️ Médico: {primeiro_exame.get('medico')}")
            print(f"🏥 Clínica: {primeiro_exame.get('clinica')}")
            print(f"📊 Status: {primeiro_exame.get('status')}")
            print(f"📋 Resumo: {primeiro_exame.get('resumo')}")
            
    except json.JSONDecodeError as e:
        print(f"❌ Erro ao parsear JSON: {e}")
        
except Exception as e:
    print(f"❌ Erro no teste: {e}")
    import traceback
    traceback.print_exc()
