/**
 * Position Model - ตำแหน่งในองค์กร
 * ใช้สำหรับเก็บข้อมูลตำแหน่งงาน เช่น CEO, Manager, Developer
 */
export interface Position {
  id: number;
  name: string;
  color: string;
}

/**
 * Node Model - โหนดในผังองค์กร
 * แทนพนักงาน/ตำแหน่งเดียวในโครงสร้างองค์กร
 */
export interface Node {
  id: number;
  positionId: number;
  name: string;
  color: string;
  parentId: number | null;
  levelId: number;
}

/**
 * Level Model - ชั้นในผังองค์กร
 * เช่น Level 1 = Top Management, Level 2 = Middle Management
 */
export interface Level {
  id: number;
  name: string;
  nodes: Node[];
}

/**
 * NodePosition Model - ตำแหน่งพิกัดของ Node บนหน้าจอ
 * ใช้สำหรับการวาดเส้นเชื่อม
 */
export interface NodePosition {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * PendingMove Model - สถานะของการย้าย Node ที่รอการยืนยัน
 * actionType: 'MOVE' = ย้าย Node พร้อมลูกหลาน
 *            'REPLACE' = แทนที่ Node เพียงตัวเดียว
 */
export interface PendingMove {
  sourceNode: Node;
  targetLevelId: number;
  targetParentId: number | null;
  actionType: 'MOVE' | 'REPLACE';
  targetReplaceNodeId?: number;
}

/**
 * DragDropPayload Model - ข้อมูลที่ส่งผ่านระหว่าง Drag & Drop
 */
export interface DragDropPayload {
  type: 'POSITION' | 'NODE';
  data: Position | Node;
}

/**
 * ChartViewState Model - สถานะการแสดงผลของแผนภูมิ
 */
export interface ChartViewState {
  hoveredNodeId: number | null;
  dragOverNodeId: number | null;
  dropTargetLevelId: number | null;
}

/**
 * SVGPath Model - ข้อมูลเส้นเชื่อม SVG
 */
export interface SVGPath {
  d: string;
  stroke: string;
  strokeWidth: string;
  opacity: string;
  circle?: {
    cx: number;
    cy: number;
    r: number;
    fill: string;
  };
}
