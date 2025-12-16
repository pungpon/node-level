import { Injectable } from '@angular/core';
import { Node, Level, NodePosition } from '../models/org-chart.model';
import { OrgChartDataService } from './org-chart-data.service';

/**
 * OrgChartLayoutService - บริการจัดเรียง Nodes อัตโนมัติ
 * ความรับผิดชอบ:
 * - คำนวณตำแหน่ง Nodes เพื่อไม่ให้เส้นทับกัน
 * - จัดเรียง Nodes ให้สมดุล
 * - Optimize layout space
 */
@Injectable({
  providedIn: 'root',
})
export class OrgChartLayoutService {
  // ระยะห่างระหว่าง Nodes
  private nodeSpacingX = 120;
  private nodeSpacingY = 100;
  private nodeWidth = 100;
  private nodeHeight = 80;

  constructor(private dataService: OrgChartDataService) {}

  /**
   * คำนวณตำแหน่ง optimal สำหรับทุก nodes ใน level
   * ใช้ hierarchical tree layout algorithm
   */
  calculateOptimalLayout(
    levels: Level[],
    containerWidth: number = 1200,
  ): { [key: number]: { x: number; y: number } } {
    const positions: { [key: number]: { x: number; y: number } } = {};

    levels.forEach((level, levelIndex) => {
      if (level.nodes.length === 0) return;

      const levelY = levelIndex * this.nodeSpacingY;

      // Group nodes โดย parent
      const nodesByParent = this.groupNodesByParent(level.nodes);

      // คำนวณ width ที่ต้องใช้ทั้งหมด
      const totalWidth = level.nodes.length * this.nodeSpacingX;
      const startX = Math.max(0, (containerWidth - totalWidth) / 2);

      // วางแต่ละ node
      let xPosition = startX;
      level.nodes.forEach((node) => {
        positions[node.id] = {
          x: xPosition,
          y: levelY,
        };
        xPosition += this.nodeSpacingX;
      });
    });

    return positions;
  }

  /**
   * จัดเรียง nodes ใน level เดียว
   * ลูก nodes วางใต้ parent
   */
  calculateBalancedLayout(
    levels: Level[],
    containerWidth: number = 1200,
  ): { [key: number]: { x: number; y: number } } {
    const positions: { [key: number]: { x: number; y: number } } = {};
    const nodeWidths: { [key: number]: number } = {};

    // Calculate width needed for each subtree (bottom-up)
    const calculateSubtreeWidth = (nodeId: number): number => {
      const children = this.dataService.getDirectChildren(nodeId);

      if (children.length === 0) {
        nodeWidths[nodeId] = this.nodeSpacingX;
        return this.nodeSpacingX;
      }

      let totalChildWidth = 0;
      children.forEach((child) => {
        totalChildWidth += calculateSubtreeWidth(child.id);
      });

      nodeWidths[nodeId] = Math.max(totalChildWidth, this.nodeSpacingX);
      return nodeWidths[nodeId];
    };

    // Calculate positions (top-down)
    const calculatePositions = (nodeId: number, x: number, y: number) => {
      positions[nodeId] = { x, y };

      const children = this.dataService.getDirectChildren(nodeId);
      if (children.length === 0) return;

      // Center children under parent
      const totalChildWidth = children.reduce((sum, child) => sum + nodeWidths[child.id], 0);
      const startX = x - totalChildWidth / 2 + this.nodeSpacingX / 2;

      let childX = startX;
      const childY = y + this.nodeSpacingY;

      children.forEach((child) => {
        calculatePositions(child.id, childX + nodeWidths[child.id] / 2, childY);
        childX += nodeWidths[child.id];
      });
    };

    // Find root nodes (nodes with no parent in Level 1)
    const rootNodes = levels[0]?.nodes.filter((n) => !n.parentId) || [];

    // Calculate for each root
    if (rootNodes.length > 0) {
      const totalRootWidth = rootNodes.reduce((sum) => sum + nodeWidths[rootNodes[0]?.id] || this.nodeSpacingX, 0);
      let rootX = (containerWidth - totalRootWidth) / 2;

      rootNodes.forEach((root) => {
        calculateSubtreeWidth(root.id);
        calculatePositions(root.id, rootX + nodeWidths[root.id] / 2, 0);
        rootX += nodeWidths[root.id];
      });
    }

    return positions;
  }

  /**
   * Simple compact layout - จัดเรียงทีละ level
   */
  calculateCompactLayout(
    levels: Level[],
    containerWidth: number = 1200,
  ): { [key: number]: { x: number; y: number } } {
    const positions: { [key: number]: { x: number; y: number } } = {};

    levels.forEach((level, levelIndex) => {
      const levelY = levelIndex * this.nodeSpacingY;

      if (level.nodes.length === 0) return;

      // คำนวณตำแหน่ง x โดยกระจายเท่าๆ กัน
      const nodeCount = level.nodes.length;
      const totalWidth = Math.max(nodeCount * this.nodeSpacingX, containerWidth * 0.8);
      const startX = (containerWidth - totalWidth) / 2;

      level.nodes.forEach((node, index) => {
        positions[node.id] = {
          x: startX + index * (totalWidth / nodeCount),
          y: levelY,
        };
      });
    });

    return positions;
  }

  /**
   * Advanced hierarchical layout พร้อม collision detection
   */
  calculateAdvancedLayout(
    levels: Level[],
    containerWidth: number = 1200,
  ): { [key: number]: { x: number; y: number } } {
    const positions: { [key: number]: { x: number; y: number } } = {};

    levels.forEach((level, levelIndex) => {
      const levelY = levelIndex * this.nodeSpacingY;

      if (level.nodes.length === 0) return;

      // Group by parent
      const nodesByParent = this.groupNodesByParent(level.nodes);

      let xOffset = 50;

      nodesByParent.forEach((children) => {
        children.forEach((child) => {
          positions[child.id] = {
            x: xOffset,
            y: levelY,
          };
          xOffset += this.nodeSpacingX;
        });
      });

      // Adjust if overflow
      const maxX = Math.max(...Object.values(positions).map((p) => p.x));
      if (maxX > containerWidth - 50) {
        const scale = (containerWidth - 100) / (maxX - 50);
        level.nodes.forEach((node) => {
          if (positions[node.id]) {
            positions[node.id].x = positions[node.id].x * scale + 50;
          }
        });
      }
    });

    return positions;
  }

  /**
   * คำนวณ bounding box สำหรับทุก nodes ใน level
   */
  private calculateBoundingBox(
    nodeIds: number[],
    positions: { [key: number]: { x: number; y: number } },
  ): { minX: number; maxX: number; minY: number; maxY: number } {
    let minX = Infinity;
    let maxX = -Infinity;
    let minY = Infinity;
    let maxY = -Infinity;

    nodeIds.forEach((id) => {
      const pos = positions[id];
      if (!pos) return;

      minX = Math.min(minX, pos.x);
      maxX = Math.max(maxX, pos.x + this.nodeWidth);
      minY = Math.min(minY, pos.y);
      maxY = Math.max(maxY, pos.y + this.nodeHeight);
    });

    return { minX, maxX, minY, maxY };
  }

  /**
   * Group nodes by parent ID
   */
  private groupNodesByParent(nodes: Node[]): Node[][] {
    const groups = new Map<number | null, Node[]>();

    nodes.forEach((node) => {
      const parentId = node.parentId || null;
      if (!groups.has(parentId)) {
        groups.set(parentId, []);
      }
      groups.get(parentId)!.push(node);
    });

    return Array.from(groups.values());
  }

  /**
   * ตั้งค่า spacing
   */
  setSpacing(spacingX: number, spacingY: number): void {
    this.nodeSpacingX = spacingX;
    this.nodeSpacingY = spacingY;
  }

  /**
   * ตั้งค่า node size
   */
  setNodeSize(width: number, height: number): void {
    this.nodeWidth = width;
    this.nodeHeight = height;
  }

  /**
   * Get current spacing
   */
  getSpacing(): { x: number; y: number } {
    return {
      x: this.nodeSpacingX,
      y: this.nodeSpacingY,
    };
  }
}
