import { NgModule } from '@angular/core';
import { SharedModule } from '../shared/shared.module';
import { EvolutionsModule } from '../evolutions/evolutions.module';

import { PatientDetailsComponent } from './patient-details/patient-details.component';
import { PatientViewComponent } from './patient-view/patient-view.component';
import { PatientService } from './patient.service';
import { PatientDashboardComponent } from './patient-dashboard/patient-dashboard.component';

@NgModule({
  declarations: [
    PatientDetailsComponent,
    PatientViewComponent,
    PatientDashboardComponent
  ],
  imports: [
    SharedModule,
    EvolutionsModule
  ],
  exports: [
    PatientDetailsComponent,
    PatientViewComponent
  ],
  providers: [
    PatientService
  ]
})
export class PatientsModule { }
