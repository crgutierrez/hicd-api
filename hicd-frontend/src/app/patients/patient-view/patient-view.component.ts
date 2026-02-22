import { Component, Input, OnChanges, SimpleChanges } from '@angular/core';
import { forkJoin } from 'rxjs';
import { PatientService } from '../patient.service';
import { PatientDetails, PatientEvolution, PatientExam, PatientPrescription } from '../patient.models';
@Component({
  selector: 'app-patient-view',
  templateUrl: './patient-view.component.html',
  styleUrls: ['./patient-view.component.scss']
})
export class PatientViewComponent implements OnChanges {
  @Input() prontuario: string | null = null;
  loading: boolean = false;
  patientDetails: PatientDetails | null = null;
  evolutions: PatientEvolution[] = [];
  exams: PatientExam[] = [];
  prescriptions: PatientPrescription[] = [];
  activeTabIndex: number = 0;
  constructor(private patientService: PatientService) { }
  ngOnChanges(changes: SimpleChanges): void {
    if (changes['prontuario'] && this.prontuario) {
      this.loadAllPatientData(this.prontuario);
    }
  }
  loadAllPatientData(prontuario: string): void {
    this.loading = true;
    this.resetData();
    forkJoin({
      details: this.patientService.getPatientDetails(prontuario),
      evolutions: this.patientService.getPatientEvolutions(prontuario),
      exams: this.patientService.getPatientExams(prontuario),
      prescriptions: this.patientService.getPatientPrescriptions(prontuario)
    }).subscribe({
      next: ({ details, evolutions, exams, prescriptions }) => {
        this.patientDetails = details;
        this.evolutions = evolutions;
        this.exams = exams || [];
        this.prescriptions = prescriptions || [];
        this.loading = false;
      },
      error: (err) => {
        console.error('Erro ao carregar dados do paciente:', err);
        this.loading = false;
      }
    });
  }
  private resetData(): void {
    this.patientDetails = null;
    this.evolutions = [];
    this.exams = [];
    this.prescriptions = [];
  }
  calcularIdade(dataNascimento: string): string {
    if (!dataNascimento) return '';
    const partes = dataNascimento.split('/');
    if (partes.length !== 3) return '';
    const nascimento = new Date(parseInt(partes[2]), parseInt(partes[1]) - 1, parseInt(partes[0]));
    const hoje = new Date();
    let idade = hoje.getFullYear() - nascimento.getFullYear();
    const mes = hoje.getMonth() - nascimento.getMonth();
    if (mes < 0 || (mes === 0 && hoje.getDate() < nascimento.getDate())) {
      idade--;
    }
    return `${idade} anos`;
  }
  getSeverityClass(status: string): string {
    switch (status?.toLowerCase()) {
      case 'ativa':
      case 'ativo':
        return 'status-active';
      case 'suspensa':
      case 'suspenso':
        return 'status-suspended';
      case 'concluída':
      case 'concluído':
        return 'status-completed';
      default:
        return 'status-default';
    }
  }
}
