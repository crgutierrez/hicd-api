// Based on DOCUMENTACAO_API.MD

export interface PatientDetails {
  dadosBasicos: {
    prontuario: string;
    nome: string;
    dataNascimento: string;
    nomeMae: string;
  };
  dadosDemograficos?: {
    endereco: string;
    cidade: string;
  };
}

export interface PatientEvolution {
  id: string;
  pacienteId: string;
  dataEvolucao: string;
  profissional: string;
  atividade: string;
  conteudo: {
    textoCompleto: string;
    resumo: string;
  };
  metadata: {
    temDiagnostico: boolean;
    temMedicamentos: boolean;
    temSinaisVitais: boolean;
  };
}

export interface PatientExam {
  requisicao: string;
  data: string;
  medico: string;
  exames: {
    codigo: string;
    nome: string;
  }[];
}

export interface PatientPrescription {
  id: string;
  dataPrescricao: string;
  status: string;
  itens: {
    medicamento: string;
    posologia: string;
    observacao: string;
  }[];
}
