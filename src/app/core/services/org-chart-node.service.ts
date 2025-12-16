import { Injectable } from '@angular/core';
import { Node, Level, PendingMove } from '../models/org-chart.model';
import { OrgChartDataService } from './org-chart-data.service';

/**
 * OrgChartNodeService - บริการสำหรับการดำเนินการกับ Nodes
 * ความรับผิดชอบ:
 * - ย้าย Node (MOVE action - ลูกหลานตามไป)
 * - แทนที่ Node (REPLACE action - เพียงตัวเดียว)
 * - ลบ Node (DELETE action - ลูกหลานลบไปด้วย)
 * - Validations สำหรับการดำเนินการต่างๆ
 */
@Injectable({
  providedIn: 'root',
})
export class OrgChartNodeService {
  constructor(private dataService: OrgChartDataService) {}

  /**
   * ดำเนินการย้าย Node (MOVE action)
   * ย้าย Node พร้อมลูกหลานทั้งหมด
   */
  executeMove(pendingMove: PendingMove): void {
    const { sourceNode, targetLevelId, targetParentId } = pendingMove;

    // 1. ลบจาก Level เดิม
    this.dataService.removeNodeFromAllLevels(sourceNode.id);

    // 2. อัปเดต Node ด้วยข้อมูลใหม่
    sourceNode.levelId = targetLevelId;
    sourceNode.parentId = targetParentId;

    // 3. เพิ่มไป Level ใหม่
    this.dataService.addNodeToLevel(targetLevelId, sourceNode);
    this.dataService.organizeNodesInLevel(targetLevelId);

    // 4. ย้ายลูกหลานตามไป
    this.moveChildrenRecursively(sourceNode, targetLevelId);
  }

  /**
   * ดำเนินการแทนที่ Node (REPLACE action)
   * เปลี่ยนเฉพาะตัว Node ที่ถูกแทนที่ เพียงตัวเดียว
   * ลูกหลานจะปรับความสัมพันธ์ให้ชี้ไปยัง Node ใหม่
   */
  executeReplace(pendingMove: PendingMove): void {
    const { sourceNode, targetReplaceNodeId } = pendingMove;

    if (!targetReplaceNodeId) {
      throw new Error('Target node ID is required for replace operation');
    }

    const targetLevel = this.dataService.findLevel(pendingMove.targetLevelId);
    const targetNode = targetLevel?.nodes.find((n) => n.id === targetReplaceNodeId);

    if (!targetNode || !targetLevel) {
      throw new Error('Target node or level not found');
    }

    // 1. เก็บข้อมูลตำแหน่งของ Target
    const targetParentId = targetNode.parentId;
    const targetLevelId = targetNode.levelId;

    // 2. ลบ Source Node จากที่เก่า (ถ้าเป็น Node ที่มีอยู่แล้ว)
    if (sourceNode.levelId !== 0) {
      this.dataService.removeNodeFromAllLevels(sourceNode.id);
    }

    // 3. อัปเดต Source Node เพื่อใช้ตำแหน่งของ Target
    sourceNode.levelId = targetLevelId;
    sourceNode.parentId = targetParentId;

    // 4. แทนที่ Target Node ด้วย Source Node
    const targetIndex = targetLevel.nodes.findIndex((n) => n.id === targetReplaceNodeId);
    if (targetIndex !== -1) {
      targetLevel.nodes[targetIndex] = sourceNode;
    }

    // 5. เปลี่ยนความสัมพันธ์ Parent-Child
    // ลูกของ Target Node ตั้งก่อน จะชี้ไปยัง Source Node แทน
    this.dataService.reparentChildren(targetReplaceNodeId, sourceNode.id);
    this.dataService.updateLevels(this.dataService.getLevels());
  }

  /**
   * ย้ายลูกหลานของ Node ไปยัง Level ใหม่
   * (Recursive function)
   */
  private moveChildrenRecursively(parentNode: Node, parentNewLevelId: number): void {
    const children = this.dataService.getDirectChildren(parentNode.id);
    if (children.length === 0) return;

    const childTargetLevelId = parentNewLevelId + 1;

    // สร้าง Level ใหม่ถ้ายังไม่มี
    if (!this.dataService.findLevel(childTargetLevelId)) {
      this.dataService.addLevel();
    }

    children.forEach((child) => {
      // ลบจาก Level เก่า
      this.dataService.removeNodeFromAllLevels(child.id);

      // อัปเดต
      child.levelId = childTargetLevelId;
      child.parentId = parentNode.id;

      // เพิ่มไป Level ใหม่
      this.dataService.addNodeToLevel(childTargetLevelId, child);

      // ทำต่อกับลูกของลูก
      this.moveChildrenRecursively(child, childTargetLevelId);
    });

    this.dataService.organizeNodesInLevel(childTargetLevelId);
  }

  /**
   * ลบ Node และลูกหลานทั้งหมด (Recursive)
   */
  deleteNodeRecursively(nodeId: number): void {
    const children = this.dataService.getDirectChildren(nodeId);

    // ลบลูกหลานทั้งหมดก่อน
    children.forEach((child) => {
      this.deleteNodeRecursively(child.id);
    });

    // ลบตัวเอง
    this.dataService.removeNodeFromAllLevels(nodeId);
  }

  /**
   * ตรวจสอบว่า sourceNode สามารถย้ายไป targetLevelId ได้หรือไม่
   * โดยตรวจสอบ Circular Dependency
   */
  canMoveNode(sourceNode: Node, targetLevelId: number, targetParentId: number | null): boolean {
    // ห้ามย้ายไป Level เดิมกับ Parent เดิม
    if (sourceNode.levelId === targetLevelId && sourceNode.parentId === targetParentId) {
      return false;
    }

    // ถ้าย้ายไป Level ที่สูงกว่า ตรวจสอบ Circular
    if (targetLevelId > sourceNode.levelId) {
      if (targetParentId && this.dataService.isDescendantOf(targetParentId, sourceNode.id)) {
        return false;
      }
    }

    return true;
  }

  /**
   * ตรวจสอบว่า Level ก่อนหน้ามี Parent Node ที่เพียงพอหรือไม่
   */
  hasPreviousLevelParents(targetLevelId: number): boolean {
    if (targetLevelId === 1) {
      return true; // Level 1 ไม่ต้องมี Parent
    }

    const previousLevel = this.dataService.findLevel(targetLevelId - 1);
    return previousLevel ? previousLevel.nodes.length > 0 : false;
  }

  /**
   * ดึง Parent candidates สำหรับ Node ที่ย้ายไป targetLevelId
   */
  getPossibleParents(targetLevelId: number): Node[] {
    if (targetLevelId === 1) {
      return [];
    }

    const previousLevel = this.dataService.findLevel(targetLevelId - 1);
    return previousLevel ? previousLevel.nodes : [];
  }
}
