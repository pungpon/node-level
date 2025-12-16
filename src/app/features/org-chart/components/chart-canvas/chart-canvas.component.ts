import {
  Component,
  Input,
  Output,
  EventEmitter,
  ViewChild,
  ElementRef,
  AfterViewInit,
  OnDestroy,
  OnChanges,
  SimpleChanges,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { DragDropModule, CdkDragDrop } from '@angular/cdk/drag-drop';
import { Level, Node, SVGPath, NodePosition } from '../../../../core/models/org-chart.model';
import { OrgChartConnectionService } from '../../../../core/services/org-chart-connection.service';
import { NodeItemComponent } from '../node-item/node-item.component';

/**
 * ChartCanvasComponent - แสดงผลแผนภูมิองค์กร
 * ความรับผิดชอบ:
 * - แสดง Levels และ Nodes
 * - วาดเส้นเชื่อมระหว่าง Nodes
 * - จัดการ Drag & Drop บน Canvas
 * - คำนวณตำแหน่ง Nodes
 */
@Component({
  selector: 'app-chart-canvas',
  standalone: true,
  imports: [CommonModule, DragDropModule, NodeItemComponent],
  template: `
    <div #chartRef class="relative">
      <!-- SVG Connections Layer -->
      <svg class="absolute top-0 left-0 w-full h-full pointer-events-none" style="z-index: 10;">
        <ng-container *ngFor="let path of svgPaths">
          <path
            [attr.d]="path.d"
            [attr.stroke]="path.stroke"
            [attr.stroke-width]="path.strokeWidth"
            fill="none"
            class="transition-all duration-200"
            [attr.opacity]="path.opacity"
          />
          <circle
            *ngIf="path.circle"
            [attr.cx]="path.circle.cx"
            [attr.cy]="path.circle.cy"
            [attr.r]="path.circle.r"
            [attr.fill]="path.circle.fill"
            class="transition-all duration-200"
          />
        </ng-container>
      </svg>

      <!-- Levels and Nodes Layer -->
      <div class="space-y-6 relative" style="z-index: 1;">
        <div *ngFor="let level of levels" class="bg-white rounded-lg shadow p-4">
          <div class="flex justify-between items-center mb-3">
            <h3 class="text-base sm:text-lg font-semibold text-gray-700">
              {{ level.name }}
            </h3>
          </div>

          <div
            cdkDropList
            [cdkDropListData]="level"
            (cdkDropListDropped)="onLevelDrop.emit({ event: $event, levelId: level.id })"
            [class.border-blue-500]="dropTargetLevelId === level.id"
            [class.bg-blue-50]="dropTargetLevelId === level.id"
            class="min-h-28 border-2 border-dashed rounded-lg p-4 transition-colors border-gray-300"
          >
            <div class="flex flex-wrap justify-center gap-6">
              <app-node-item
                *ngFor="let node of level.nodes"
                [node]="node"
                [isHovered]="hoveredNodeId === node.id"
                [isDragOver]="dragOverNodeId === node.id"
                [isInFamily]="isNodeInFamily(node.id)"
                (onDragStarted)="onDragStart.emit($event)"
                (onDroppedOnNode)="onNodeDropped.emit({ event: $event, node })"
                (onDragEntered)="onNodeDragEnter.emit(node.id)"
                (onDragExited)="onNodeDragExit.emit()"
                (onMouseEnter)="onNodeHover.emit($event)"
                (onMouseLeave)="onNodeHover.emit(null)"
                (onDeleteClick)="onNodeDelete.emit({ nodeId: $event, levelId: level.id })"
              />
            </div>
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
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ChartCanvasComponent implements AfterViewInit, OnDestroy, OnChanges {
  @ViewChild('chartRef', { read: ElementRef }) chartRef!: ElementRef;

  @Input() levels: Level[] = [];
  @Input() hoveredNodeId: number | null = null;
  @Input() dragOverNodeId: number | null = null;
  @Input() dropTargetLevelId: number | null = null;
  @Input() svgPaths: SVGPath[] = [];

  @Output() onLevelDrop = new EventEmitter<{ event: CdkDragDrop<Level>; levelId: number }>();
  @Output() onNodeDropped = new EventEmitter<{ event: CdkDragDrop<any>; node: Node }>();
  @Output() onNodeDragEnter = new EventEmitter<number>();
  @Output() onNodeDragExit = new EventEmitter<void>();
  @Output() onNodeHover = new EventEmitter<number | null>();
  @Output() onDragStart = new EventEmitter<Node>();
  @Output() onNodeDelete = new EventEmitter<{ nodeId: number; levelId: number }>();
  @Output() onNodePositionsUpdated = new EventEmitter<{ [key: number]: NodePosition }>();

  private resizeObserver?: ResizeObserver;
  private lastMousePos = { x: 0, y: 0 };
  private mouseMoveListener: ((e: MouseEvent) => void) | null = null;

  constructor(
    private connectionService: OrgChartConnectionService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngAfterViewInit(): void {
    this.setupMouseTracking();
    this.setupResizeObserver();
    setTimeout(() => this.updateNodePositions(), 0);
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['levels'] && !changes['levels'].firstChange) {
      // อัพเดตตำแหน่ง nodes เมื่อ levels มีการเปลี่ยนแปลง
      setTimeout(() => this.updateNodePositions(), 0);
    }
  }

  ngOnDestroy(): void {
    this.cleanupMouseTracking();
    this.resizeObserver?.disconnect();
  }

  /**
   * ตั้งค่า Mouse tracking เพื่อจับตำแหน่งการ drop
   */
  private setupMouseTracking(): void {
    this.mouseMoveListener = (e: MouseEvent) => {
      this.lastMousePos = { x: e.clientX, y: e.clientY };
    };
    window.addEventListener('mousemove', this.mouseMoveListener);
  }

  /**
   * ยกเลิก Mouse tracking
   */
  private cleanupMouseTracking(): void {
    if (this.mouseMoveListener) {
      window.removeEventListener('mousemove', this.mouseMoveListener);
    }
  }

  /**
   * ตั้งค่า Resize Observer เพื่ออัปเดตตำแหน่ง Nodes เมื่อมีการเปลี่ยนขนาด
   */
  private setupResizeObserver(): void {
    if (typeof ResizeObserver === 'undefined') return;

    this.resizeObserver = new ResizeObserver(() => {
      this.updateNodePositions();
    });

    if (this.chartRef?.nativeElement) {
      this.resizeObserver.observe(this.chartRef.nativeElement);
    }
  }

  /**
   * อัปเดตตำแหน่งของ Nodes บนหน้าจอ
   */
  updateNodePositions(): void {
    const positions: { [key: number]: NodePosition } = {};

    this.levels.forEach((level) => {
      level.nodes.forEach((node) => {
        const element = document.getElementById(`node-${node.id}`);
        if (element && this.chartRef?.nativeElement) {
          const rect = element.getBoundingClientRect();
          const containerRect = this.chartRef.nativeElement.getBoundingClientRect();

          positions[node.id] = {
            x: rect.left - containerRect.left + rect.width / 2,
            y: rect.top - containerRect.top + rect.height / 2,
            width: rect.width,
            height: rect.height,
          };
        }
      });
    });

    this.onNodePositionsUpdated.emit(positions);
    this.cdr.markForCheck();
  }

  /**
   * ตรวจสอบว่า Node อยู่ในครอบครัวของ hoveredNodeId หรือไม่
   */
  isNodeInFamily(nodeId: number): boolean {
    if (!this.hoveredNodeId) return false;
    if (this.hoveredNodeId === nodeId) return false;

    // ตรวจสอบว่า nodeId เป็นลูกหลานของ hoveredNodeId
    return this.isDescendant(nodeId, this.hoveredNodeId);
  }

  /**
   * ตรวจสอบว่า childId เป็นลูกหลานของ ancestorId
   */
  private isDescendant(childId: number, ancestorId: number): boolean {
    const children = this.getDirectChildren(ancestorId);
    if (children.some((c) => c.id === childId)) return true;

    for (const child of children) {
      if (this.isDescendant(childId, child.id)) return true;
    }

    return false;
  }

  /**
   * ดึงลูกหลานตรงของ Node
   */
  private getDirectChildren(parentId: number): Node[] {
    const children: Node[] = [];
    this.levels.forEach((level) => {
      level.nodes.forEach((node) => {
        if (node.parentId === parentId) {
          children.push(node);
        }
      });
    });
    return children;
  }

  /**
   * หา Node ที่อยู่ใกล้กับตำแหน่งเมาส์ที่สุด
   */
  findNodeAtMousePosition(levelId: number): Node | null {
    const level = this.levels.find((l) => l.id === levelId);
    if (!level || !level.nodes.length) return null;

    let closestNode: Node | null = null;
    let closestDistance = Infinity;

    level.nodes.forEach((node) => {
      const nodeElement = document.getElementById(`node-${node.id}`);
      if (!nodeElement) return;

      const rect = nodeElement.getBoundingClientRect();
      const nodeCenterX = rect.left + rect.width / 2;
      const nodeCenterY = rect.top + rect.height / 2;

      const dx = nodeCenterX - this.lastMousePos.x;
      const dy = nodeCenterY - this.lastMousePos.y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      // ตรวจสอบว่าเมาส์อยู่ในขอบเขต Node
      if (
        this.lastMousePos.x >= rect.left &&
        this.lastMousePos.x <= rect.right &&
        this.lastMousePos.y >= rect.top &&
        this.lastMousePos.y <= rect.bottom
      ) {
        if (distance < closestDistance) {
          closestDistance = distance;
          closestNode = node;
        }
      }
    });

    return closestNode;
  }

  /**
   * ดึง Mouse position ที่เก็บไว้
   */
  getLastMousePos(): { x: number; y: number } {
    return this.lastMousePos;
  }
}
