import { Component, Input, Output, EventEmitter, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DragDropModule } from '@angular/cdk/drag-drop';
import { Position } from '../../../../core/models/org-chart.model';

/**
 * PositionPanelComponent - แสดงรายชั้นตำแหน่งและสามารถลากมาใช้เพิ่ม Node ได้
 */
@Component({
  selector: 'app-position-panel',
  standalone: true,
  imports: [CommonModule, FormsModule, DragDropModule],
  template: `
    <div class="lg:col-span-1 bg-white rounded-lg shadow p-4">
      <div class="flex justify-between items-center mb-4">
        <h2 class="text-lg sm:text-xl font-semibold">Positions</h2>
        <button
          (click)="onAddClick.emit()"
          class="p-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
          title="Add new position"
        >
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M12 4v16m8-8H4"
            />
          </svg>
        </button>
      </div>

      <div class="space-y-2" cdkDropList [cdkDropListData]="positions">
        <div
          *ngFor="let pos of positions"
          cdkDrag
          [cdkDragData]="{ type: 'POSITION', data: pos }"
          class="p-3 rounded cursor-move hover:opacity-80 transition-opacity text-sm sm:text-base shadow-sm"
          [style.backgroundColor]="pos.color"
          [style.color]="'white'"
        >
          {{ pos.name }}
          <div
            *cdkDragPreview
            class="p-3 rounded text-white shadow-xl opacity-80"
            [style.backgroundColor]="pos.color"
          >
            {{ pos.name }}
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [
    `
      :host {
        display: block;
      }

      ::ng-deep .cdk-drag-preview {
        box-sizing: border-box;
        border-radius: 4px;
        box-shadow: 0 5px 15px rgba(0, 0, 0, 0.3);
      }

      ::ng-deep .cdk-drag-placeholder {
        opacity: 0.3;
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PositionPanelComponent {
  @Input() positions: Position[] = [];
  @Output() onAddClick = new EventEmitter<void>();
}
