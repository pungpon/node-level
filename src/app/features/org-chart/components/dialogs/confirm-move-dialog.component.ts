import { Component, Input, Output, EventEmitter, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PendingMove, Node } from '../../../../core/models/org-chart.model';
import { OrgChartDataService } from '../../../../core/services/org-chart-data.service';

/**
 * ConfirmMoveDialogComponent - Dialog สำหรับยืนยันการย้าย/แทนที่ Node
 * ความรับผิดชอบ:
 * - แสดงรายละเอียดการย้าย/แทนที่
 * - ปุ่มยืนยัน/ยกเลิก
 */
@Component({
  selector: 'app-confirm-move-dialog',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div class="bg-white rounded-lg p-6 w-full max-w-md shadow-2xl">
        <h2
          class="text-xl font-semibold mb-2"
          [ngClass]="pendingMove.actionType === 'REPLACE' ? 'text-orange-600' : 'text-blue-600'"
        >
          {{ pendingMove.actionType === 'REPLACE' ? 'ยืนยันการแทนที่ โหนด' : 'ยืนยันการย้าย โหนด' }}
        </h2>

        <div class="bg-gray-100 p-4 rounded mb-4 text-sm space-y-3">
          <!-- REPLACE Action -->
          <div
            *ngIf="pendingMove.actionType === 'REPLACE'"
            class="border-l-4 border-orange-500 pl-3"
          >
            <p class="font-semibold text-gray-700 mb-2">ระบบแทนที่:</p>
            <div class="space-y-2">
              <div class="grid grid-cols-3 gap-2">
                <span class="font-bold text-gray-600">เอา Node:</span>
                <span class="col-span-2 font-medium" [style.color]="pendingMove.sourceNode.color">
                  {{ pendingMove.sourceNode.name }}
                </span>
              </div>
              <div class="grid grid-cols-3 gap-2">
                <span class="font-bold text-gray-600">แทนที่:</span>
                <span class="col-span-2">Level {{ pendingMove.targetLevelId }}</span>
              </div>
              <div class="grid grid-cols-3 gap-2 bg-orange-100 p-2 rounded">
                <span class="font-bold text-gray-700">ผลลัพธ์:</span>
                <span class="col-span-2 text-orange-700">
                  • เฉพาะโหนดเดียวเปลี่ยน<br />
                  • ลูกน้องคงที่ (ไม่ถูกย้าย)<br />
                  • ข้อมูลอื่นไม่เปลี่ยน
                </span>
              </div>
            </div>
          </div>

          <!-- MOVE Action -->
          <div *ngIf="pendingMove.actionType === 'MOVE'" class="border-l-4 border-blue-500 pl-3">
            <p class="font-semibold text-gray-700 mb-2">ระบบย้าย:</p>
            <div class="space-y-2">
              <div class="grid grid-cols-3 gap-2">
                <span class="font-bold text-gray-600">ย้าย Node:</span>
                <span class="col-span-2 font-medium" [style.color]="pendingMove.sourceNode.color">
                  {{ pendingMove.sourceNode.name }}
                </span>
              </div>
              <div class="grid grid-cols-3 gap-2">
                <span class="font-bold text-gray-600">ไปยัง:</span>
                <span class="col-span-2">Level {{ pendingMove.targetLevelId }}</span>
              </div>
              <div class="grid grid-cols-3 gap-2 bg-blue-100 p-2 rounded">
                <span class="font-bold text-gray-700">ผลลัพธ์:</span>
                <span class="col-span-2 text-blue-700">
                  {{ childrenCount }} โหนด<br />
                  จะถูกย้ายตามไปด้วย
                </span>
              </div>
            </div>
          </div>
        </div>

        <div class="flex gap-3">
          <button
            (click)="onConfirm.emit()"
            [ngClass]="
              pendingMove.actionType === 'REPLACE'
                ? 'bg-orange-600 hover:bg-orange-700'
                : 'bg-blue-600 hover:bg-blue-700'
            "
            class="flex-1 py-2 text-white rounded font-medium transition-colors"
          >
            {{ pendingMove.actionType === 'REPLACE' ? 'แทนที่ Node' : 'ย้าย Node' }}
          </button>
          <button
            (click)="onCancel.emit()"
            class="flex-1 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 transition-colors"
          >
            ยกเลิก
          </button>
        </div>
      </div>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ConfirmMoveDialogComponent {
  @Input() pendingMove!: PendingMove;
  @Input() childrenCount = 0;

  @Output() onConfirm = new EventEmitter<void>();
  @Output() onCancel = new EventEmitter<void>();
}
