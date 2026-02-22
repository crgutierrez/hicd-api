import { Component, Input, OnInit, OnChanges, SimpleChanges } from '@angular/core';
import { EvolutionService } from '../evolution.service';
import { Evolution } from '../evolution.model';
@Component({
  selector: 'app-evolution-viewer',
  templateUrl: './evolution-viewer.component.html',
  styleUrls: ['./evolution-viewer.component.scss']
})
export class EvolutionViewerComponent implements OnInit, OnChanges {
  @Input() prontuario: string | null = null;
  @Input() patientName: string = '';
  evolutions: Evolution[] = [];
  filteredEvolutions: Evolution[] = [];
  loading: boolean = false;
  // Filtros
  searchTerm: string = '';
  selectedProfessional: string = '';
  selectedActivity: string = '';
  // Listas para dropdowns
  professionals: string[] = [];
  activities: string[] = [];
  // Visualização
  viewMode: 'card' | 'timeline' = 'timeline';
  expandedEvolutions: Set<string> = new Set();
  constructor(private evolutionService: EvolutionService) { }
  ngOnInit(): void {
    if (this.prontuario) {
      this.loadEvolutions();
    }
  }
  ngOnChanges(changes: SimpleChanges): void {
    if (changes['prontuario'] && this.prontuario) {
      this.loadEvolutions();
    }
  }
  loadEvolutions(): void {
    if (!this.prontuario) return;
    this.loading = true;
    this.evolutionService.getEvolutionsByPatient(this.prontuario).subscribe({
      next: (evolutions) => {
        this.evolutions = evolutions;
        this.filteredEvolutions = evolutions;
        this.extractFilters();
        this.loading = false;
      },
      error: (err) => {
        console.error('Erro ao carregar evoluções:', err);
        this.loading = false;
      }
    });
  }
  extractFilters(): void {
    const profSet = new Set<string>();
    const actSet = new Set<string>();
    this.evolutions.forEach(evo => {
      if (evo.profissional) profSet.add(evo.profissional);
      if (evo.atividade) actSet.add(evo.atividade);
    });
    this.professionals = Array.from(profSet).sort();
    this.activities = Array.from(actSet).sort();
  }
  applyFilters(): void {
    this.filteredEvolutions = this.evolutions.filter(evo => {
      const matchSearch = !this.searchTerm ||
        (evo.conteudo?.textoCompleto?.toLowerCase().includes(this.searchTerm.toLowerCase()) ?? false) ||
        evo.profissional.toLowerCase().includes(this.searchTerm.toLowerCase());
      const matchProfessional = !this.selectedProfessional ||
        evo.profissional === this.selectedProfessional;
      const matchActivity = !this.selectedActivity ||
        evo.atividade === this.selectedActivity;
      return matchSearch && matchProfessional && matchActivity;
    });
  }
  clearFilters(): void {
    this.searchTerm = '';
    this.selectedProfessional = '';
    this.selectedActivity = '';
    this.filteredEvolutions = [...this.evolutions];
  }
  toggleEvolution(evolutionId: string): void {
    if (this.expandedEvolutions.has(evolutionId)) {
      this.expandedEvolutions.delete(evolutionId);
    } else {
      this.expandedEvolutions.add(evolutionId);
    }
  }
  isExpanded(evolutionId: string): boolean {
    return this.expandedEvolutions.has(evolutionId);
  }
  toggleViewMode(): void {
    this.viewMode = this.viewMode === 'card' ? 'timeline' : 'card';
  }
  exportToPDF(): void {
    // Implementação futura para exportar para PDF
    console.log('Exportar para PDF');
  }
  printEvolutions(): void {
    window.print();
  }
  getActivityIcon(activity: string): string {
    const activityLower = activity.toLowerCase();
    if (activityLower.includes('medico')) return 'pi-user-edit';
    if (activityLower.includes('enfermagem')) return 'pi-heart';
    if (activityLower.includes('fisio')) return 'pi-directions';
    if (activityLower.includes('nutri')) return 'pi-apple';
    return 'pi-file-edit';
  }
  getActivityColor(activity: string): string {
    const activityLower = activity.toLowerCase();
    if (activityLower.includes('medico')) return '#3b82f6';
    if (activityLower.includes('enfermagem')) return '#10b981';
    if (activityLower.includes('fisio')) return '#f59e0b';
    if (activityLower.includes('nutri')) return '#8b5cf6';
    return '#6b7280';
  }
}

