const { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
        AlignmentType, HeadingLevel, LevelFormat, BorderStyle, WidthType,
        ShadingType, VerticalAlign, Header, Footer, PageNumber } = require('docx');
const fs = require('fs');

const cellBorder = { style: BorderStyle.SINGLE, size: 1, color: "CCCCCC" };
const borders = { top: cellBorder, bottom: cellBorder, left: cellBorder, right: cellBorder };
const headerShade = { fill: "1F4E79", type: ShadingType.CLEAR };
const altShade = { fill: "EBF3FB", type: ShadingType.CLEAR };

function tableRow(label, value, shade) {
  return new TableRow({ children: [
    new TableCell({ borders, width: { size: 2800, type: WidthType.DXA },
      shading: { fill: "D6E4F0", type: ShadingType.CLEAR },
      children: [new Paragraph({ children: [new TextRun({ text: label, bold: true, size: 22, font: "Arial" })] })] }),
    new TableCell({ borders, width: { size: 6560, type: WidthType.DXA },
      shading: shade || { fill: "FFFFFF", type: ShadingType.CLEAR },
      children: [new Paragraph({ children: [new TextRun({ text: value, size: 22, font: "Arial" })] })] })
  ]});
}

function bullet(text) {
  return new Paragraph({ numbering: { reference: "bullet-list", level: 0 },
    children: [new TextRun({ text, size: 22, font: "Arial" })] });
}

function sectionTitle(text) {
  return new Paragraph({ heading: HeadingLevel.HEADING_2, spacing: { before: 200, after: 100 },
    children: [new TextRun({ text, size: 26, bold: true, font: "Arial", color: "1F4E79" })] });
}

function subTitle(text) {
  return new Paragraph({ spacing: { before: 160, after: 80 },
    children: [new TextRun({ text, bold: true, size: 23, font: "Arial", color: "2E74B5" })] });
}

const doc = new Document({
  numbering: {
    config: [
      { reference: "bullet-list",
        levels: [{ level: 0, format: LevelFormat.BULLET, text: "•", alignment: AlignmentType.LEFT,
          style: { paragraph: { indent: { left: 720, hanging: 360 } } } }] }
    ]
  },
  styles: {
    default: { document: { run: { font: "Arial", size: 22 } } },
    paragraphStyles: [
      { id: "Heading1", name: "Heading 1", basedOn: "Normal", next: "Normal",
        run: { size: 36, bold: true, color: "1F4E79", font: "Arial" },
        paragraph: { spacing: { before: 240, after: 120 }, outlineLevel: 0 } },
      { id: "Heading2", name: "Heading 2", basedOn: "Normal", next: "Normal",
        run: { size: 26, bold: true, color: "1F4E79", font: "Arial" },
        paragraph: { spacing: { before: 200, after: 100 }, outlineLevel: 1 } },
    ]
  },
  sections: [{
    properties: { page: { margin: { top: 1008, right: 1008, bottom: 1008, left: 1008 } } },
    headers: {
      default: new Header({ children: [new Paragraph({
        alignment: AlignmentType.RIGHT,
        children: [new TextRun({ text: "HICD — Resumo de Evolução  |  21/05/2026", size: 18, color: "888888", font: "Arial" })]
      })] })
    },
    footers: {
      default: new Footer({ children: [new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [
          new TextRun({ text: "Página ", size: 18, color: "888888", font: "Arial" }),
          new TextRun({ children: [PageNumber.CURRENT], size: 18, color: "888888", font: "Arial" }),
          new TextRun({ text: " de ", size: 18, color: "888888", font: "Arial" }),
          new TextRun({ children: [PageNumber.TOTAL_PAGES], size: 18, color: "888888", font: "Arial" })
        ]
      })] })
    },
    children: [
      // Título
      new Paragraph({ heading: HeadingLevel.HEADING_1, alignment: AlignmentType.CENTER, spacing: { before: 0, after: 200 },
        children: [new TextRun({ text: "GUILHERMY PASSOS MENDES", size: 36, bold: true, font: "Arial", color: "1F4E79" })] }),
      new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 0, after: 300 },
        children: [new TextRun({ text: "Resumo de Evolução — Leito M6", size: 24, font: "Arial", color: "2E74B5", italics: true })] }),

      // Folha de rosto
      sectionTitle("Folha de Rosto"),
      new Table({
        columnWidths: [2800, 6560],
        margins: { top: 80, bottom: 80, left: 180, right: 180 },
        rows: [
          tableRow("Nome", "GUILHERMY PASSOS MENDES"),
          tableRow("Prontuário", "19962", altShade),
          tableRow("Leito", "M6"),
          tableRow("Hipótese principal", "Atresia de esôfago sem fístula — pós-op múltiplo com fístula cervical e infecção de sítio cirúrgico", altShade),
          tableRow("Data de entrada", "18/04/2026"),
          tableRow("Dias internado", "33 dias", altShade),
          tableRow("Última atualização", "20/05/2026 (Clínica Geral — Dra. Stella Aparecida)"),
        ]
      }),

      // Hipóteses
      new Paragraph({ spacing: { before: 280, after: 0 }, children: [] }),
      sectionTitle("Hipóteses Diagnósticas"),
      bullet("Transtorno leve do desenvolvimento intelectual (CID: F70.0 e 6A00.0)"),
      bullet("Gastroenterite resolvida"),
      bullet("Atresia de esôfago sem fístula — esofagostomia / POi tubo gástrico + esofagectomia distal (18/04) / PO laparotomia de reabordagem: gastrorrafia e drenagem peritoneal (30/04)"),
      bullet("Infecção de sítio de ferida operatória — Citrobacter freundii (cultura 08/05)"),

      // Medicações
      new Paragraph({ spacing: { before: 280, after: 0 }, children: [] }),
      sectionTitle("Medicações em Uso"),
      bullet("Dieta enteral SNE 140 ml + 20 ml água após, de 3/3h"),
      bullet("Vancomicina — desde 29/04, manter até 27/05/2026"),
      bullet("Meropenem 120 mg/kg/dia — iniciado 20/05, mínimo 10 dias (conforme CCIH)"),
      bullet("Risperidona 1 ml 12/12h (conforme Neuroped)"),
      bullet("Dipirona SN"),
      bullet("Atropina"),
      bullet("Higiene oral: cetilpiridínio + gluconato de clorexidina 0,12% 12/12h"),
      bullet("AGE tópico | Nistatina + óxido de zinco pomada"),

      // Conduta
      new Paragraph({ spacing: { before: 280, after: 0 }, children: [] }),
      sectionTitle("Última Conduta (20/05/2026)"),
      bullet("Dieta enteral via SNE — em progressão conforme tolerância"),
      bullet("Em ar ambiente (SpO₂ 98%, FC 104 bpm)"),
      bullet("Suspenso cefepime e metronidazol (Citrobacter freundii resistente — CCIH 19/05)"),
      bullet("Iniciado meropenem 120 mg/kg/dia por mínimo 10 dias"),
      bullet("Mantida vancomicina até 27/05/2026"),
      bullet("Mantida risperidona 1 ml 12/12h"),
      bullet("Vigilância de deiscência de ferida operatória laparotômica — curativos e avaliação de secreção"),
      bullet("Acompanhamento conjunto: pediatria, cirurgia pediátrica, nutrição e fonoaudiologia"),
      bullet("EDA em programação"),
      bullet("Aguardo resultado do painel viral"),
      bullet("Comunicar plantão se intercorrências"),

      // Pendências
      new Paragraph({ spacing: { before: 280, after: 0 }, children: [] }),
      sectionTitle("Pendências"),

      subTitle("Exames"),
      bullet("Resultado do painel viral (solicitado — nota enfermagem 21/05)"),

      subTitle("Procedimentos / Intervenções"),
      bullet("EDA em programação — avaliação de fístula cervical e anastomose"),

      subTitle("Outras Pendências"),
      bullet("Vigilância de deiscência de ferida operatória laparotômica"),
      bullet("Transição de dieta enteral para oral: dependente de evolução da fístula cervical (prazo estimado 3–4 semanas a partir de 06/05) e liberação da fonoaudiologia"),

      // Rodapé de data
      new Paragraph({ spacing: { before: 400, after: 0 }, alignment: AlignmentType.RIGHT,
        children: [new TextRun({ text: "Gerado em 21/05/2026 às 11:12h", size: 18, italics: true, color: "999999", font: "Arial" })] }),
    ]
  }]
});

const OUT = "/home/cristiano/projetos/pessoais/hicd-bot/output/Guilhermy-Passos-Mendes-Resumo-20260521.docx";
Packer.toBuffer(doc).then(buf => {
  require('fs').mkdirSync('/home/cristiano/projetos/pessoais/hicd-bot/output', { recursive: true });
  fs.writeFileSync(OUT, buf);
  console.log("Salvo em:", OUT);
});
