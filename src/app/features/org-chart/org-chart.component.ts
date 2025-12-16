import {
  Component,
  OnInit,
  OnDestroy,
  AfterViewChecked,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  ViewChild,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CdkDragDrop, DragDropModule } from '@angular/cdk/drag-drop';
import { Subject, takeUntil, Observable } from 'rxjs';

import { OrgChartDataService } from '../../core/services/org-chart-data.service';
import { OrgChartNodeService } from '../../core/services/org-chart-node.service';
import { OrgChartConnectionService } from '../../core/services/org-chart-connection.service';

import {
  Level,
  Node,
  NodePosition,
  PendingMove,
  Position,
  SVGPath,
  DragDropPayload,
} from '../../core/models/org-chart.model';

import { PositionPanelComponent } from './components/position-panel/position-panel.component';
import { ChartCanvasComponent } from './components/chart-canvas/chart-canvas.component';
import { AddPositionDialogComponent } from './components/dialogs/add-position-dialog.component';
import { SelectParentDialogComponent } from './components/dialogs/select-parent-dialog.component';
import { ConfirmMoveDialogComponent } from './components/dialogs/confirm-move-dialog.component';
import { ConfirmDeleteDialogComponent } from './components/dialogs/confirm-delete-dialog.component';
import { ConfirmReplaceDialogComponent } from './components/dialogs/confirm-replace-dialog.component';

@Component({
  selector: 'app-org-chart',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    DragDropModule,
    PositionPanelComponent,
    ChartCanvasComponent,
    AddPositionDialogComponent,
    SelectParentDialogComponent,
    ConfirmMoveDialogComponent,
    ConfirmDeleteDialogComponent,
    ConfirmReplaceDialogComponent,
  ],
  template: `
    <div class="min-h-screen bg-gray-50 p-3 sm:p-6">
      <div class="max-w-7xl mx-auto">
        <h1 class="text-2xl sm:text-3xl font-bold text-gray-800 mb-4 sm:mb-6">
          ระบบผังองค์กร (Move & Cascade)
        </h1>

        <div cdkDropListGroup class="grid grid-cols-1 lg:grid-cols-4 gap-4 sm:gap-6">
          <!-- Position Panel -->
          <app-position-panel
            [positions]="(positions$ | async) ?? []"
            (onAddClick)="openAddPositionDialog()"
          />

          <!-- Main Chart Area -->
          <div class="lg:col-span-3 space-y-4">
            <!-- Chart Canvas -->
            <app-chart-canvas
              #chartCanvas
              [levels]="(levels$ | async) ?? []"
              [hoveredNodeId]="hoveredNodeId"
              [dragOverNodeId]="dragOverNodeId"
              [dropTargetLevelId]="dropTargetLevelId"
              [svgPaths]="svgPaths"
              (onLevelDrop)="onLevelDrop($event)"
              (onNodeDropped)="onNodeDropped($event)"
              (onNodeDragEnter)="onNodeDragEnter($event)"
              (onDragExited)="onDragExited()"
              (onNodeHover)="onNodeHover($event)"
              (onDragStart)="onDragStart()"
              (onNodeDelete)="onNodeDelete($event)"
              (onNodePositionsUpdated)="onNodePositionsUpdated($event)"
            />

            <!-- Add Level Button -->
            <button
              (click)="addLevel()"
              class="w-full py-3 bg-green-500 text-white rounded-lg hover:bg-green-600 font-semibold transition-colors text-sm sm:text-base"
            >
              + เพิ่ม Level
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Add Position Dialog -->
    <app-add-position-dialog
      *ngIf="showAddPositionDialog"
      [newPosition]="newPosition"
      (onAddPosition)="addPosition($event)"
      (onCancel)="closeAddPositionDialog()"
    />

    <!-- Select Parent Dialog -->
    <app-select-parent-dialog
      *ngIf="showSelectParentDialog"
      [parents]="possibleParents"
      (onParentSelected)="confirmParentSelection($event)"
      (onCancel)="cancelMove()"
    />

    <!-- Confirm Move Dialog -->
    <app-confirm-move-dialog
      *ngIf="showConfirmMoveDialog && pendingMove"
      [pendingMove]="pendingMove"
      [childrenCount]="getChildrenCount(pendingMove.sourceNode.id)"
      (onConfirm)="executePendingMove()"
      (onCancel)="cancelMove()"
    />

    <!-- Confirm Delete Dialog -->
    <app-confirm-delete-dialog
      *ngIf="showConfirmDeleteDialog && nodeToDelete"
      [node]="findNodeById(nodeToDelete.nodeId) ?? null"
      [childrenCount]="getChildrenCount(nodeToDelete.nodeId)"
      (onConfirm)="executeDelete()"
      (onCancel)="cancelDelete()"
    />

    <!-- Confirm Replace Dialog -->
    <app-confirm-replace-dialog
      *ngIf="showConfirmReplaceDialog && nodeToReplace"
      [sourceNode]="nodeToReplace.sourceNode"
      [targetNode]="nodeToReplace.targetNode"
      (onConfirm)="executeReplace()"
      (onCancel)="cancelReplace()"
    />
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

      ::ng-deep .cdk-drop-list-dragging .cdk-drag {
        transition: transform 250ms cubic-bezier(0, 0, 0.2, 1);
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OrgChartComponent implements OnInit, OnDestroy, AfterViewChecked {
  @ViewChild('chartCanvas') chartCanvas!: ChartCanvasComponent;

  // Internal State
  private nodePositions: { [key: number]: NodePosition } = {};
  private draggedData: DragDropPayload | null = null;
  private dropTargetLevel: Level | null = null;
  private needsUpdate = false;
  private lastMousePos = { x: 0, y: 0 };
  private mouseMoveListener: ((e: MouseEvent) => void) | null = null;
  private destroy$ = new Subject<void>();

  constructor(
    private dataService: OrgChartDataService,
    private nodeService: OrgChartNodeService,
    private connectionService: OrgChartConnectionService,
    private cdr: ChangeDetectorRef,
  ) {}

  // Observable Streams
  levels$: Observable<Level[]> = new Observable();
  positions$: Observable<Position[]> = new Observable();

  // View State
  hoveredNodeId: number | null = null;
  dragOverNodeId: number | null = null;
  dropTargetLevelId: number | null = null;
  svgPaths: SVGPath[] = [];

  // Dialog States
  showAddPositionDialog = false;
  showSelectParentDialog = false;
  showConfirmMoveDialog = false;
  showConfirmDeleteDialog = false;
  showConfirmReplaceDialog = false;

  // Data Models
  newPosition: Position = { id: 0, name: '', color: '#3b82f6' };
  possibleParents: Node[] = [];
  pendingMove: PendingMove | null = null;
  nodeToDelete: { nodeId: number; levelId: number } | null = null;
  nodeToReplace: { sourceNode: Node; targetNode: Node } | null = null;

  ngOnInit(): void {
    this.levels$ = this.dataService.levels$;
    this.positions$ = this.dataService.positions$;

    this.setupMouseTracking();
    this.setupWindowResize();
    this.cdr.markForCheck();
  }

  ngAfterViewChecked(): void {
    if (this.needsUpdate) {
      this.needsUpdate = false;
      setTimeout(() => this.updateConnections(), 50);
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.cleanupMouseTracking();
  }

  private setupMouseTracking(): void {
    this.mouseMoveListener = (e: MouseEvent) => {
      this.lastMousePos = { x: e.clientX, y: e.clientY };
    };
    window.addEventListener('mousemove', this.mouseMoveListener);
  }

  private cleanupMouseTracking(): void {
    if (this.mouseMoveListener) {
      window.removeEventListener('mousemove', this.mouseMoveListener);
    }
  }

  private setupWindowResize(): void {
    window.addEventListener('resize', () => {
      this.updateConnections();
    });
  }

  private updateConnections(): void {
    this.svgPaths = this.connectionService.generatePaths(this.nodePositions, this.hoveredNodeId);
    this.cdr.markForCheck();
  }

  onNodePositionsUpdated(positions: { [key: number]: NodePosition }): void {
    this.nodePositions = positions;
    this.updateConnections();
  }

  openAddPositionDialog(): void {
    this.newPosition = { id: 0, name: '', color: '#3b82f6' };
    this.showAddPositionDialog = true;
    this.cdr.markForCheck();
  }

  closeAddPositionDialog(): void {
    this.showAddPositionDialog = false;
    this.cdr.markForCheck();
  }

  addPosition(position: Position): void {
    if (position.name.trim()) {
      const newPos: Position = { ...position, id: Date.now() };
      this.dataService.addPosition(newPos);
      this.closeAddPositionDialog();
    }
  }

  onLevelDrop(event: { event: CdkDragDrop<Level>; levelId: number }): void {
    const { event: dropEvent, levelId } = event;
    const dragData = dropEvent.item.data as DragDropPayload;

    const targetNode = this.chartCanvas.findNodeAtMousePosition(levelId);

    if (targetNode) {
      // --- REPLACE LOGIC ---
      let sourceNode: Node;
      if (dragData.type === 'POSITION') {
        const position = dragData.data as Position;
        sourceNode = {
          id: position.id,
          positionId: position.id,
          name: position.name,
          color: position.color,
          parentId: null,
          levelId: 0, // Will be updated on replace
        };
      } else {
        sourceNode = dragData.data as Node;
      }

      if (sourceNode.id === targetNode.id) {
        this.cancelMove();
        return;
      }

      // [CORRECTED] Circular dependency check for replacement
      if (
        dragData.type === 'NODE' &&
        this.dataService.isDescendantOf(sourceNode.id, targetNode.id)
      ) {
        alert('ไม่สามารถแทนที่ได้: Node ที่จะนำไปแทนที่เป็นลูกของ Node ที่ถูกแทนที่');
        this.cancelMove();
        return;
      }

      this.nodeToReplace = { sourceNode, targetNode };
      this.showConfirmReplaceDialog = true;
      this.cdr.markForCheck();
    } else {
      // --- MOVE/ADD LOGIC (Original Flow) ---
      if (dropEvent.previousContainer === dropEvent.container) return;

      this.draggedData = dragData;
      this.dropTargetLevelId = levelId;
      this.dropTargetLevel = this.dataService.findLevel(levelId) || null;

      if (dragData.type === 'POSITION') {
        this.handlePositionDrop(dragData.data as Position, levelId);
      } else if (dragData.type === 'NODE') {
        this.handleNodeDrop(dragData.data as Node, levelId);
      }
    }
  }

  private handlePositionDrop(position: Position, levelId: number): void {
    if (levelId === 1) {
      this.createNodeFromPosition(levelId, null, position);
    } else {
      const previousLevel = this.dataService.findLevel(levelId - 1);
      if (!previousLevel || previousLevel.nodes.length === 0) {
        alert('ไม่สามารถเพิ่มได้: Level ก่อนหน้าไม่มี Parent Nodes');
        this.cancelMove();
        return;
      }
      this.possibleParents = previousLevel.nodes;
      this.draggedData = { type: 'POSITION', data: position };
      this.dropTargetLevelId = levelId;
      this.showSelectParentDialog = true;
      this.cdr.markForCheck();
    }
  }

  private handleNodeDrop(sourceNode: Node, targetLevelId: number): void {
    if (sourceNode.levelId === targetLevelId) return;
    this.initiateMoveNode(sourceNode, targetLevelId);
  }

  onNodeDropped(event: { event: CdkDragDrop<any>; node: Node }): void {
    // This logic is now handled by onLevelDrop with mouse position checking.
    // We keep the event binding to prevent errors, but the function is now a no-op for replacements.
    this.dragOverNodeId = null;
    this.cdr.markForCheck();
  }

  executeReplace(): void {
    if (!this.nodeToReplace) return;

    const { sourceNode, targetNode } = this.nodeToReplace;

    this.pendingMove = {
      sourceNode,
      targetLevelId: targetNode.levelId,
      targetParentId: targetNode.parentId,
      actionType: 'REPLACE',
      targetReplaceNodeId: targetNode.id,
    };

    this.executePendingMove();
    this.cancelReplace(); // Clean up immediately
  }

  cancelReplace(): void {
    this.showConfirmReplaceDialog = false;
    this.nodeToReplace = null;
    this.dragOverNodeId = null; // Also clear any visual indicators
    this.cdr.markForCheck();
  }

  onNodeDragEnter(nodeId: number): void {
    this.dragOverNodeId = nodeId;
    this.cdr.markForCheck();
  }

  onDragExited(): void {
    this.dragOverNodeId = null;
    this.cdr.markForCheck();
  }

  onNodeHover(nodeId: number | null): void {
    this.hoveredNodeId = nodeId;
    this.updateConnections();
    this.cdr.markForCheck();
  }

  onDragStart(): void {
    this.hoveredNodeId = null;
    this.cdr.markForCheck();
  }

  private initiateMoveNode(sourceNode: Node, targetLevelId: number): void {
    if (targetLevelId === 1) {
      this.pendingMove = {
        sourceNode,
        targetLevelId: 1,
        targetParentId: null,
        actionType: 'MOVE',
      };
      this.showConfirmMoveDialog = true;
    } else {
      const previousLevel = this.dataService.findLevel(targetLevelId - 1);
      if (!previousLevel || previousLevel.nodes.length === 0) {
        alert('ไม่สามารถย้ายได้: ไม่มี Parent Node ใน Level ก่อนหน้า');
        this.cancelMove();
        return;
      }
      this.possibleParents = previousLevel.nodes.filter((p) => p.id !== sourceNode.id);
      this.draggedData = { type: 'NODE', data: sourceNode };
      this.dropTargetLevelId = targetLevelId;
      this.showSelectParentDialog = true;
    }
    this.cdr.markForCheck();
  }

  confirmParentSelection(parentId: number): void {
    if (!this.draggedData) return;
    const sourceData = this.draggedData.data;

    // Correct circular dependency check:
    // - Check if the new parent (parentId) is a descendant of the node being moved (sourceData.id)
    if (
      this.draggedData.type === 'NODE' &&
      this.dataService.isDescendantOf(parentId, (sourceData as Node).id)
    ) {
      alert('ไม่สามารถเลือก Node นี้เป็น Parent ได้ เนื่องจากเป็นลูกหลานของ Node ที่กำลังย้าย');
      return;
    }

    if (this.draggedData.type === 'NODE') {
      this.pendingMove = {
        sourceNode: sourceData as Node,
        targetLevelId: this.dropTargetLevelId!,
        targetParentId: parentId,
        actionType: 'MOVE',
      };
      this.showSelectParentDialog = false;
      this.showConfirmMoveDialog = true;
    } else if (this.draggedData.type === 'POSITION') {
      this.createNodeFromPosition(this.dropTargetLevelId!, parentId, sourceData as Position);
    }
    this.cdr.markForCheck();
  }

  private createNodeFromPosition(
    levelId: number,
    parentId: number | null,
    position: Position,
  ): void {
    const newNode: Node = {
      id: Date.now(),
      positionId: position.id,
      name: position.name,
      color: position.color,
      parentId,
      levelId,
    };
    this.dataService.addNodeToLevel(levelId, newNode);
    this.dataService.organizeNodesInLevel(levelId);
    this.needsUpdate = true;
    setTimeout(() => {
      this.updateConnections();
    }, 0);
    this.cancelMove();
  }

  executePendingMove(): void {
    if (!this.pendingMove) return;
    try {
      if (this.pendingMove.actionType === 'REPLACE') {
        this.nodeService.executeReplace(this.pendingMove);
      } else {
        this.nodeService.executeMove(this.pendingMove);
      }
      this.needsUpdate = true;
    } catch (error) {
      console.error('Error executing move:', error);
      alert('เกิดข้อผิดพลาดในการย้าย Node');
    }
    this.cancelMove();
  }

  cancelMove(): void {
    this.showSelectParentDialog = false;
    this.showConfirmMoveDialog = false;
    this.draggedData = null;
    this.dropTargetLevelId = null;
    this.dropTargetLevel = null;
    this.pendingMove = null;
    this.dragOverNodeId = null;
    this.cdr.markForCheck();
  }

  onNodeDelete(event: { nodeId: number; levelId: number }): void {
    this.nodeToDelete = event;
    this.showConfirmDeleteDialog = true;
    this.cdr.markForCheck();
  }

  cancelDelete(): void {
    this.showConfirmDeleteDialog = false;
    this.nodeToDelete = null;
    this.cdr.markForCheck();
  }

  executeDelete(): void {
    if (!this.nodeToDelete) return;
    this.nodeService.deleteNodeRecursively(this.nodeToDelete.nodeId);
    this.needsUpdate = true;
    this.cancelDelete();
  }

  addLevel(): void {
    this.dataService.addLevel();
    this.cdr.markForCheck();
  }

  getChildrenCount(nodeId: number): number {
    return this.dataService.getChildrenCount(nodeId);
  }

  findNodeById(nodeId: number): Node | null {
    return this.dataService.findNode(nodeId) ?? null;
  }
}
