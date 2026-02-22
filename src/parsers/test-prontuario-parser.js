const ProntuarioParser = require('./prontuario-parser');

// HTML de teste simulando estrutura HICD para cadastro de paciente
const htmlTesteCadastro = `
<div class="panel-body">
    <div class="col-lg-3">
        <p>Registro: 123456</p>
        <p>Nome: João Silva Santos</p>
        <p>Nome da mãe: Maria Silva</p>
        <p>Logradouro: Rua das Flores, 123</p>
        <p>Bairro: Centro</p>
        <p>Telefone: (11) 98765-4321</p>
    </div>
    
    <div class="col-lg-4">
        <p>BE: 789012</p>
        <p>CNS: 123456789012345</p>
        <p>Documento: RG 12.345.678-9</p>
        <p>Número: 123</p>
        <p>Município: São Paulo</p>
        <p>Responsável: Maria Silva Santos</p>
    </div>
    
    <div class="col-lg-4">
        <p>Clinica / Leito: 001-UTI Adulto 15</p>
        <p>Nascimento: 15/03/1980 Idade: 43 anos</p>
        <p>Sexo: Masculino</p>
        <p>Complemento: Apto 45</p>
        <p>Estado: SP CEP: 01234567</p>
    </div>
</div>

<input type="hidden" id="pac_name" value="João Silva Santos">
<input type="hidden" id="pac_pront" value="123456">
`;

function testarProntuarioParser() {
    console.log('🧪 Testando ProntuarioParser ajustado conforme parser original...\n');
    
    const parser = new ProntuarioParser();
    parser.setDebugMode(true);
    
    try {
        // Teste do parse principal
        console.log('📋 Testando parse de cadastro do paciente...');
        const resultado = parser.parse(htmlTesteCadastro, '123456');
        
        console.log('\n📊 Resultado do parse:');
        console.log('- PacienteId:', resultado.pacienteId);
        console.log('- Nome:', resultado.dadosBasicos.nome);
        console.log('- Prontuário:', resultado.dadosBasicos.prontuario);
        console.log('- Data Nascimento:', resultado.dadosBasicos.dataNascimento);
        console.log('- Sexo:', resultado.dadosBasicos.sexo);
        console.log('- Idade:', resultado.dadosBasicos.idade);
        console.log('- Nome da Mãe:', resultado.dadosBasicos.nomeMae);
        
        console.log('\n🏠 Endereço:');
        console.log('- Logradouro:', resultado.endereco.logradouro);
        console.log('- Número:', resultado.endereco.numero);
        console.log('- Complemento:', resultado.endereco.complemento);
        console.log('- Bairro:', resultado.endereco.bairro);
        console.log('- Município:', resultado.endereco.municipio);
        console.log('- Estado:', resultado.endereco.estado);
        console.log('- CEP:', resultado.endereco.cep);
        
        console.log('\n📞 Contatos:');
        console.log('- Telefone:', resultado.contatos.telefone);
        
        console.log('\n📄 Documentos:');
        console.log('- BE:', resultado.documentos.be);
        console.log('- CNS:', resultado.documentos.cns);
        console.log('- Documento:', resultado.documentos.documento);
        
        console.log('\n🏥 Internação:');
        console.log('- Clínica/Leito:', resultado.internacao.clinicaLeito);
        console.log('- Código Clínica:', resultado.internacao.codigoClinica);
        console.log('- Nome Clínica:', resultado.internacao.nomeClinica);
        console.log('- Número Leito:', resultado.internacao.numeroLeito);
        
        console.log('\n👥 Responsável:');
        console.log('- Nome:', resultado.responsavel.nome);
        
        // Teste do resumo
        console.log('\n📝 Testando extração de resumo...');
        const resumo = parser.extractResumo(resultado);
        console.log('Resumo:', resumo);
        
        // Validações
        console.log('\n✅ Validações:');
        const validacoes = [
            { nome: 'Nome extraído corretamente', ok: resultado.dadosBasicos.nome === 'João Silva Santos' },
            { nome: 'Prontuário extraído', ok: resultado.dadosBasicos.prontuario === '123456' },
            { nome: 'Data nascimento extraída', ok: resultado.dadosBasicos.dataNascimento === '15/03/1980' },
            { nome: 'Sexo extraído', ok: resultado.dadosBasicos.sexo === 'Masculino' },
            { nome: 'Telefone extraído', ok: resultado.contatos.telefone === '(11) 98765-4321' },
            { nome: 'Município extraído', ok: resultado.endereco.municipio === 'São Paulo' },
            { nome: 'Clínica/Leito extraído', ok: resultado.internacao.clinicaLeito === '001-UTI Adulto 15' },
            { nome: 'Código clínica extraído', ok: resultado.internacao.codigoClinica === '001' },
            { nome: 'Nome clínica extraído', ok: resultado.internacao.nomeClinica === 'UTI Adulto' },
            { nome: 'Número leito extraído', ok: resultado.internacao.numeroLeito === '15' },
            { nome: 'BE extraído', ok: resultado.documentos.be === '789012' },
            { nome: 'CNS extraído', ok: resultado.documentos.cns === '123456789012345' }
        ];
        
        validacoes.forEach(validacao => {
            console.log(`${validacao.ok ? '✅' : '❌'} ${validacao.nome}`);
        });
        
        const sucessos = validacoes.filter(v => v.ok).length;
        const total = validacoes.length;
        
        console.log(`\n📈 Resultado: ${sucessos}/${total} validações passou`);
        
        if (sucessos === total) {
            console.log('🎉 Todos os testes passaram! ProntuarioParser ajustado conforme parser original.');
        } else {
            console.log('⚠️  Alguns testes falharam. Verificar ajustes necessários.');
        }
        
    } catch (error) {
        console.error('❌ Erro durante o teste:', error);
    }
}

// Executar teste
testarProntuarioParser();
