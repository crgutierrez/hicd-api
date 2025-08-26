// Teste de navegação - Console
console.log('=== TESTE DE NAVEGAÇÃO ===');

// Verificar se jQuery está carregado
console.log('jQuery carregado:', typeof $ !== 'undefined');

// Verificar se a aplicação foi inicializada
console.log('HICDApp disponível:', typeof window.hicdApp !== 'undefined');

// Testar clique no menu clínicas
function testClickClinicas() {
    console.log('--- Testando clique no menu Clínicas ---');
    
    // Verificar se o elemento existe
    const clinicasLink = $('#nav-clinicas');
    console.log('Elemento nav-clinicas encontrado:', clinicasLink.length > 0);
    
    if (clinicasLink.length > 0) {
        console.log('data-section:', clinicasLink.data('section'));
        console.log('href:', clinicasLink.attr('href'));
        
        // Simular clique
        console.log('Simulando clique...');
        clinicasLink.trigger('click');
        
        // Verificar se a seção foi ativada
        setTimeout(() => {
            const clinicasSection = $('#clinicas');
            console.log('Seção clínicas ativa:', clinicasSection.hasClass('active'));
            console.log('Classes da seção:', clinicasSection.attr('class'));
        }, 100);
    }
}

// Executar teste após carregamento
$(document).ready(() => {
    setTimeout(testClickClinicas, 2000);
});

// Função para executar manualmente
window.testNavigation = testClickClinicas;

console.log('Script de teste carregado. Execute testNavigation() para testar.');
