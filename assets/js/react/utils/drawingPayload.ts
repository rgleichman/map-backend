export const DRAWING_WIDTH = 256
export const DRAWING_HEIGHT = 256

export type DrawingTool = "pen" | "eraser"

export type DrawingStroke = {
  tool: DrawingTool
  size: number
  points: [number, number][]
}

export type DrawingData = {
  version: 1
  width: number
  height: number
  strokes: DrawingStroke[]
}

export function emptyDrawing(): DrawingData {
  return {
    version: 1,
    width: DRAWING_WIDTH,
    height: DRAWING_HEIGHT,
    strokes: [],
  }
}

export function drawingHasContent(data: DrawingData): boolean {
  return data.strokes.some((stroke) => stroke.points.length >= 2)
}

export function parseDrawing(payload: string): DrawingData {
  const trimmed = payload.trim()
  if (!trimmed) return emptyDrawing()
  try {
    const parsed = JSON.parse(trimmed) as Partial<DrawingData>
    if (parsed.version !== 1 || !Array.isArray(parsed.strokes)) return emptyDrawing()
    return {
      version: 1,
      width: typeof parsed.width === "number" ? parsed.width : DRAWING_WIDTH,
      height: typeof parsed.height === "number" ? parsed.height : DRAWING_HEIGHT,
      strokes: parsed.strokes
        .filter((stroke) => stroke && (stroke.tool === "pen" || stroke.tool === "eraser"))
        .map((stroke) => ({
          tool: stroke.tool as DrawingTool,
          size: typeof stroke.size === "number" ? stroke.size : stroke.tool === "eraser" ? 12 : 2,
          points: (stroke.points ?? [])
            .filter((p): p is [number, number] => Array.isArray(p) && p.length === 2)
            .map(([x, y]) => [Number(x), Number(y)] as [number, number]),
        })),
    }
  } catch {
    return emptyDrawing()
  }
}

export function serializeDrawing(data: DrawingData): string {
  return JSON.stringify({
    version: 1,
    width: data.width,
    height: data.height,
    strokes: data.strokes,
  })
}

export function strokeCount(data: DrawingData): number {
  return data.strokes.filter((stroke) => stroke.points.length >= 2).length
}

export function renderDrawingToCanvas(
  ctx: CanvasRenderingContext2D,
  data: DrawingData,
  background = "#ffffff"
) {
  ctx.clearRect(0, 0, data.width, data.height)
  ctx.fillStyle = background
  ctx.fillRect(0, 0, data.width, data.height)
  for (const stroke of data.strokes) {
    if (stroke.points.length < 2) continue
    ctx.save()
    ctx.lineCap = "round"
    ctx.lineJoin = "round"
    ctx.lineWidth = stroke.size
    if (stroke.tool === "eraser") {
      ctx.globalCompositeOperation = "destination-out"
      ctx.strokeStyle = "rgba(0,0,0,1)"
    } else {
      ctx.globalCompositeOperation = "source-over"
      ctx.strokeStyle = "#000000"
    }
    ctx.beginPath()
    const [startX, startY] = stroke.points[0]
    ctx.moveTo(startX, startY)
    for (let i = 1; i < stroke.points.length; i++) {
      const [x, y] = stroke.points[i]
      ctx.lineTo(x, y)
    }
    ctx.stroke()
    ctx.restore()
  }
}
