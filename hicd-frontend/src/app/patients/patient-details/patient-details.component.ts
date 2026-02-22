import { Component, Input, OnChanges, SimpleChanges } from '@angular/core';
import { forkJoin } from 'rxjs';
import { PatientService } from '../patient.service';
import { PatientDetails, PatientEvolution, PatientExam, PatientPrescription } from '../patient.models';

@Component({
  selector: 'app-patient-details',
  templateUrl: './patient-details.component.html',
  styleUrls: ['./patient-details.component.scss']
})
export class PatientDetailsComponent implements OnChanges {
  @Input() prontuario: string | null = null;

  loading: boolean = false;
  patientDetails: PatientDetails | null = null;
  evolutions: PatientEvolution[] = [];
  exams: PatientExam[] = [];
  prescriptions: PatientPrescription[] = [];

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
      evolutions: this.patientService.getPatientEvolutions(prontuario)
      ,exams: this.patientService.getPatientExams(prontuario)
      ,prescriptions: this.patientService.getPatientPrescriptions(prontuario)
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
}
