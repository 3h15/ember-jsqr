type Point = import('jsqr/dist/locator').Point;
type QRCode = import('jsqr').QRCode;

export function drawBox({
  canvas,
  scanArea,
  location,
  color,
}: {
  canvas: CanvasRenderingContext2D;
  scanArea: { x: number; y: number };
  location: QRCode['location'];
  color: string;
}): void {
  canvas.save();
  canvas.translate(scanArea.x, scanArea.y);
  drawLine(canvas, location.topLeftCorner, location.topRightCorner, color);
  drawLine(canvas, location.topRightCorner, location.bottomRightCorner, color);
  drawLine(canvas, location.bottomRightCorner, location.bottomLeftCorner, color);
  drawLine(canvas, location.bottomLeftCorner, location.topLeftCorner, color);
  canvas.restore();
}

function drawLine(canvas: CanvasRenderingContext2D, begin: Point, end: Point, color: string) {
  canvas.beginPath();
  canvas.moveTo(begin.x, begin.y);
  canvas.lineTo(end.x, end.y);
  canvas.lineWidth = 4;
  canvas.strokeStyle = color;
  canvas.stroke();
}

export function drawScanArea({
  canvas,
  scanArea,
  element,
}: {
  canvas: CanvasRenderingContext2D;
  scanArea: { x: number; y: number; w: number; h: number };
  element: HTMLCanvasElement;
}): void {
  const sa = scanArea;
  canvas.save();
  canvas.beginPath();
  canvas.rect(0, 0, sa.x, element.height);
  canvas.rect(0, 0, element.width, sa.y);
  canvas.rect(sa.x + sa.w, 0, element.width, element.height);
  canvas.rect(0, sa.y + sa.h, element.width, element.height);
  canvas.clip();

  canvas.fillStyle = 'rgb(0, 0, 0, .4)';
  canvas.fillRect(0, 0, element.width, element.height);
  canvas.restore();
}
