import { NgModule } from '@angular/core';
import { SharedModule } from '../shared/shared.module';
import { EvolutionViewerComponent } from './evolution-viewer/evolution-viewer.component';
import { EvolutionService } from './evolution.service';
@NgModule({
  declarations: [
    EvolutionViewerComponent
  ],
  imports: [
    SharedModule
  ],
  exports: [
    EvolutionViewerComponent
  ],
  providers: [
    EvolutionService
  ]
})
export class EvolutionsModule { }
