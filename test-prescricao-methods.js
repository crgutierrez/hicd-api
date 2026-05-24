// Teste rápido para verificar se os métodos de prescrição estão funcionando no HICDParser

const HICDParser = require('./src/parsers/hicd-parser');

console.log('🧪 Testando métodos de prescrição no HICDParser...\n');

const parser = new HICDParser();

// HTML de teste simples
const htmlTeste = '<html><body><table class="linhas_impressao_med"><tr><td>teste</td></tr></table></body></html>';

console.log('1. Testando se o método parsePrescricoes existe...');
try {
    const resultado = parser.parsePrescricoes(htmlTeste, '123456');
    console.log('✅ Método parsePrescricoes existe e funciona');
    console.log(`   Resultado: ${Array.isArray(resultado) ? 'Array' : typeof resultado} com ${resultado.length || 0} itens`);
} catch (error) {
    console.log('❌ Erro no método parsePrescricoes:', error.message);
}

console.log('\n2. Testando se o método parsePrescricaoDetalhes existe...');
try {
    const resultado = parser.parsePrescricaoDetalhes(htmlTeste, '1001');
    console.log('✅ Método parsePrescricaoDetalhes existe e funciona');
    console.log(`   Resultado: ${typeof resultado}`);
} catch (error) {
    console.log('❌ Erro no método parsePrescricaoDetalhes:', error.message);
}

console.log('\n3. Verificando se parsePrescricoesList existe (este deve dar erro)...');
try {
    const resultado = parser.parsePrescricoesList(htmlTeste, '123456');
    console.log('❌ Método parsePrescricoesList não deveria existir!');
} catch (error) {
    console.log('✅ Correto - método parsePrescricoesList não existe:', error.message);
}

console.log('\n✅ Verificação concluída!');
