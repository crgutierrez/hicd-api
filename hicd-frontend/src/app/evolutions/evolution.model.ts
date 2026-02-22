export interface Evolution {
  id: string;
  prontuario: string;
  dataHora: string;
  dataEvolucao: string;
  profissional: string;
  conselho: string;
  atividade: string;
  resumo?: string;
  conteudo?: {
    textoCompleto: string;
    resumo?: string;
    secoes: EvolutionSection[];
  };
  indicadores?: {
    temDiagnostico: boolean;
    temMedicamentos: boolean;
    temSinaisVitais: boolean;
  };
}
export interface EvolutionSection {
  titulo?: string;
  conteudo: string;
}
export interface EvolutionFilter {
  searchTerm?: string;
  professional?: string;
  activity?: string;
  dateFrom?: Date;
  dateTo?: Date;
}
