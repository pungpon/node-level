import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { Level, Node, Position } from '../models/org-chart.model';

/**
 * OrgChartDataService
 * จัดการข้อมูลหลักของผังองค์กร
 * รับผิดชอบการจัดเก็บและเรียกดึงข้อมูล Levels, Nodes, Positions
 */
@Injectable({
  providedIn: 'root'
})
export class OrgChartDataService {
  private levelsSubject = new BehaviorSubject<Level[]>([
    { id: 1, name: 'Level 1 (Top Level)', nodes: [] },
    { id: 2, name: 'Level 2', nodes: [] }
  ]);

  private positionsSubject = new BehaviorSubject<Position[]>([
    { id: 1, name: 'CEO', color: '#3b82f6' },
    { id: 2, name: 'Manager', color: '#10b981' },
    { id: 3, name: 'Developer', color: '#f59e0b' },
    { id: 4, name: 'Designer', color: '#ef4444' },
    { id: 5, name: 'HR', color: '#8b5cf6' }
  ]);

  levels$ = this.levelsSubject.asObservable();
  positions$ = this.positionsSubject.asObservable();

  constructor() {}

  /**
   * ดึงข้อมูล Levels ปัจจุบัน
   */
  getLevels(): Level[] {
    return this.levelsSubject.getValue();
  }

  /**
   * ดึงข้อมูล Positions ปัจจุบัน
   */
  getPositions(): Position[] {
    return this.positionsSubject.getValue();
  }

  /**
   * อัปเดตรายชั้นทั้งหมด
   */
  updateLevels(levels: Level[]): void {
    this.levelsSubject.next([...levels]);
  }

  /**
   * อัปเดตตำแหน่งทั้งหมด
   */
  updatePositions(positions: Position[]): void {
    this.positionsSubject.next([...positions]);
  }

  /**
   * เพิ่ม Position ใหม่
   */
  addPosition(position: Position): void {
    const current = this.positionsSubject.getValue();
    this.positionsSubject.next([...current, position]);
  }

  /**
   * เพิ่ม Level ใหม่
   */
  addLevel(): Level {
    const levels = this.levelsSubject.getValue();
    const nextId = levels.length > 0 ? Math.max(...levels.map(l => l.id)) + 1 : 1;
    const newLevel: Level = {
      id: nextId,
      name: `Level ${nextId}`,
      nodes: []
    };
    this.levelsSubject.next([...levels, newLevel]);
    return newLevel;
  }

  /**
   * ค้นหา Node จากทุก Level
   */
  findNode(nodeId: number): Node | undefined {
    const levels = this.levelsSubject.getValue();
    for (const level of levels) {
      const found = level.nodes.find(n => n.id === nodeId);
      if (found) return found;
    }
    return undefined;
  }

  /**
   * ค้นหา Level จาก ID
   */
  findLevel(levelId: number): Level | undefined {
    const levels = this.levelsSubject.getValue();
    return levels.find(l => l.id === levelId);
  }

  /**
   * ค้นหา Position จาก ID
   */
  findPosition(positionId: number): Position | undefined {
    const positions = this.positionsSubject.getValue();
    return positions.find(p => p.id === positionId);
  }

  /**
   * ดึงลูกหลานตรงของ Node
   */
  getDirectChildren(parentId: number): Node[] {
    const levels = this.levelsSubject.getValue();
    const children: Node[] = [];
    levels.forEach(level => {
      level.nodes.forEach(node => {
        if (node.parentId === parentId) {
          children.push(node);
        }
      });
    });
    return children;
  }

  /**
   * นับจำนวนลูกหลานทั้งหมด (รวมวงศ์วานสืบ)
   */
  getChildrenCount(nodeId: number): number {
    let count = 0;
    const children = this.getDirectChildren(nodeId);
    count += children.length;
    children.forEach(child => {
      count += this.getChildrenCount(child.id);
    });
    return count;
  }

  /**
   * ตรวจสอบว่า targetId อยู่ในสายวงศ์วานสืบของ sourceId หรือไม่
   * ใช้เพื่อหลีกเลี่ยง Circular Reference
   */
  isDescendantOf(nodeId: number, potentialAncestorId: number): boolean {
    const children = this.getDirectChildren(potentialAncestorId);
    if (children.some(c => c.id === nodeId)) {
      return true;
    }
    for (const child of children) {
      if (this.isDescendantOf(nodeId, child.id)) {
        return true;
      }
    }
    return false;
  }

  /**
   * ลบ Node จากทุก Level
   */
  removeNodeFromAllLevels(nodeId: number): void {
    const levels = this.levelsSubject.getValue();
    levels.forEach(level => {
      const idx = level.nodes.findIndex(n => n.id === nodeId);
      if (idx !== -1) {
        level.nodes.splice(idx, 1);
      }
    });
    this.levelsSubject.next([...levels]);
  }

  /**
   * บันทึก Node ใหม่ลงใน Level
   */
  addNodeToLevel(levelId: number, node: Node): void {
    const levels = this.levelsSubject.getValue();
    const level = levels.find(l => l.id === levelId);
    if (level) {
      level.nodes.push(node);
      this.levelsSubject.next([...levels]);
    }
  }

  /**
   * อัปเดต Node ที่มีอยู่
   */
  updateNode(updatedNode: Node): void {
    const levels = this.levelsSubject.getValue();
    levels.forEach(level => {
      const index = level.nodes.findIndex(n => n.id === updatedNode.id);
      if (index !== -1) {
        level.nodes[index] = updatedNode;
      }
    });
    this.levelsSubject.next([...levels]);
  }

  /**
   * เรียงลำดับ Nodes ในแต่ละ Level
   */
  organizeNodesInLevel(levelId: number): void {
    const levels = this.levelsSubject.getValue();
    const level = levels.find(l => l.id === levelId);
    if (level) {
      level.nodes.sort((a, b) => (a.parentId || 0) - (b.parentId || 0));
      this.levelsSubject.next([...levels]);
    }
  }

  /**
   * เปลี่ยนความสัมพันธ์ Parent-Child
   * ใช้เมื่อมีการแทนที่ Node
   */
  reparentChildren(oldParentId: number, newParentId: number): void {
    const levels = this.levelsSubject.getValue();
    levels.forEach(level => {
      level.nodes.forEach(node => {
        if (node.parentId === oldParentId) {
          node.parentId = newParentId;
        }
      });
    });
    this.levelsSubject.next([...levels]);
  }
}
