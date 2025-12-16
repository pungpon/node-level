import {
  Component,
  Input,
  Output,
  EventEmitter,
  ChangeDetectionStrategy,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { DragDropModule, CdkDragDrop } from '@angular/cdk/drag-drop';
import { Node } from '../../../../core/models/org-chart.model';

/**
 * NodeItemComponent - แสดงผล Node เดี่ยว
 * ความรับผิดชอบ:
 * - แสดงข้อมูล Node
 * - จัดการ Drag & Drop
 * - ปุ่มลบ
 * - Visual feedback (highlight, hover)
 */
@Component({
  selector: 'app-node-item',
  standalone: true,
  imports: [CommonModule, DragDropModule],
  template: `
    <div
      [id]="'node-' + node.id"
      cdkDrag
      [cdkDragData]="{ type: 'NODE', data: node }"
      (cdkDragStarted)="onDragStarted.emit(node)"
      cdkDropList
      [cdkDropListData]="node"
      (cdkDropListDropped)="onDroppedOnNode.emit($event)"
      (cdkDropListEntered)="onDragEntered.emit($event)"
      (cdkDropListExited)="onDragExited.emit()"
      (mouseenter)="onMouseEnter.emit(node.id)"
      (mouseleave)="onMouseLeave.emit()"
      [class.ring-2]="isHighlighted"
      [class.ring-blue-500]="isHoveredOrDragOver"
      [class.ring-green-400]="isInFamily && !isHoveredOrDragOver"
      [class.ring-purple-500]="isDragOver"
      [class.scale-105]="isHoveredOrDragOver"
      [class.shadow-lg]="isHoveredOrDragOver"
      class="relative p-4 rounded-lg transition-all text-sm sm:text-base min-w-32 text-center cursor-move"
      [style.backgroundColor]="node.color"
      [style.color]="'white'"
    >
      {{ node.name }}

      <!-- Drag Preview -->
      <div
        *cdkDragPreview
        class="p-4 rounded-lg text-white shadow-2xl opacity-90 scale-105"
        [style.backgroundColor]="node.color"
      >
        {{ node.name }} (ย้าย)
      </div>

      <!-- Delete Button -->
      <button
        *ngIf="isHovered"
        (click)="onDeleteClick.emit(node.id); $event.stopPropagation()"
        class="absolute -top-2 -right-2 p-1 bg-red-500 rounded-full hover:bg-red-600 transition-colors shadow-lg z-20 cursor-pointer"
        title="Delete node"
      >
        <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
          />
        </svg>
      </button>

      <!-- Replace Indicator -->
      <div
        *ngIf="isDragOver"
        class="absolute inset-0 bg-purple-500 bg-opacity-30 rounded-lg flex items-center justify-center pointer-events-none"
      >
        <span class="text-xs font-bold bg-purple-600 text-white px-2 py-1 rounded shadow">
          แทนที่ / สลับ
        </span>
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
export class NodeItemComponent {
  @Input() node!: Node;
  @Input() isHovered = false;
  @Input() isDragOver = false;
  @Input() isInFamily = false;

  @Output() onDragStarted = new EventEmitter<Node>();
  @Output() onDroppedOnNode = new EventEmitter<CdkDragDrop<Node>>();
  @Output() onDragEntered = new EventEmitter<any>();
  @Output() onDragExited = new EventEmitter<void>();
  @Output() onMouseEnter = new EventEmitter<number>();
  @Output() onMouseLeave = new EventEmitter<void>();
  @Output() onDeleteClick = new EventEmitter<number>();

  get isHighlighted(): boolean {
    return this.isHovered || this.isInFamily;
  }

  get isHoveredOrDragOver(): boolean {
    return this.isHovered || this.isDragOver;
  }
}
