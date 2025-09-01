/**
 * Teste específico para o parser de prescrições médicas
 * Valida a extração de dados do HTML fornecido
 */

const fs = require('fs');
const HICDParser = require('./src/parsers/hicd-parser');

// HTML de exemplo fornecido pelo usuário
const htmlExemplo = `
<body bgcolor="#FFFFFF" text="#000000" leftmargin="0" topmargin="0" marginwidth="0" marginheight="0" cz-shortcut-listen="true">
<table width="700" height="675" border="1" cellpadding="0" cellspacing="0" bordercolor="#000000" id="text_normal">
  <thead>
    <tr>
      <td height="91" colspan="2"><table width="650" border="0" cellspacing="0" cellpadding="0" align="left">
        <tbody><tr>
          <td colspan="3"></td>
          </tr>
        <tr>
          <td width="116" rowspan="5"><img src="https://hicd-hospub.sesau.ro.gov.br/prescricao_medica3/imagens/logo_unidade.jpg" width="60" align="right"></td>
          <td width="438" align="center"><font face="Arial" size="2"><b style="font-size: 12px"></b></font></td>
          <td width="236" rowspan="5" align="right"><img src="https://hicd-hospub.sesau.ro.gov.br/prescricao_medica3/imagens/logo-sus-pb.jpg" height="57"></td>
          </tr>
        <tr>
          <td align="center"><font face="Arial" size="2"><b style="font-size: 12px"><span style="font-size: 12px"></span></b></font><b style="font-size: 12px"><span style="font-size: 12px"></span></b></td>
          </tr>
        <tr>
          <td align="center"><font face="Arial" size="2"><b style="font-size: 12px; font-weight: bold;">Hospital Infantil Cosme e damião</b></font></td>
          </tr>
        <tr>
          <td align="center">&nbsp;</td>
          </tr>
        <tr>
          <td align="center"><font face="Arial" size="2"><b>PRESCRIÇÃO MÉDICA válida para&nbsp;31/08/2025</b></font></td>
          </tr>
        
        </tbody></table></td>
      <td colspan="3"><table width="722" border="0" cellspacing="0" cellpadding="0" align="left" height="89">
        <tbody><tr>
          <td width="600" height="28"><p><font face="Arial" size="2">&nbsp;<b>NOME :   </b><b style="font-size: 1pt"><font face="Arial" size="2"><b style="font-size: 12pt">SARA SILVA MOPES</b></font></b></font></p></td>
          <td width="200" colspan="2"><p><b style="font-size: 10pt"><font face="Arial" size="2"><b>REGISTRO/BE: </b><b style="font-size: 13pt">40380</b></font></b></p></td>
          </tr>
        <tr>
          <td width="800" colspan="3" height="24"><font face="Arial" size="2">&nbsp;<b>INTERNADO</b><b style="font-size: 11pt">  13/07/2025</b><b> - CLINICA/SETOR: </b><b style="font-size: 11pt">U T I<font face="Arial" size="2">&nbsp;&nbsp;&nbsp;<b> - &nbsp; LEITO: </b></font></b><b style="font-size: 7pt"><font face="Arial" size="2"><b style="font-size: 12pt">0070005</b></font></b></font></td>
          </tr>
        <tr>
        	
          	<td width="428" colspan="3" height="19"><b style="font-size: 10pt"><font face="Arial" size="2">&nbsp;<b>DT. NASC:&nbsp;</b></font><b style="font-size: 13pt">02/06/2025   </b><b style="font-size: 12pt"><b style="font-size: 12pt"><font face="Arial" size="2">&nbsp;&nbsp;&nbsp;&nbsp;<b>IDADE:&nbsp;&nbsp;</b></font><b style="font-size: 10pt">2 meses                </b></b></b></b>
          		<b style="font-size:12pt;"> &nbsp;&nbsp; - &nbsp;&nbsp; CNS: 700807972370181</b>          	</td>
        </tr>
        <tr>
          	<td height="18" colspan="3"><font face="Arial" size="2">&nbsp;<b>PESO: 4,330 Kg/g    </b>&nbsp;&nbsp;</font>   <font face="Arial" size="2"><b>ESTATURA:  Cm &nbsp;&nbsp;  SUPERF.CORPOREA: Sc</b></font></td>
        </tr>
        
      </tbody></table></td>
    </tr>
    <tr valign="top">
      <td height="20" colspan="4" align="left" id="text"><font face="Arial" size="2"><b>DIAGNÓSTICO: </b>&nbsp;&nbsp;</font><font face="Arial" size="2"><b>THT:  Tht </b>&nbsp;&nbsp;</font> <font face="Arial" size="2"><b>MED:  Med &nbsp;&nbsp; HV: Hv &nbsp;&nbsp;</b></font><font face="Arial" size="2"><b>DIETA:  Dieta &nbsp;&nbsp;  VM: Vm</b></font></td>
      <td width="300" align="left" id="text"><label class="valorV3"><b>horário</b></label>&nbsp;</td>
    </tr>
  </thead>
  
  <tbody><tr valign="top" style="font-style: normal">
    <td colspan="4" nowrap="nowrap" style="font-size: 11px" width="800"><label class="valorV3"><b>Dietas</b></label><table><tbody><tr><td><label class="valorV3"><b>1-</b></label></td><td><label class="valorV3">enteral  Gastrostomia 3/3  55ml   <b>Fórmula Infantil 1 + 5ml água após dieta</b></label></td></tr></tbody></table><br><label class="valorV3"><b>Medicação: LEGENDA(nome medic--DoseDiária--Apres--Dose--Via--Intervalo--_obs--DiasAtib--Justific)</b></label><table border="1" cellpadding="0" cellspacing="0" width="100%"><tbody><tr><td><label class="valorV3" align="top"><b>1-</b></label></td><td height="25px;"><label class="valorV3">[
					MEROPENEM 500MG SOL. INJ. - POLIOFILISADO + BOLSA 100ML]&nbsp;&nbsp;&nbsp;(121,3,&nbsp;&nbsp;(500 MG + 10ML AD),&nbsp;&nbsp;.,&nbsp;&nbsp;EV,&nbsp;&nbsp;8/8&nbsp;Horas,&nbsp;&nbsp;FAZER 3,5 ML + 15 ML SF 0,9% - CORRER EM 3 H,&nbsp;&nbsp;5&nbsp;/&nbsp;</label></td></tr><tr><td><label class="valorV3" align="top"><b>2-</b></label></td><td height="25px;"><label class="valorV3">[
					ANLODIPINO, BESILATO 5MG COMPRIMIDO]&nbsp;&nbsp;&nbsp;(0,4),&nbsp;&nbsp;(1cp + 5ml AD),&nbsp;&nbsp;.,&nbsp;&nbsp;GTT,&nbsp;&nbsp;12/12&nbsp;Horas,&nbsp;&nbsp;- Oferecer 0,8ml + 5ml AD para lavar gastrostomia,&nbsp;&nbsp;22&nbsp;/&nbsp;</label></td></tr><tr><td><label class="valorV3" align="top"><b>3-</b></label></td><td height="25px;"><label class="valorV3">[
					PARACETAMOL 200MG/MG SOL ORAL 15ML]&nbsp;&nbsp;&nbsp;.,&nbsp;&nbsp;GTT,&nbsp;&nbsp;Livre&nbsp;Horas,&nbsp;&nbsp;- Oferecer 4 gotas + 5ml AD para lavar gastrostomia, se dor ou febre &gt; 37,8C,&nbsp;&nbsp;22&nbsp;/&nbsp;</label></td></tr><tr><td><label class="valorV3" align="top"><b>4-</b></label></td><td height="25px;"><label class="valorV3">[
					SULFATO FERROSO 25MG FE++/ML SOLUCAO ORAL 30ML]&nbsp;&nbsp;&nbsp;(4),&nbsp;&nbsp;Dar 13 gotas,&nbsp;&nbsp;VO,&nbsp;&nbsp;24/24&nbsp;Horas,&nbsp;&nbsp;+ 5 ml de agua apos (Via GTT),&nbsp;&nbsp;2&nbsp;/&nbsp;</label></td></tr><tr><td><label class="valorV3" align="top"><b>5-</b></label></td><td height="25px;"><label class="valorV3">[
					ATROPINA, SULFATO (5MG/ML) SOL. OFTALMICA 5ML]&nbsp;&nbsp;&nbsp;.,&nbsp;&nbsp;SL,&nbsp;&nbsp;8/8&nbsp;Horas,&nbsp;&nbsp;- Pingar 1 gota em cada canto da bochecha e massagear,&nbsp;&nbsp;37&nbsp;/&nbsp;</label></td></tr><tr><td><label class="valorV3" align="top"><b>6-</b></label></td><td height="25px;"><label class="valorV3">[
					CARMELOSE SODICA 0,5% (5MG/ML) FRASCO 15ML SOL. OFTALMICA]&nbsp;&nbsp;&nbsp;.,&nbsp;&nbsp;OC,&nbsp;&nbsp;8/8&nbsp;Horas,&nbsp;&nbsp;- Pingar 1 gota em cada olho,&nbsp;&nbsp;37&nbsp;/&nbsp;</label></td></tr><tr><td><label class="valorV3" align="top"><b>7-</b></label></td><td height="25px;"><label class="valorV3">[
					CETILPERIDINO + GLUCONATO CLOREXIDINA 0,12% FRASCO 250ML    ENXAGUANTE BUCAL]&nbsp;&nbsp;&nbsp;.,&nbsp;&nbsp;VO,&nbsp;&nbsp;12/12&nbsp;Horas,&nbsp;&nbsp;- Higiene oral,&nbsp;&nbsp;49&nbsp;/&nbsp;</label></td></tr><tr><td><label class="valorV3" align="top"><b>8-</b></label></td><td height="25px;"><label class="valorV3">[
					ACIDOS GRAXOS ESSENCIAIS + VIT.A + VIT.E + LECITINA DE SOJA, LOCAO 100ML (AGE)]&nbsp;&nbsp;&nbsp;.,&nbsp;&nbsp;TP,&nbsp;&nbsp;Livre&nbsp;Horas,&nbsp;&nbsp;- Hidratar a pele,&nbsp;&nbsp;49&nbsp;/&nbsp;</label></td></tr><tr><td><label class="valorV3" align="top"><b>9-</b></label></td><td height="25px;"><label class="valorV3">[
					NISTATINA 100.000UI/G + 200MG/G + OXIDO DE ZINCO 60G]&nbsp;&nbsp;&nbsp;.,&nbsp;&nbsp;TP,&nbsp;&nbsp;Livre&nbsp;Horas,&nbsp;&nbsp;- Troca de fralda,&nbsp;&nbsp;50&nbsp;/&nbsp;</label></td></tr></tbody></table><br><label class="valorV3"><b>Medicação não padronizada/sem estoque</b></label><table border="1" cellpadding="0" cellspacing="0" width="100%"><tbody><tr><td height="25px;"><label class="valorV3"><b>1-</b></label></td><td height="25px;"><label class="valorV3">ALTA D&nbsp;&nbsp;&nbsp;&nbsp;500UI&nbsp;&nbsp;1 GOTA&nbsp;&nbsp;GTT&nbsp;&nbsp;24/24&nbsp;&nbsp;1&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;1 GOTA + 5 ML AGUA&nbsp;&nbsp;VIT</label></td></tr></tbody></table><br><table><tbody><tr><td><label class="valorV3"><b>CUIDADOS GERAIS</b></label><table><tbody><tr><td><label class="valorV3"><b>1 - </b>CABECEIRA ELEVADA 35 GRAUS
</label></td></tr><tr><td><label class="valorV3"><b>2 - </b>SUPORTE VENTILATORIO: vmi sob traqueostomia
</label></td></tr><tr><td><label class="valorV3"><b>3 - </b>MONITORIZACAO CONTINUA + OXIMETRIA DE PULSO
</label></td></tr><tr><td><label class="valorV3"><b>4 - </b>PA + SINAIS VITAIS DE 4/4H - COMUNICAR SE PA &lt; 69x39 OU &gt; 98X65 MMHG
</label></td></tr><tr><td><label class="valorV3"><b>5 - </b>BALANCO HIDRICO E CONTROLE DE DIURESE 6/6H
</label></td></tr><tr><td><label class="valorV3"><b>6 - </b>GLICEMIA CAPILAR acm - COMUNICAR SE &lt; 60 OU &gt; 180 MG/DL
</label></td></tr><tr><td><label class="valorV3"><b>7 - </b>CUIDADOS E CURATIVO COM A traqueostomia, gastrostomia. 
</label></td></tr><tr><td><label class="valorV3"><b>8 - </b>isolamento de contato
</label></td></tr><tr><td><label class="valorV3"><b>9 - </b>pesaR toda segunda-feira
</label></td></tr><tr><td><label class="valorV3"><b>10 - </b>CUIDADOS DE UTIPED</label></td></tr></tbody></table></td></tr></tbody></table>        <br>
        <b style="font-size:11pt;">NECESSIDADE DE:</b>
        <br>
        <br>
                <label class="valorV3">Fisioterapia -
                  </label>
        <label class="valorV3">
          1        </label>
        <label class="valorV3">
          1        </label>
                <br>
        <br>
              
   </td>
    <td height="515" style="font-size:12px" font="" face="Arial" size="1"><label class="valorV3"><b>Dietas</b></label><table><tbody><tr><td><label>-----</label></td></tr></tbody></table><br><label class="valorV3"><b>Medicação</b></label><table border="1" cellpadding="0" cellspacing="0" width="100%"><tbody><tr><td height="25px;&gt;&lt;label class=" valorv3'="" style="font-size:12pt;"><b>1</b>-</td></tr>
<tr><td height="25px;&gt;&lt;label class=" valorv3'="" style="font-size:12pt;"><b>2</b>-</td></tr>
<tr><td height="25px;&gt;&lt;label class=" valorv3'="" style="font-size:12pt;"><b>3</b>-</td></tr>
<tr><td height="25px;&gt;&lt;label class=" valorv3'="" style="font-size:12pt;"><b>4</b>-</td></tr>
<tr><td height="25px;&gt;&lt;label class=" valorv3'="" style="font-size:12pt;"><b>5</b>-</td></tr>
<tr><td height="25px;&gt;&lt;label class=" valorv3'="" style="font-size:12pt;"><b>6</b>-</td></tr>
<tr><td height="25px;&gt;&lt;label class=" valorv3'="" style="font-size:12pt;"><b>7</b>-</td></tr>
<tr><td height="25px;&gt;&lt;label class=" valorv3'="" style="font-size:12pt;"><b>8</b>-</td></tr>
<tr><td height="25px;&gt;&lt;label class=" valorv3'="" style="font-size:12pt;"><b>9</b>-</td></tr>
</tbody></table><br><label class="valorV3"><b>Medicação N.P. (sem estoque)</b></label><table border="1" cellpadding="0" cellspacing="0" width="100%"><tbody><tr><td height="25px;"><label class="valorV3"><b>1</b>-</label></td></tr></tbody></table><br><br><label class="valorV3"><b>CUIDADOS GERAIS</b></label>	
	<table>
		<tbody><tr><td><label class="valorV3"><b>1</b>-</label></td></tr><tr><td><label class="valorV3"><b>2</b>-</label></td></tr><tr><td><label class="valorV3"><b>3</b>-</label></td></tr><tr><td><label class="valorV3"><b>4</b>-</label></td></tr><tr><td><label class="valorV3"><b>5</b>-</label></td></tr><tr><td><label class="valorV3"><b>6</b>-</label></td></tr><tr><td><label class="valorV3"><b>7</b>-</label></td></tr><tr><td><label class="valorV3"><b>8</b>-</label></td></tr><tr><td><label class="valorV3"><b>9</b>-</label></td></tr><tr><td><label class="valorV3"><b>10</b>-</label></td></tr></tbody></table>  
	  </td></tr><tr valign="top">
	    <td width="620" height="26" style="display:"><label class="valorV3"><b>SEDAçãO:  </b></label><b><label class="valorV3" font:="" bold="" 14px="" arial;="" line-height:="" 1.5'="" name="campo_paren_sedacao" cols="40" id="campo_paren_sedacao" rows="13"><br></label> 
            </b></td>     
	    <td height="26" colspan="7" align="left" valign="bottom" border="0">&nbsp;
        <label class="valorV3"><b>VENOSA: </b></label><b><label class="valorV3" style="font: bold 14px Arial; line-height: 1.5" name="campo_paren" cols="40" id="campo_paren" rows="13">Periodo: 24/24 horas;<br>
SF 0,9%: -------------24ML <br>
<br>
CORRER 1ML/H EV MANTER ACESSO<br>
<br></label>        
        </b></td>
	  </tr>
	  <tr>
	  <td height="20" colspan="8"><table width="1210" border="0" cellspacing="0" cellpadding="0" align="left">
	        <tbody><tr>
	          <td width="1174" height="18" id="text">&nbsp;<b>MÉDICO:<span class="valorV3"> VIVIANE MARTINS DE SOUSA</span> &nbsp;&nbsp;&nbsp;CRM: <span class="valorV3">6684 &nbsp;&nbsp;&nbsp;<b>ASSINATURA: _______________________________   &nbsp;<b>DATA:31/08/2025 09:29&nbsp;&nbsp;&nbsp;ACOMPANHANTE: | &nbsp;| SIM&nbsp; | &nbsp;| NãO</b></b></span></b></td>
	        </tr>
	    </tbody></table>
	  </td></tr>
	</tbody></table>
</body>
`;

async function testarParser() {
    console.log('🧪 TESTE DO PARSER DE PRESCRIÇÕES MÉDICAS');
    console.log('='.repeat(50));
    
    try {
        // Instanciar o parser em modo debug
        const parser = new HICDParser(true);
        
        // Testar o parsing dos detalhes da prescrição
        console.log('📄 Executando parsing dos detalhes da prescrição...');
        const detalhes = parser.parsePrescricaoDetalhes(htmlExemplo, 'TEST_123');
        
        console.log('\n📊 RESULTADOS DO PARSING:');
        console.log('='.repeat(30));
        
        // Exibir cabeçalho
        console.log('\n👤 DADOS DO PACIENTE:');
        console.log(`   • Nome: ${detalhes.cabecalho.pacienteNome || 'N/A'}`);
        console.log(`   • Registro: ${detalhes.cabecalho.registro || 'N/A'}`);
        console.log(`   • Leito: ${detalhes.cabecalho.leito || 'N/A'}`);
        console.log(`   • Data Nascimento: ${detalhes.cabecalho.dataNascimento || 'N/A'}`);
        console.log(`   • Idade: ${detalhes.cabecalho.idade || 'N/A'}`);
        console.log(`   • CNS: ${detalhes.cabecalho.cns || 'N/A'}`);
        console.log(`   • Peso: ${detalhes.cabecalho.peso || 'N/A'}`);
        console.log(`   • Hospital: ${detalhes.cabecalho.hospital || 'N/A'}`);
        console.log(`   • Data Internação: ${detalhes.cabecalho.dataInternacao || 'N/A'}`);
        console.log(`   • Clínica: ${detalhes.cabecalho.clinica || 'N/A'}`);
        console.log(`   • Data Prescrição: ${detalhes.cabecalho.dataPrescricao || 'N/A'}`);
        
        // Exibir dietas
        if (detalhes.dietas && detalhes.dietas.length > 0) {
            console.log('\n🍽️ DIETAS PRESCRITAS:');
            detalhes.dietas.forEach((dieta, index) => {
                console.log(`   ${index + 1}. ${dieta.descricao}`);
            });
        }
        
        // Exibir medicamentos
        console.log('\n💊 MEDICAMENTOS PRESCRITOS:');
        if (detalhes.medicamentos && detalhes.medicamentos.length > 0) {
            detalhes.medicamentos.forEach((med, index) => {
                console.log(`   ${index + 1}. ${med.nome}`);
                if (med.dose) console.log(`      ├─ Dose: ${med.dose}`);
                if (med.apresentacao) console.log(`      ├─ Apresentação: ${med.apresentacao}`);
                if (med.via) console.log(`      ├─ Via: ${med.via}`);
                if (med.intervalo) console.log(`      ├─ Intervalo: ${med.intervalo}`);
                if (med.observacao) console.log(`      ├─ Observação: ${med.observacao}`);
                if (med.dias) console.log(`      └─ Dias: ${med.dias}`);
                if (med.naoPadronizado) console.log(`      ⚠️ Medicamento não padronizado`);
                console.log();
            });
        } else {
            console.log('   ❌ Nenhum medicamento encontrado');
        }
        
        // Exibir observações
        console.log('📝 OBSERVAÇÕES E CUIDADOS:');
        if (detalhes.observacoes && detalhes.observacoes.length > 0) {
            const observacoesPorTipo = {};
            
            detalhes.observacoes.forEach(obs => {
                const tipo = obs.tipo || 'Geral';
                if (!observacoesPorTipo[tipo]) {
                    observacoesPorTipo[tipo] = [];
                }
                observacoesPorTipo[tipo].push(obs.descricao || obs);
            });
            
            Object.entries(observacoesPorTipo).forEach(([tipo, lista]) => {
                console.log(`\n   📌 ${tipo.toUpperCase()}:`);
                lista.forEach((obs, index) => {
                    console.log(`      ${index + 1}. ${obs}`);
                });
            });
        } else {
            console.log('   ❌ Nenhuma observação encontrada');
        }
        
        // Exibir informações do médico
        console.log('\n👨‍⚕️ INFORMAÇÕES MÉDICAS:');
        console.log(`   • Médico: ${detalhes.cabecalho.medico || 'N/A'}`);
        console.log(`   • CRM: ${detalhes.cabecalho.crm || 'N/A'}`);
        console.log(`   • Data/Hora Assinatura: ${detalhes.cabecalho.dataAssinatura || 'N/A'}`);
        console.log(`   • Acompanhante: ${detalhes.cabecalho.acompanhante || 'N/A'}`);
        
        // Exibir assinaturas
        if (detalhes.assinaturas && detalhes.assinaturas.length > 0) {
            console.log('\n✍️ ASSINATURAS:');
            detalhes.assinaturas.forEach((assinatura, index) => {
                console.log(`   ${index + 1}. ${assinatura}`);
            });
        }
        
        // Resumo estatístico
        console.log('\n📈 RESUMO ESTATÍSTICO:');
        console.log(`   • Total de medicamentos: ${detalhes.medicamentos ? detalhes.medicamentos.length : 0}`);
        console.log(`   • Total de dietas: ${detalhes.dietas ? detalhes.dietas.length : 0}`);
        console.log(`   • Total de observações: ${detalhes.observacoes ? detalhes.observacoes.length : 0}`);
        console.log(`   • Total de assinaturas: ${detalhes.assinaturas ? detalhes.assinaturas.length : 0}`);
        
        // Salvar resultado em arquivo para análise
        const resultadoJson = JSON.stringify(detalhes, null, 2);
        await fs.promises.writeFile('./test_parser_resultado.json', resultadoJson, 'utf8');
        console.log('\n💾 Resultado salvo em: ./test_parser_resultado.json');
        
        console.log('\n✅ TESTE CONCLUÍDO COM SUCESSO!');
        
        return detalhes;
        
    } catch (error) {
        console.error('\n❌ ERRO NO TESTE:', error.message);
        console.error(error.stack);
        return null;
    }
}

// Executar teste
if (require.main === module) {
    testarParser().then(resultado => {
        if (resultado) {
            console.log('\n🎉 Parser funcionando corretamente!');
            process.exit(0);
        } else {
            console.log('\n💥 Falha no teste do parser!');
            process.exit(1);
        }
    });
}

module.exports = { testarParser, htmlExemplo };
