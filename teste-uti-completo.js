#!/usr/bin/env node

const HICDCrawler = require('./hicd-crawler-refactored');
const fs = require('fs').promises;
const path = require('path');

async function testarEnfermariaUTICompleta() {
    const crawler = new HICDCrawler();
    crawler.setDebugMode(true);

    try {
        console.log('Iniciando login...');
        const loginResult = await crawler.login();
        if (!loginResult.success) {
            console.error('Falha no login:', loginResult.message);
            return;
        }
        console.log('Login bem-sucedido.');

        const enfermariaNome = 'UTI';
        let codigoEnfermaria = null;

        console.log('Buscando clínicas disponíveis...');
        const clinicas = await crawler.getClinicas();
        
        for (const clinica of clinicas) {
            if (clinica.nome.replace(/\s/g, '').toUpperCase().includes(enfermariaNome.replace(/\s/g, '').toUpperCase())) {
                codigoEnfermaria = clinica.codigo;
                console.log(`Encontrado código para ${enfermariaNome}: ${codigoEnfermaria}`);
                break;
            }
        }

        if (!codigoEnfermaria) {
            console.error(`❌ Enfermaria '${enfermariaNome}' não encontrada.`);
            return;
        }

        console.log(`Buscando pacientes da enfermaria ${enfermariaNome} (${codigoEnfermaria})...`);
        const pacientes = await crawler.getPacientesClinica(codigoEnfermaria);
        console.log(`Encontrados ${pacientes.length} pacientes na ${enfermariaNome}.`);

        if (pacientes.length === 0) {
            console.log('❌ Nenhum paciente encontrado na enfermaria.');
            return;
        }

        const pacientesCompletos = [];
        const maxPacientes = Math.min(3, pacientes.length);

        for (let i = 0; i < maxPacientes; i++) {
            const paciente = pacientes[i];
            console.log(`\n[${i + 1}/${maxPacientes}] Processando paciente: ${paciente.nome} (${paciente.prontuario})`);
            
            try {
                console.log('Buscando evoluções...');
                const evolucoesPaciente = await crawler.getEvolucoes(paciente.prontuario);
                
                console.log('Aguardando antes da próxima requisição...');
                await crawler.httpClient.delay(2000);

                console.log('Buscando exames...');
                const examesPaciente = await crawler.evolutionService.getExames(paciente.prontuario);
                
                console.log(`✅ Encontradas ${evolucoesPaciente ? evolucoesPaciente.length : 0} evoluções`);
                console.log(`✅ Encontradas ${examesPaciente ? examesPaciente.length : 0} requisições de exames`);
                
                // Calcular total de exames individuais
                const totalExamesIndividuais = examesPaciente ? 
                    examesPaciente.reduce((total, req) => total + req.exames.length, 0) : 0;
                
                console.log(`🔬 Total de exames individuais: ${totalExamesIndividuais}`);
                
                pacientesCompletos.push({
                    prontuario: paciente.prontuario,
                    nome: paciente.nome,
                    leito: paciente.leito,
                    dataInternacao: paciente.dataInternacao,
                    diasInternacao: paciente.diasInternacao,
                    evolucoes: evolucoesPaciente || [],
                    exames: examesPaciente || [],
                    resumo: {
                        totalEvolucoes: evolucoesPaciente ? evolucoesPaciente.length : 0,
                        totalRequisicoesExames: examesPaciente ? examesPaciente.length : 0,
                        totalExamesIndividuais: totalExamesIndividuais
                    }
                });
                
            } catch (error) {
                console.error(`❌ Erro ao processar ${paciente.nome}:`, error.message);
                
                pacientesCompletos.push({
                    prontuario: paciente.prontuario,
                    nome: paciente.nome,
                    leito: paciente.leito,
                    dataInternacao: paciente.dataInternacao,
                    evolucoes: [],
                    exames: [],
                    erro: error.message
                });
            }
        }

        // Calcular estatísticas gerais
        const totalEvolucoes = pacientesCompletos.reduce((sum, p) => sum + (p.evolucoes?.length || 0), 0);
        const totalRequisicoes = pacientesCompletos.reduce((sum, p) => sum + (p.exames?.length || 0), 0);
        const totalExamesIndividuais = pacientesCompletos.reduce((sum, p) => 
            sum + (p.exames?.reduce((total, req) => total + req.exames.length, 0) || 0), 0);

        // Salvar resultados
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const outputDir = './output';
        const filename = path.join(outputDir, `dados-completos-${enfermariaNome}-${timestamp}.json`);

        try {
            await fs.mkdir(outputDir, { recursive: true });
        } catch (error) {
            console.error('Erro ao criar diretório output:', error.message);
        }

        const resultadoCompleto = {
            enfermaria: enfermariaNome,
            codigoEnfermaria: codigoEnfermaria,
            dataColeta: new Date().toISOString(),
            totalPacientesEncontrados: pacientes.length,
            pacientesProcessados: maxPacientes,
            estatisticas: {
                totalEvolucoes: totalEvolucoes,
                totalRequisicoesExames: totalRequisicoes,
                totalExamesIndividuais: totalExamesIndividuais,
                pacientesComSucesso: pacientesCompletos.filter(p => !p.erro).length,
                pacientesComErro: pacientesCompletos.filter(p => p.erro).length
            },
            pacientes: pacientesCompletos
        };

        try {
            await fs.writeFile(filename, JSON.stringify(resultadoCompleto, null, 2));
            console.log(`\n📊 RESUMO DO TESTE COMPLETO:`);
            console.log(`==================================================`);
            console.log(`🏥 Enfermaria: ${enfermariaNome}`);
            console.log(`👥 Total de pacientes encontrados: ${pacientes.length}`);
            console.log(`🧪 Pacientes testados: ${maxPacientes}`);
            console.log(`✅ Pacientes processados com sucesso: ${resultadoCompleto.estatisticas.pacientesComSucesso}`);
            console.log(`❌ Pacientes com erro: ${resultadoCompleto.estatisticas.pacientesComErro}`);
            console.log(`📄 Total de evoluções coletadas: ${totalEvolucoes}`);
            console.log(`🧪 Total de requisições de exames: ${totalRequisicoes}`);
            console.log(`🔬 Total de exames individuais: ${totalExamesIndividuais}`);
            console.log(`💾 Arquivo salvo: ${filename}`);
            console.log(`\n✅ Teste da enfermaria ${enfermariaNome} concluído!`);
        } catch (error) {
            console.error('❌ Erro ao salvar arquivo:', error.message);
        }

    } catch (error) {
        console.error('❌ Erro geral:', error.message);
        if (crawler.debugMode) {
            console.error(error.stack);
        }
    } finally {
        console.log('Finalizando o crawler...');
        await crawler.logout();
        console.log('Logout realizado.');
    }
}

testarEnfermariaUTICompleta().catch(console.error);
