import { Injectable } from '@angular/core';
import { Node, NodePosition, SVGPath } from '../models/org-chart.model';
import { OrgChartDataService } from './org-chart-data.service';

/**
 * OrgChartConnectionService - บริการวาดเส้นเชื่อม
 * ความรับผิดชอบ:
 * - คำนวณเส้น SVG แบบโค้ง (Cubic Bézier) ที่เชื่อม Parent กับ Children
 * - จัดการสี และ Styling ของเส้น
 * - Highlight เส้นเมื่อ Hover
 */
@Injectable({
  providedIn: 'root',
})
export class OrgChartConnectionService {
  constructor(private dataService: OrgChartDataService) {}

  /**
   * สร้าง SVG Paths สำหรับการเชื่อม Node ด้วยเส้นโค้ง
   */
  generatePaths(
    nodePositions: { [key: number]: NodePosition },
    highlightedNodeId: number | null,
  ): SVGPath[] {
    const paths: SVGPath[] = [];
    const levels = this.dataService.getLevels();

    levels.forEach((level) => {
      level.nodes.forEach((node) => {
        if (!node.parentId) return;

        const parentPos = nodePositions[node.parentId];
        const childPos = nodePositions[node.id];

        if (!parentPos || !childPos) return;

        const isFamilyHighlighted =
          highlightedNodeId === node.id ||
          highlightedNodeId === node.parentId ||
          this.isDescendantOfHighlighted(node.parentId, highlightedNodeId);

        const strokeWidth = isFamilyHighlighted ? '3' : '2';
        const opacity = isFamilyHighlighted ? '1' : '0.4';
        const strokeColor = isFamilyHighlighted
          ? (this.dataService.findNode(node.parentId)?.color ?? '#cbd5e1')
          : '#cbd5e1';

        // จุดเริ่มต้น (ล่างของ Parent)
        const startX = parentPos.x;
        const startY = parentPos.y + parentPos.height / 2;

        // จุดสิ้นสุด (บนของ Child)
        const endX = childPos.x;
        const endY = childPos.y - childPos.height / 2;

        // ค่าความโค้งของเส้น
        const curveFactor = Math.abs(startY - endY) * 0.4;

        // สร้าง Path string สำหรับ Cubic Bézier curve
        const pathData =
          `M ${startX} ${startY} ` + // Move to start
          `C ${startX} ${startY + curveFactor}, ` + // Control point 1
          `${endX} ${endY - curveFactor}, ` + // Control point 2
          `${endX} ${endY}`; // End point

        paths.push({
          d: pathData,
          stroke: strokeColor,
          strokeWidth,
          opacity,
          circle: {
            cx: endX,
            cy: endY,
            r: 4,
            fill: strokeColor,
          },
        });
      });
    });

    return paths;
  }

  /**
   * ตรวจสอบว่า nodeId เป็นลูกหลานของ highlightedNodeId หรือไม่
   * (Helper function to check if a node is part of the highlighted family branch)
   */
  private isDescendantOfHighlighted(nodeId: number, highlightedNodeId: number | null): boolean {
    if (!highlightedNodeId) return false;
    return this.dataService.isDescendantOf(nodeId, highlightedNodeId);
  }
}
