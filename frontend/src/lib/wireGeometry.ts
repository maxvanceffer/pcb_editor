import type { GridPosition } from './components/types'
import type { WireTrace } from './components/WireTrace'

export interface SvgPoint {
  x: number
  y: number
}

export interface CrossingInfo {
  wire: WireTrace
  point: SvgPoint
  segmentIndex: number
}

export interface JunctionInfo {
  wire: WireTrace
  sharedEndpoint: SvgPoint
}

export interface GeometryConstants {
  HOLE_SPACING: number
  MARGIN_LEFT: number
  MARGIN_TOP: number
  CANVAS_PADDING: number
}

function toSvgPoint(gp: GridPosition, c: GeometryConstants): SvgPoint {
  return {
    x: c.MARGIN_LEFT + (gp.x + c.CANVAS_PADDING) * c.HOLE_SPACING + c.HOLE_SPACING / 2,
    y: c.MARGIN_TOP + (gp.y + c.CANVAS_PADDING) * c.HOLE_SPACING + c.HOLE_SPACING / 2,
  }
}

function pointsEqual(a: SvgPoint, b: SvgPoint, epsilon = 1): boolean {
  return Math.abs(a.x - b.x) <= epsilon && Math.abs(a.y - b.y) <= epsilon
}

/**
 * Проверяет, пересекаются ли два отрезка (строго, без учёта конечных точек).
 * Возвращает параметр t для первого отрезка при пересечении, или null.
 */
function segmentIntersectT(
  p1: SvgPoint, p2: SvgPoint,
  p3: SvgPoint, p4: SvgPoint,
): number | null {
  const d1x = p2.x - p1.x
  const d1y = p2.y - p1.y
  const d2x = p4.x - p3.x
  const d2y = p4.y - p3.y

  const cross = d1x * d2y - d1y * d2x
  if (Math.abs(cross) < 1e-10) return null // параллельные

  const dx = p3.x - p1.x
  const dy = p3.y - p1.y

  const t = (dx * d2y - dy * d2x) / cross
  const u = (dx * d1y - dy * d1x) / cross

  // Строгое неравенство — исключаем конечные точки
  if (t > 0.001 && t < 0.999 && u > 0.001 && u < 0.999) {
    return t
  }
  return null
}

export function wiresShareEndpoint(
  wireA: WireTrace,
  wireB: WireTrace,
  c: GeometryConstants,
): boolean {
  const aStart = toSvgPoint(wireA.startPosition, c)
  const aEnd = toSvgPoint(wireA.endPosition, c)
  const bStart = toSvgPoint(wireB.startPosition, c)
  const bEnd = toSvgPoint(wireB.endPosition, c)

  return (
    pointsEqual(aStart, bStart) ||
    pointsEqual(aStart, bEnd) ||
    pointsEqual(aEnd, bStart) ||
    pointsEqual(aEnd, bEnd)
  )
}

export function findJunctions(
  newWire: WireTrace,
  existingWires: WireTrace[],
  c: GeometryConstants,
): JunctionInfo[] {
  const result: JunctionInfo[] = []
  const newStart = toSvgPoint(newWire.startPosition, c)
  const newEnd = toSvgPoint(newWire.endPosition, c)

  for (const wire of existingWires) {
    if (wire.id === newWire.id) continue
    const bStart = toSvgPoint(wire.startPosition, c)
    const bEnd = toSvgPoint(wire.endPosition, c)

    if (pointsEqual(newStart, bStart) || pointsEqual(newStart, bEnd)) {
      result.push({ wire, sharedEndpoint: newStart })
    } else if (pointsEqual(newEnd, bStart) || pointsEqual(newEnd, bEnd)) {
      result.push({ wire, sharedEndpoint: newEnd })
    }
  }
  return result
}

export function findCrossings(
  newWire: WireTrace,
  existingWires: WireTrace[],
  c: GeometryConstants,
): CrossingInfo[] {
  const result: CrossingInfo[] = []
  const seen = new Set<string>()

  const newPts = newWire.getAllPoints().map((p) => toSvgPoint(p, c))

  for (const wire of existingWires) {
    if (wire.id === newWire.id) continue
    if (seen.has(wire.id)) continue

    const exPts = wire.getAllPoints().map((p) => toSvgPoint(p, c))

    outer: for (let i = 0; i < newPts.length - 1; i++) {
      const nA = newPts[i]
      const nB = newPts[i + 1]

      for (let j = 0; j < exPts.length - 1; j++) {
        const eA = exPts[j]
        const eB = exPts[j + 1]

        const t = segmentIntersectT(nA, nB, eA, eB)
        if (t !== null) {
          const point: SvgPoint = {
            x: nA.x + t * (nB.x - nA.x),
            y: nA.y + t * (nB.y - nA.y),
          }
          result.push({ wire, point, segmentIndex: i })
          seen.add(wire.id)
          break outer
        }
      }
    }
  }
  return result
}
