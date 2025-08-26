// Teste rápido do menu de clínicas no console do navegador

console.log('🔧 Iniciando teste do menu de clínicas...');

// Verificar se a aplicação está carregada
if (typeof window.hicdApp !== 'undefined') {
    console.log('✅ HICDApp carregado');
    
    // Testar carregamento de clínicas
    console.log('🏥 Testando carregamento de clínicas...');
    window.hicdApp.loadClinicas().then(() => {
        console.log('✅ Clínicas carregadas com sucesso');
        
        // Verificar se o grid foi populado
        const grid = document.getElementById('clinicasGrid');
        if (grid && grid.children.length > 0) {
            console.log(`✅ Grid populado com ${grid.children.length} elementos`);
        } else {
            console.log('❌ Grid não foi populado');
        }
        
    }).catch(error => {
        console.error('❌ Erro ao carregar clínicas:', error);
    });
    
    // Testar navegação para clínicas
    console.log('🧭 Testando navegação para seção clínicas...');
    window.hicdApp.showSection('clinicas');
    
    // Verificar se a seção está ativa
    setTimeout(() => {
        const section = document.getElementById('clinicas');
        if (section && section.classList.contains('active')) {
            console.log('✅ Seção clínicas ativada');
        } else {
            console.log('❌ Seção clínicas não foi ativada');
        }
    }, 1000);
    
} else {
    console.log('❌ HICDApp não carregado');
    console.log('Verificando dependências...');
    
    if (typeof $ === 'undefined') {
        console.log('❌ jQuery não carregado');
    } else {
        console.log('✅ jQuery carregado');
    }
    
    if (typeof bootstrap === 'undefined') {
        console.log('❌ Bootstrap não carregado');
    } else {
        console.log('✅ Bootstrap carregado');
    }
}

// Função para testar manualmente
window.testClinicasMenu = function() {
    console.log('🚀 Teste manual do menu de clínicas');
    
    // Simular clique no menu
    const menuItem = document.querySelector('[data-section="clinicas"]');
    if (menuItem) {
        console.log('📱 Simulando clique no menu clínicas...');
        menuItem.click();
    } else {
        console.log('❌ Item de menu clínicas não encontrado');
    }
    
    // Verificar elementos do DOM
    console.log('🔍 Verificando elementos do DOM...');
    console.log('- clinicasGrid:', document.getElementById('clinicasGrid') ? '✅' : '❌');
    console.log('- clinicaSearchInput:', document.getElementById('clinicaSearchInput') ? '✅' : '❌');
    console.log('- refreshClinicas:', document.getElementById('refreshClinicas') ? '✅' : '❌');
    
    return 'Teste concluído - verifique os logs acima';
};

console.log('💡 Digite testClinicasMenu() para executar teste manual');
console.log('🔧 Teste automático concluído - verifique os logs acima');
