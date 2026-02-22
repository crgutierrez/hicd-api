import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClientModule } from '@angular/common/http';

import { PrimengModule } from '../primeng/primeng.module';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    HttpClientModule,
    PrimengModule
  ],
  exports: [
    CommonModule,
    FormsModule,
    HttpClientModule,
    PrimengModule
  ]
})
export class SharedModule { }

