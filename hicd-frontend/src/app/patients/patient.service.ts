import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { PatientDetails, PatientEvolution, PatientExam, PatientPrescription } from './patient.models';

interface ApiResponse<T> {
  success: boolean;
  source: string;
  data: T;
}

@Injectable({
  providedIn: 'root'
})
export class PatientService {
  private apiUrl = 'http://localhost:3000/api';

  constructor(private http: HttpClient) { }

  getPatientDetails(prontuario: string): Observable<PatientDetails> {
    return this.http.get<ApiResponse<PatientDetails>>(`${this.apiUrl}/pacientes/${prontuario}`)
      .pipe(map(response => response.data));
  }

  getPatientEvolutions(prontuario: string): Observable<PatientEvolution[]> {
    return this.http.get<{ success: boolean, prontuario: string, data: PatientEvolution[] }>(`${this.apiUrl}/pacientes/${prontuario}/evolucoes`)
      .pipe(map(response => response.data));
  }

  getPatientExams(prontuario: string): Observable<PatientExam[]> {
    return this.http.get<ApiResponse<PatientExam[]>>(`${this.apiUrl}/pacientes/${prontuario}/exames`)
      .pipe(map(response => response.data));
  }

  getPatientPrescriptions(prontuario: string): Observable<PatientPrescription[]> {
    return this.http.get<ApiResponse<PatientPrescription[]>>(`${this.apiUrl}/pacientes/${prontuario}/prescricoes`)
      .pipe(map(response => response.data));
  }
}

