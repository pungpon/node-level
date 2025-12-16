import { Component, Input, Output, EventEmitter, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Position } from '../../../../core/models/org-chart.model';

/**
 * AddPositionDialogComponent - Dialog สำหรับสร้าง Position ใหม่
 */
@Component({
  selector: 'app-add-position-dialog',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div class="bg-white rounded-lg p-6 w-full max-w-md">
        <h2 class="text-xl font-semibold mb-4">สร้าง Position</h2>
        <div class="space-y-4">
          <input
            type="text"
            [(ngModel)]="newPosition.name"
            class="w-full border rounded px-3 py-2"
            placeholder="ชื่อตำแหน่ง"
          />
          <input
            type="color"
            [(ngModel)]="newPosition.color"
            class="w-full h-10 border rounded cursor-pointer"
          />
          <div class="flex gap-2">
            <button
              (click)="onAddPosition.emit(newPosition)"
              class="flex-1 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
            >
              เพิ่ม
            </button>
            <button
              (click)="onCancel.emit()"
              class="flex-1 py-2 bg-gray-300 rounded hover:bg-gray-400"
            >
              ยกเลิก
            </button>
          </div>
        </div>
      </div>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AddPositionDialogComponent {
  @Input() newPosition: Position = { id: 0, name: '', color: '#3b82f6' };
  @Output() onAddPosition = new EventEmitter<Position>();
  @Output() onCancel = new EventEmitter<void>();
}
