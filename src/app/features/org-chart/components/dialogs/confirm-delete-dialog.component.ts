import { Component, Input, Output, EventEmitter, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Node } from '../../../../core/models/org-chart.model';

/**
 * ConfirmDeleteDialogComponent - Dialog สำหรับยืนยันการลบ Node
 * ความรับผิดชอบ:
 * - แสดงข้อมูล Node ที่จะถูกลบ
 * - แสดงจำนวนลูกหลานที่จะถูกลบด้วย
 * - ปุ่มยืนยัน/ยกเลิก
 */
@Component({
  selector: 'app-confirm-delete-dialog',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div class="bg-white rounded-lg p-6 w-full max-w-md">
        <h2 class="text-xl font-semibold mb-4 text-red-600">ยืนยันการลบ</h2>
        <div class="bg-red-50 border border-red-200 rounded p-4 mb-6">
          <p class="text-gray-700 mb-3">ต้องการลบ Node นี้ใช่หรือไม่?</p>
          <p class="text-sm text-gray-600 font-medium mb-2">
            Node: <span class="font-bold" [style.color]="node?.color">{{ node?.name }}</span>
          </p>
          <p class="text-sm text-red-600">⚠️ โหนดทั้งหมด {{ childrenCount }} จะถูกลบไปด้วย</p>
        </div>

        <div class="flex gap-3">
          <button
            (click)="onConfirm.emit()"
            class="flex-1 py-2 bg-red-500 text-white rounded hover:bg-red-600 font-medium transition-colors"
          >
            ลบ
          </button>
          <button
            (click)="onCancel.emit()"
            class="flex-1 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400 transition-colors"
          >
            ยกเลิก
          </button>
        </div>
      </div>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ConfirmDeleteDialogComponent {
  @Input() node: Node | null = null;
  @Input() childrenCount = 0;

  @Output() onConfirm = new EventEmitter<void>();
  @Output() onCancel = new EventEmitter<void>();
}
