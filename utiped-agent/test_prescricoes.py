#!/usr/bin/env python3
"""
Script de teste para validar o formato do BuscarPrescricaoTool
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

try:
    from main import BuscarPrescricaoTool
    import json
    
    print("🧪 Testando BuscarPrescricaoTool...")
    
    # Configurações da API
    base_url = "http://localhost:3000/api"
    api_key = "fake_token"  # Para teste local
    
    # Instanciar a ferramenta
    tool = BuscarPrescricaoTool(base_url=base_url, api_key=api_key)
    
    # Testar com paciente de exemplo
    paciente_id = "40380"
    print(f"💊 Buscando prescrições do paciente {paciente_id}...")
    
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
        print(f"💊 Total de prescrições: {len(data.get('data', []))}")
        
        if data.get('data'):
            primeira_prescricao = data['data'][0]
            print(f"📋 Primeira prescrição - ID: {primeira_prescricao.get('id')}")
            print(f"📅 Data/Hora: {primeira_prescricao.get('dataHora')}")
            print(f"👤 Paciente: {primeira_prescricao.get('pacienteNome')}")
            print(f"🏥 Clínica: {primeira_prescricao.get('clinica')}")
            print(f"🛏️ Leito: {primeira_prescricao.get('enfLeito')}")
            
            detalhes = primeira_prescricao.get('detalhes', {})
            medicamentos = detalhes.get('medicamentos', [])
            print(f"💊 Total de medicamentos: {len(medicamentos)}")
            
            if medicamentos:
                primeiro_med = medicamentos[0]
                print(f"🔸 Primeiro medicamento: {primeiro_med.get('nome')}")
                print(f"  💉 Dose: {primeiro_med.get('dose')}")
                print(f"  🩺 Via: {primeiro_med.get('via')}")
                print(f"  ⏰ Intervalo: {primeiro_med.get('intervalo')}")
                
    except json.JSONDecodeError as e:
        print(f"❌ Erro ao parsear JSON: {e}")
        
except Exception as e:
    print(f"❌ Erro no teste: {e}")
    import traceback
    traceback.print_exc()
