import { Component, Input, Output, EventEmitter, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Node } from '../../../../core/models/index';

@Component({
  selector: 'app-confirm-replace-dialog',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div
      class="fixed inset-0 bg-black bg-opacity-50 z-40 flex items-center justify-center"
      (click)="onCancel.emit()"
    >
      <div
        class="bg-white rounded-lg shadow-2xl p-6 sm:p-8 w-11/12 max-w-md"
        (click)="$event.stopPropagation()"
      >
        <h2 class="text-xl sm:text-2xl font-bold text-gray-800 mb-4">ยืนยันการแทนที่ตำแหน่ง</h2>
        <p class="text-gray-600 mb-6 text-sm sm:text-base">คุณต้องการแทนที่ตำแหน่งใช่หรือไม่?</p>

        <div class="space-y-4 mb-8 text-sm sm:text-base">
          <div class="bg-red-50 border border-red-200 p-3 rounded-lg flex items-center">
            <div
              class="w-8 h-8 rounded-full mr-3 flex-shrink-0"
              [style.backgroundColor]="targetNode?.color"
            ></div>
            <div class="flex-grow">
              <span class="font-semibold text-red-800">ตำแหน่งที่จะถูกแทนที่:</span>
              <span class="text-red-700 ml-2">{{ targetNode?.name }}</span>
            </div>
          </div>
          <div class="bg-green-50 border border-green-200 p-3 rounded-lg flex items-center">
            <div
              class="w-8 h-8 rounded-full mr-3 flex-shrink-0"
              [style.backgroundColor]="sourceNode?.color"
            ></div>
            <div class="flex-grow">
              <span class="font-semibold text-green-800">ตำแหน่งใหม่:</span>
              <span class="text-green-700 ml-2">{{ sourceNode?.name }}</span>
            </div>
          </div>
        </div>

        <div
          class="text-xs sm:text-sm bg-yellow-50 border border-yellow-200 text-yellow-800 p-3 rounded-lg mb-6"
        >
          <strong>หมายเหตุ:</strong>
          <ul class="list-disc list-inside mt-1">
            <li>
              พนักงานในตำแหน่ง
              <strong class="font-semibold">{{ targetNode?.name }}</strong>
              จะถูกย้ายไปอยู่ใต้
              <strong class="font-semibold">{{ sourceNode?.name }}</strong>
            </li>
            <li>
              ตำแหน่งเดิมของ
              <strong class="font-semibold">{{ sourceNode?.name }}</strong>
              จะว่างลง
            </li>
          </ul>
        </div>

        <div class="flex justify-end space-x-3">
          <button
            (click)="onCancel.emit()"
            class="px-4 py-2 rounded-lg bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold transition-colors text-sm sm:text-base"
          >
            ยกเลิก
          </button>
          <button
            (click)="onConfirm.emit()"
            class="px-4 py-2 rounded-lg bg-purple-600 hover:bg-purple-700 text-white font-semibold transition-colors text-sm sm:text-base"
          >
            ยืนยันการแทนที่
          </button>
        </div>
      </div>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ConfirmReplaceDialogComponent {
  @Input() sourceNode: Node | null = null;
  @Input() targetNode: Node | null = null;

  @Output() onConfirm = new EventEmitter<void>();
  @Output() onCancel = new EventEmitter<void>();
}
