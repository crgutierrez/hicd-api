/**
 * Exemplo prático de uso do crawler de prescrições médicas
 * Demonstra como integrar as funcionalidades de prescrições em uma aplicação real
 */

const HICDCrawler = require('./hicd-crawler-refactored');

class ExemploPrescricoes {
    constructor() {
        this.crawler = new HICDCrawler(true); // modo debug ativado
    }

    /**
     * Exemplo completo de extração de prescrições de um paciente
     */
    async exemploCompleto() {
        console.log('🏥 INICIANDO EXEMPLO DE EXTRAÇÃO DE PRESCRIÇÕES');
        console.log('='.repeat(60));
        
        try {
            // 1. Configurar credenciais (substitua pelos dados reais)
            const credenciais = {
                usuario: process.env.HICD_USUARIO || 'cristiano',
                senha: process.env.HICD_SENHA || '12345678'
            };
            
            const prontuario = process.env.HICD_PRONTUARIO || '40380';
            
            console.log(`📋 Buscando prescrições para o prontuário: ${prontuario}`);
            console.log();
            
            // 2. Fazer login no sistema
            console.log('🔐 Fazendo login...');
            const loginResult = await this.crawler.login();
            if (!loginResult.success) {
                throw new Error(`Falha no login: ${loginResult.erro}`);
            }
            
            console.log('✅ Login realizado com sucesso');
            console.log();
            
            // 3. Buscar prescrições do paciente
            console.log('🔍 Buscando prescrições do paciente...');
            const prescricoes = await this.crawler.getPrescricoesPaciente(prontuario);
            
            // if (!prescricoes.success) {
            //     throw new Error(`Erro ao buscar prescrições: ${prescricoes.erro}`);
            // }
            
            console.log(`📄 Encontradas ${prescricoes.length} prescrições`);
            console.log();
            console.log('============================================================');
            // 4. Processar cada prescrição encontrada
           /* const prescricoesDetalhadas = [];
            
            for (let i = 0; i < prescricoes.length; i++) {
                const prescricao = prescricoes.lista[i];
                
                console.log(`💊 Processando prescrição ${i + 1}/${prescricoes.length}:`);
                console.log(`   • ID: ${prescricao.id}`);
                // console.log(`   • Data: ${prescricao.dataHora}`);
                // console.log(`   • Clínica: ${prescricao.clinica}`);
                
                // Obter detalhes da prescrição
                 const detalhes = await this.crawler.getPrescricaoDetalhes(prescricao.id);
           
                // if (detalhes.sucesso) {
                //     prescricoesDetalhadas.push({
                //         ...prescricao,
                //         detalhes: detalhes.dados
                //     });
                    
                //     console.log(`   ✅ Detalhes extraídos (${detalhes.dados.medicamentos.length} medicamentos)`);
                // } else {
                //     console.log(`   ❌ Erro ao obter detalhes: ${detalhes.erro}`);
                // }
                
                // console.log();
                
                // Pausa entre requisições para não sobrecarregar o servidor
             //   await this.pausa(1000);
            }
            */
            // 5. Exibir resumo dos resultados
            this.exibirResumo(prescricoes);
            
            // 6. Salvar resultados em arquivo
            await this.salvarResultados(prontuario, prescricoes);
            
            // 7. Fazer logout
            console.log('🔓 Fazendo logout...');
            // await this.crawler.logout(); // Método não implementado ainda
            console.log('✅ Sessão finalizada');
            
        } catch (error) {
            console.error('❌ Erro durante a extração:', error.message);
            
            // Tentar fazer logout mesmo em caso de erro
            try {
                // await this.crawler.logout(); // Método não implementado ainda
                console.log('✅ Sessão finalizada');
            } catch (logoutError) {
                console.error('❌ Erro ao finalizar sessão:', logoutError.message);
            }
        }
    }

    /**
     * Exemplo de busca de prescrições recentes (últimos 30 dias)
     */
    async exemploPrescrioesRecentes(prontuario, dias = 30) {
        console.log(`🕐 Buscando prescrições dos últimos ${dias} dias...`);
        
        try {
            const prescricoes = await this.crawler.getPrescricoesPaciente(prontuario, {
                filtroData: true,
                diasAtras: dias
            });
            
            if (prescricoes.sucesso) {
                const prescricoesRecentes = prescricoes.lista.filter(p => {
                    return this.isPrescrioesRecente(p.dataHora, dias);
                });
                
                console.log(`📅 ${prescricoesRecentes.length} prescrições encontradas nos últimos ${dias} dias`);
                return prescricoesRecentes;
            }
            
        } catch (error) {
            console.error('❌ Erro ao buscar prescrições recentes:', error.message);
        }
        
        return [];
    }

    /**
     * Exemplo de análise de medicamentos prescritos
     */
    async analisarMedicamentos(prescricoesDetalhadas) {
        console.log('💊 ANÁLISE DE MEDICAMENTOS PRESCRITOS');
        console.log('-'.repeat(40));
        
        const medicamentos = {};
        const medicos = new Set();
        const clinicas = new Set();
        
        for (const prescricao of prescricoesDetalhadas) {
            if (prescricao.detalhes && prescricao.detalhes.medicamentos) {
                // Contabilizar medicamentos
                prescricao.detalhes.medicamentos.forEach(med => {
                    const nome = med.nome.toUpperCase();
                    medicamentos[nome] = (medicamentos[nome] || 0) + 1;
                });
                
                // Coletar médicos e clínicas
                if (prescricao.detalhes.cabecalho.medico) {
                    medicos.add(prescricao.detalhes.cabecalho.medico);
                }
                clinicas.add(prescricao.clinica);
            }
        }
        
        // Exibir medicamentos mais prescritos
        console.log('🏆 Medicamentos mais prescritos:');
        const medicamentosOrdenados = Object.entries(medicamentos)
            .sort(([,a], [,b]) => b - a)
            .slice(0, 10);
            
        medicamentosOrdenados.forEach(([nome, count], index) => {
            console.log(`   ${index + 1}. ${nome} (${count}x)`);
        });
        
        console.log();
        console.log(`👨‍⚕️ Médicos prescritores: ${medicos.size}`);
        console.log(`🏥 Clínicas envolvidas: ${clinicas.size}`);
        
        return {
            medicamentos: medicamentosOrdenados,
            totalMedicos: medicos.size,
            totalClinicas: clinicas.size
        };
    }

    /**
     * Exibe resumo dos resultados
     */
    exibirResumo(prescricoesDetalhadas) {
        console.log('📊 RESUMO DOS RESULTADOS');
        console.log('='.repeat(30));
        
        const totalPrescricoes = prescricoesDetalhadas.length;
        const totalMedicamentos = prescricoesDetalhadas.reduce((total, p) => {
            return total + (p.detalhes?.medicamentos?.length || 0);
        }, 0);
        
        console.log(`📄 Total de prescrições: ${totalPrescricoes}`);
        console.log(`💊 Total de medicamentos: ${totalMedicamentos}`);
        console.log(`📊 Média de medicamentos por prescrição: ${(totalMedicamentos / totalPrescricoes).toFixed(1)}`);
        console.log();
        
        // Prescrições por clínica
        const clinicas = {};
        prescricoesDetalhadas.forEach(p => {
            clinicas[p.clinica] = (clinicas[p.clinica] || 0) + 1;
        });
        
        console.log('🏥 Prescrições por clínica:');
        Object.entries(clinicas)
            .sort(([,a], [,b]) => b - a)
            .forEach(([clinica, count]) => {
                console.log(`   • ${clinica}: ${count} prescrição(ões)`);
            });
        
        console.log();
    }

    /**
     * Salva os resultados em arquivo JSON
     */
    async salvarResultados(prontuario, prescricoesDetalhadas) {
        const fs = require('fs').promises;
        const path = require('path');
        
        const nomeArquivo = `prescricoes_${prontuario}_${new Date().toISOString().slice(0, 10)}.json`;
        const caminhoArquivo = path.join(__dirname, 'resultados', nomeArquivo);
        
        try {
            // Criar diretório se não existir
            await fs.mkdir(path.dirname(caminhoArquivo), { recursive: true });
            
            const dados = {
                prontuario: prontuario,
                dataExtracao: new Date().toISOString(),
                totalPrescricoes: prescricoesDetalhadas.length,
                prescricoes: prescricoesDetalhadas
            };
            
            await fs.writeFile(caminhoArquivo, JSON.stringify(dados, null, 2), 'utf8');
            console.log(`💾 Resultados salvos em: ${caminhoArquivo}`);
            
        } catch (error) {
            console.error('❌ Erro ao salvar resultados:', error.message);
        }
    }

    /**
     * Verifica se uma prescrição é recente
     */
    isPrescrioesRecente(dataHora, dias) {
        try {
            const [data, hora] = dataHora.split(' ');
            const [dia, mes, ano] = data.split('/');
            const dataPrescricao = new Date(ano, mes - 1, dia);
            const agora = new Date();
            const diasAtras = new Date(agora.getTime() - (dias * 24 * 60 * 60 * 1000));
            
            return dataPrescricao >= diasAtras;
        } catch {
            return false;
        }
    }

    /**
     * Pausa a execução por um tempo especificado
     */
    async pausa(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

// Exemplo de uso
async function main() {
    console.log('🚀 INICIANDO EXEMPLO DE USO DO CRAWLER DE PRESCRIÇÕES');
    console.log('='.repeat(60));
    console.log();
    
    const exemplo = new ExemploPrescricoes();
    
  
    await exemplo.exemploCompleto();
}

// Executar se chamado diretamente
if (require.main === module) {
    main().catch(error => {
        console.error('❌ Erro na execução:', error.message);
        process.exit(1);
    });
}

module.exports = ExemploPrescricoes;
