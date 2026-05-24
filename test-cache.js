#!/usr/bin/env node

/**
 * Script de teste para verificar o funcionamento do sistema de cache
 */

const cache = require('./api/utils/cache');

console.log('🧪 TESTE DO SISTEMA DE CACHE');
console.log('================================\n');

async function testarCache() {
    // Teste 1: Armazenar e recuperar dados
    console.log('📦 Teste 1: Armazenar e recuperar dados');
    const dadosTeste = {
        nome: 'João Silva',
        prontuario: '12345',
        data: new Date().toISOString()
    };
    
    const chave1 = cache.generateKey('teste', '12345');
    cache.set(chave1, dadosTeste, 5000); // 5 segundos
    
    const resultado1 = cache.get(chave1);
    console.log('✅ Dados armazenados e recuperados:', resultado1 ? 'SUCESSO' : 'FALHA');
    
    // Teste 2: Cache miss
    console.log('\n❌ Teste 2: Cache miss');
    const resultado2 = cache.get('chave_inexistente');
    console.log('✅ Cache miss funcional:', resultado2 === null ? 'SUCESSO' : 'FALHA');
    
    // Teste 3: Múltiplas chaves
    console.log('\n📊 Teste 3: Múltiplas chaves');
    cache.set('exames:40380', { tipo: 'exames', count: 10 });
    cache.set('evolucoes:40380', { tipo: 'evolucoes', count: 5 });
    cache.set('prescricoes:40380', { tipo: 'prescricoes', count: 3 });
    cache.set('exames:40381', { tipo: 'exames', count: 8 });
    
    console.log('✅ Múltiplas chaves armazenadas');
    
    // Teste 4: Estatísticas
    console.log('\n📈 Teste 4: Estatísticas do cache');
    const stats = cache.getStats();
    console.log('📊 Estatísticas:', JSON.stringify(stats, null, 2));
    
    // Teste 5: Invalidação por paciente
    console.log('\n🔄 Teste 5: Invalidação por paciente');
    const invalidados = cache.invalidatePatient('40380');
    console.log(`✅ Itens invalidados para paciente 40380: ${invalidados}`);
    
    // Teste 6: Invalidação por tipo
    console.log('\n🔄 Teste 6: Invalidação por tipo');
    const invalidadosTipo = cache.invalidateType('exames');
    console.log(`✅ Itens invalidados para tipo "exames": ${invalidadosTipo}`);
    
    // Teste 7: getOrSet
    console.log('\n🔄 Teste 7: getOrSet wrapper');
    const dadosWrapper = await cache.getOrSet('teste_wrapper', async () => {
        console.log('   🔄 Função executada (primeira vez)');
        return { executedAt: Date.now(), data: 'teste wrapper' };
    });
    
    const dadosWrapper2 = await cache.getOrSet('teste_wrapper', async () => {
        console.log('   🔄 Função executada (segunda vez - não deveria executar)');
        return { executedAt: Date.now(), data: 'teste wrapper 2' };
    });
    
    console.log('✅ getOrSet funcional:', dadosWrapper.executedAt === dadosWrapper2.executedAt ? 'SUCESSO' : 'FALHA');
    
    // Teste 8: Expiração
    console.log('\n⏰ Teste 8: Teste de expiração (aguarde 6 segundos...)');
    await new Promise(resolve => setTimeout(resolve, 6000));
    
    const resultadoExpirado = cache.get(chave1);
    console.log('✅ Expiração funcional:', resultadoExpirado === null ? 'SUCESSO' : 'FALHA');
    
    // Estatísticas finais
    console.log('\n📈 Estatísticas finais:');
    const statsFinal = cache.getStats();
    console.log('📊 Estado final:', JSON.stringify(statsFinal, null, 2));
    
    console.log('\n🎉 TESTE CONCLUÍDO!');
    console.log('================================\n');
}

// Executar teste
testarCache().catch(console.error);
