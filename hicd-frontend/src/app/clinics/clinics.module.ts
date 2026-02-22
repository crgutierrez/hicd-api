import { NgModule } from '@angular/core';
import { SharedModule } from '../shared/shared.module';
import { PatientsModule } from '../patients/patients.module';
import { RouterModule } from '@angular/router';

import { ClinicSearchComponent } from './clinic-search/clinic-search.component';
import { ClinicService } from './clinic.service';

@NgModule({
  declarations: [
    ClinicSearchComponent
  ],
  imports: [
    SharedModule,
    PatientsModule,
    RouterModule
  ],
  exports: [
    ClinicSearchComponent
  ],
  providers: [
    ClinicService
  ]
})
export class ClinicsModule { }
