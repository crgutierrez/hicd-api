import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { ButtonModule } from 'primeng/button';
import { TableModule } from 'primeng/table';
import { ToastModule } from 'primeng/toast';
import { InputTextModule } from 'primeng/inputtext';
import { DropdownModule } from 'primeng/dropdown';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { DialogModule } from 'primeng/dialog';
import { InputTextareaModule } from 'primeng/inputtextarea';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { CardModule } from 'primeng/card';
import { ToolbarModule } from 'primeng/toolbar';
import { CheckboxModule } from 'primeng/checkbox';
import { RadioButtonModule } from 'primeng/radiobutton';
import { TooltipModule } from 'primeng/tooltip';
import { MultiSelectModule } from 'primeng/multiselect';
import { CalendarModule } from 'primeng/calendar';
import { TabViewModule } from 'primeng/tabview';
import { AccordionModule } from 'primeng/accordion';

@NgModule({
  declarations: [],
  imports: [
    CommonModule,
    ButtonModule,
    TableModule,
    ToastModule,
    InputTextModule,
    DropdownModule,
    ConfirmDialogModule,
    DialogModule,
    InputTextareaModule,
    ProgressSpinnerModule,
    CardModule,
    ToolbarModule,
    CheckboxModule,
    RadioButtonModule,
    TooltipModule,
    MultiSelectModule,
    CalendarModule,
    TabViewModule,
    AccordionModule
  ],
  exports: [
    ButtonModule,
    TableModule,
    ToastModule,
    InputTextModule,
    DropdownModule,
    ConfirmDialogModule,
    DialogModule,
    InputTextareaModule,
    ProgressSpinnerModule,
    CardModule,
    ToolbarModule,
    CheckboxModule,
    RadioButtonModule,
    TooltipModule,
    MultiSelectModule,
    CalendarModule,
    TabViewModule,
    AccordionModule
  ]
})
export class PrimengModule { }
