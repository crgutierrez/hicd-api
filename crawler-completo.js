#!/usr/bin/env node

/**
 * Script para execução completa do HICD Crawler
 * 
 * Este script executa o crawler de forma otimizada,
 * extraindo dados de todas as clínicas disponíveis.
 */

const HICDCrawler = require('./hicd-crawler');
const fs = require('fs').promises;
const path = require('path');

async function main() {
    console.log('🏥 HICD Crawler - Extração Completa');
    console.log('===================================');
    console.log(`⏰ Iniciado em: ${new Date().toLocaleString('pt-BR')}\n`);
    
    const crawler = new HICDCrawler();
    const startTime = Date.now();
    
    try {
        // 1. Login
        console.log('🔐 Realizando login...');
        await crawler.login();
        const loginTime = Date.now() - startTime;
        console.log(`✅ Login concluído em ${Math.round(loginTime/1000)}s\n`);
        
        // 2. Buscar clínicas
        console.log('🏥 Buscando clínicas disponíveis...');
        const clinicas = await crawler.getClinicas();
        console.log(`✅ ${clinicas.length} clínicas encontradas\n`);
        
        // Filtrar clínicas (excluir "Todas" que é redundante)
        const clinicasFiltered = clinicas.filter(c => c.codigo !== '0');
        console.log(`📋 ${clinicasFiltered.length} clínicas serão processadas\n`);
        
        // 3. Processar cada clínica
        const todosPacientes = [];
        const estatisticas = {
            clinicasComPacientes: 0,
            clinicasVazias: 0,
            totalPacientes: 0,
            tempoTotal: 0,
            detalhePorClinica: {}
        };
        
        for (let i = 0; i < clinicasFiltered.length; i++) {
            const clinica = clinicasFiltered[i];
            const progresso = `(${i + 1}/${clinicasFiltered.length})`;
            
            console.log(`🏥 ${progresso} Processando: ${clinica.nome}`);
            
            try {
                const inicioClinica = Date.now();
                const pacientes = await crawler.getPacientesClinica(clinica.codigo);
                const tempoClinica = Date.now() - inicioClinica;
                
                if (pacientes.length > 0) {
                    console.log(`   ✅ ${pacientes.length} pacientes encontrados`);
                    estatisticas.clinicasComPacientes++;
                    
                    // Adicionar dados da clínica
                    pacientes.forEach(paciente => {
                        todosPacientes.push({
                            ...paciente,
                            clinicaNome: clinica.nome,
                            clinicaCodigo: clinica.codigo,
                            timestamp: new Date().toISOString(),
                            url: crawler.indexUrl
                        });
                    });
                } else {
                    console.log('   ℹ️ Nenhum paciente encontrado');
                    estatisticas.clinicasVazias++;
                }
                
                // Estatísticas por clínica
                estatisticas.detalhePorClinica[clinica.nome] = {
                    pacientes: pacientes.length,
                    tempo: Math.round(tempoClinica / 1000)
                };
                estatisticas.totalPacientes += pacientes.length;
                
                // Rate limiting entre clínicas
                if (i < clinicasFiltered.length - 1) {
                    await crawler.delay();
                }
                
            } catch (error) {
                console.log(`   ❌ Erro: ${error.message}`);
                estatisticas.detalhePorClinica[clinica.nome] = {
                    pacientes: 0,
                    erro: error.message
                };
            }
        }
        
        const tempoTotal = Date.now() - startTime;
        estatisticas.tempoTotal = Math.round(tempoTotal / 1000);
        
        // 4. Salvar dados
        console.log('\n💾 Salvando dados extraídos...');
        
        if (todosPacientes.length > 0) {
            await crawler.saveData(todosPacientes, 'json');
            await crawler.saveData(todosPacientes, 'csv');
            
            // Salvar relatório detalhado
            const relatorio = {
                executado: new Date().toISOString(),
                resumo: {
                    totalPacientes: todosPacientes.length,
                    totalClinicas: clinicasFiltered.length,
                    clinicasComPacientes: estatisticas.clinicasComPacientes,
                    clinicasVazias: estatisticas.clinicasVazias,
                    tempoTotalSegundos: estatisticas.tempoTotal,
                    pacientesPorMinuto: Math.round((todosPacientes.length / estatisticas.tempoTotal) * 60)
                },
                detalhePorClinica: estatisticas.detalhePorClinica,
                configuracao: {
                    usuario: crawler.username,
                    delay: crawler.requestDelay,
                    maxRetries: crawler.maxRetries
                }
            };
            
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const relatorioPath = path.join('./output', `relatorio-completo-${timestamp}.json`);
            await fs.writeFile(relatorioPath, JSON.stringify(relatorio, null, 2), 'utf8');
            
            console.log('✅ Dados salvos com sucesso!\n');
        } else {
            console.log('⚠️ Nenhum dado foi extraído\n');
        }
        
        // 5. Relatório final
        console.log('📊 RELATÓRIO FINAL');
        console.log('==================');
        console.log(`⏰ Tempo total: ${Math.floor(estatisticas.tempoTotal / 60)}m ${estatisticas.tempoTotal % 60}s`);
        console.log(`🏥 Clínicas processadas: ${clinicasFiltered.length}`);
        console.log(`👥 Total de pacientes: ${todosPacientes.length}`);
        console.log(`📈 Pacientes por minuto: ${Math.round((todosPacientes.length / estatisticas.tempoTotal) * 60)}`);
        console.log(`✅ Clínicas com pacientes: ${estatisticas.clinicasComPacientes}`);
        console.log(`❌ Clínicas vazias: ${estatisticas.clinicasVazias}\n`);
        
        // Top 5 clínicas com mais pacientes
        const top5 = Object.entries(estatisticas.detalhePorClinica)
            .filter(([_, dados]) => dados.pacientes > 0)
            .sort(([_, a], [__, b]) => b.pacientes - a.pacientes)
            .slice(0, 5);
        
        if (top5.length > 0) {
            console.log('🏆 TOP 5 Clínicas com mais pacientes:');
            top5.forEach(([clinica, dados], index) => {
                console.log(`${index + 1}. ${clinica}: ${dados.pacientes} pacientes`);
            });
        }
        
        console.log('\n🎉 Extração completa finalizada com sucesso!');
        
    } catch (error) {
        console.error('\n❌ Erro durante a execução:');
        console.error(error.message);
        
        if (process.env.DEBUG_MODE === 'true') {
            console.error('\nStack trace completo:');
            console.error(error.stack);
        }
        
        process.exit(1);
        
    } finally {
        await crawler.logout();
        console.log('\n🔚 Crawler finalizado');
    }
}

// Verificar argumentos da linha de comando
const args = process.argv.slice(2);

if (args.includes('--help') || args.includes('-h')) {
    console.log(`
🏥 HICD Crawler - Extração Completa

Uso: node crawler-completo.js [opções]

Opções:
  --help, -h     Mostrar esta mensagem

Variáveis de ambiente:
  DEBUG_MODE=true         Ativar logs de debug
  REQUEST_DELAY=2000      Delay entre requisições (ms)
  MAX_RETRIES=5           Máximo de tentativas

Exemplos:
  node crawler-completo.js
  DEBUG_MODE=true node crawler-completo.js
  REQUEST_DELAY=2000 node crawler-completo.js
`);
    process.exit(0);
}

// Executar crawler
main().catch(console.error);
