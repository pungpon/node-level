import { Component, Input, Output, EventEmitter, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Node } from '../../../../core/models/org-chart.model';

/**
 * SelectParentDialogComponent - Dialog สำหรับเลือก Parent Node
 * ความรับผิดชอบ:
 * - แสดง Modal สำหรับเลือก Parent
 * - ส่ง event เมื่อเลือก Parent
 */
@Component({
  selector: 'app-select-parent-dialog',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div class="bg-white rounded-lg p-6 w-full max-w-md">
        <h2 class="text-xl font-semibold mb-4">เลือก Parent Node</h2>
        <p class="text-gray-500 text-sm mb-2">
          กรุณาเลือกหัวหน้าสำหรับ Node นี้ใน Level ก่อนหน้า
        </p>

        <div class="space-y-2 mb-4 max-h-64 overflow-y-auto">
          <button
            *ngFor="let parent of parents"
            (click)="onParentSelected.emit(parent.id)"
            class="w-full p-3 rounded text-white hover:opacity-80 transition-opacity"
            [style.backgroundColor]="parent.color"
          >
            {{ parent.name }}
          </button>
        </div>

        <button
          (click)="onCancel.emit()"
          class="w-full py-2 bg-gray-300 rounded hover:bg-gray-400"
        >
          ยกเลิก
        </button>
      </div>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SelectParentDialogComponent {
  @Input() parents: Node[] = [];
  @Output() onParentSelected = new EventEmitter<number>();
  @Output() onCancel = new EventEmitter<void>();
}
