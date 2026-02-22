import { Component, OnInit } from '@angular/core';
import { ClinicService } from '../clinic.service';
import { Clinic } from '../clinic.model';
import { Patient } from '../patient.model';

@Component({
  selector: 'app-clinic-search',
  templateUrl: './clinic-search.component.html',
  styleUrls: ['./clinic-search.component.scss']
})
export class ClinicSearchComponent implements OnInit {

  allClinics: Clinic[] = [];
  filteredClinics: Clinic[] = [];
  patients: Patient[] = [];

  selectedClinic: Clinic | null = null;
  selectedPatient: Patient | null = null;
  searchTerm: string = '';

  clinicsLoading: boolean = false;
  patientsLoading: boolean = false;

  constructor(private clinicService: ClinicService) { }

  ngOnInit(): void {
    this.loadClinics();
  }

  loadClinics(): void {
    this.clinicsLoading = true;
    this.clinicService.getClinics().subscribe({
      next: (clinics) => {
        this.allClinics = clinics;
        this.filteredClinics = clinics;
        this.clinicsLoading = false;
      },
      error: (err) => {
        console.error('Erro ao carregar clínicas:', err);
        this.clinicsLoading = false;
      }
    });
  }

  searchClinics(): void {
    if (!this.searchTerm) {
      this.filteredClinics = [...this.allClinics];
    } else {
      this.filteredClinics = this.allClinics.filter(clinic =>
        clinic.nome.toLowerCase().includes(this.searchTerm.toLowerCase())
      );
    }
  }

  loadPatientsByClinic(clinicId: string): void {
    // Encontra a clínica pelo ID
    const clinic = this.allClinics.find(c => c.codigo === clinicId);
    if (!clinic) {
      console.error('Clínica não encontrada:', clinicId);
      return;
    }

    this.selectedClinic = clinic;
    this.patientsLoading = true;
    this.patients = [];
    this.selectedPatient = null;

    this.clinicService.getPatientsByClinic(clinicId).subscribe({
      next: (patients) => {
        this.patients = patients;
        this.patientsLoading = false;
      },
      error: (err) => {
        console.error('Erro ao carregar pacientes:', err);
        this.patientsLoading = false;
      }
    });
  }

  onClinicSelect(clinic: Clinic): void {
    this.loadPatientsByClinic(clinic.codigo);
  }

  onPatientSelect(patient: Patient): void {
    this.selectedPatient = patient;
  }
}
