import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { Clinic } from './clinic.model';
import { Patient } from './patient.model';

interface ApiResponse<T> {
  success: boolean;
  source: string;
  data: T;
}

@Injectable({
  providedIn: 'root'
})
export class ClinicService {
  private apiUrl = 'http://localhost:3000/api';

  constructor(private http: HttpClient) { }

  getClinics(): Observable<Clinic[]> {
    return this.http.get<ApiResponse<Clinic[]>>(`${this.apiUrl}/clinicas`)
      .pipe(map(response => response.data));
  }

  getPatientsByClinic(clinicId: string): Observable<Patient[]> {
    return this.http.get<ApiResponse<Patient[]>>(`${this.apiUrl}/clinicas/${clinicId}/pacientes`)
      .pipe(map(response => response.data));
  }
}

