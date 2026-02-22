import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { Evolution } from './evolution.model';

interface ApiResponse<T> {
  success: boolean;
  prontuario?: string;
  data: T;
}

@Injectable({
  providedIn: 'root'
})
export class EvolutionService {
  private apiUrl = 'http://localhost:3000/api';

  constructor(private http: HttpClient) { }

  getEvolutionsByPatient(prontuario: string): Observable<Evolution[]> {
    return this.http.get<ApiResponse<Evolution[]>>(`${this.apiUrl}/pacientes/${prontuario}/evolucoes`)
      .pipe(map(response => response.data));
  }
}
