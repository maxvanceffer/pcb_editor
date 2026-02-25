import { v4 as uuid } from 'uuid'
import type { GridPosition } from './components/types'
import { WireTrace } from './components/WireTrace'

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

/**
 * Checks if a grid hole lies on any segment of the wire.
 * Uses exact integer arithmetic (no epsilon) since both holes and wire waypoints are integers.
 * Returns the first matching { segmentIndex, t } or null.
 */
export function findHoleOnWire(
  hole: GridPosition,
  wire: WireTrace,
): { segmentIndex: number; t: number } | null {
  const points = wire.getAllPoints()
  for (let i = 0; i < points.length - 1; i++) {
    const p1 = points[i]
    const p2 = points[i + 1]
    const dx = p2.x - p1.x
    const dy = p2.y - p1.y

    // Cross product must be zero (collinear)
    const cross = dx * (hole.y - p1.y) - dy * (hole.x - p1.x)
    if (cross !== 0) continue

    // Compute parameter t
    let t: number
    if (dx !== 0) {
      t = (hole.x - p1.x) / dx
    } else if (dy !== 0) {
      t = (hole.y - p1.y) / dy
    } else {
      // Degenerate zero-length segment
      t = hole.x === p1.x && hole.y === p1.y ? 0 : -1
    }

    if (t >= 0 && t <= 1) {
      return { segmentIndex: i, t }
    }
  }
  return null
}

/**
 * Checks whether an SVG-coordinate point lies on any segment of a wire (within 2px tolerance).
 * Used to redistribute crossing points after a split.
 */
export function svgPointOnWireSegments(pt: SvgPoint, wire: WireTrace, c: GeometryConstants): boolean {
  const pts = wire.getAllPoints().map((p) => toSvgPoint(p, c))
  for (let i = 0; i < pts.length - 1; i++) {
    const p1 = pts[i]
    const p2 = pts[i + 1]
    const dx = p2.x - p1.x
    const dy = p2.y - p1.y
    const len2 = dx * dx + dy * dy
    if (len2 < 1e-10) continue

    const t = ((pt.x - p1.x) * dx + (pt.y - p1.y) * dy) / len2
    if (t < -0.01 || t > 1.01) continue

    const closestX = p1.x + t * dx
    const closestY = p1.y + t * dy
    const dist2 = (pt.x - closestX) ** 2 + (pt.y - closestY) ** 2
    if (dist2 <= 4) return true
  }
  return false
}

/**
 * Splits a wire at two grid holes (holeA and holeB), removing the segment between them.
 * Returns wire1 (start → holeA) and wire2 (holeB → end), either of which may be null
 * if the cut point coincides with the wire's endpoint.
 * Crossings and sharedHoles are redistributed to the appropriate piece.
 */
export function splitWireAtPoints(
  wire: WireTrace,
  holeA: GridPosition,
  holeB: GridPosition,
  c: GeometryConstants,
): { wire1: WireTrace | null; wire2: WireTrace | null } {
  // Identical points — nothing to cut
  if (holeA.x === holeB.x && holeA.y === holeB.y) {
    return { wire1: null, wire2: null }
  }

  const hitA = findHoleOnWire(holeA, wire)
  const hitB = findHoleOnWire(holeB, wire)
  if (!hitA || !hitB) return { wire1: null, wire2: null }

  // Normalize: earlyHit comes before lateHit along the wire
  const paramA = hitA.segmentIndex + hitA.t
  const paramB = hitB.segmentIndex + hitB.t

  let earlyPos: GridPosition, latePos: GridPosition
  let earlyHit: { segmentIndex: number; t: number }
  let lateHit: { segmentIndex: number; t: number }

  if (paramA <= paramB) {
    earlyPos = holeA; earlyHit = hitA
    latePos = holeB; lateHit = hitB
  } else {
    earlyPos = holeB; earlyHit = hitB
    latePos = holeA; lateHit = hitA
  }

  // Build expanded points array, inserting interior cut points
  const allPoints = wire.getAllPoints()
  const expanded: GridPosition[] = []

  for (let i = 0; i < allPoints.length; i++) {
    expanded.push({ ...allPoints[i] })
    if (i < allPoints.length - 1) {
      // Insert earlyPos if it is interior to segment [i, i+1]
      if (earlyHit.segmentIndex === i && earlyHit.t > 0 && earlyHit.t < 1) {
        expanded.push({ ...earlyPos })
      }
      // Insert latePos if it is interior to segment [i, i+1]
      if (lateHit.segmentIndex === i && lateHit.t > 0 && lateHit.t < 1) {
        expanded.push({ ...latePos })
      }
    }
  }

  // Find index of earlyPos in expanded (first occurrence)
  let indexEarly = -1
  for (let i = 0; i < expanded.length; i++) {
    if (expanded[i].x === earlyPos.x && expanded[i].y === earlyPos.y) {
      indexEarly = i
      break
    }
  }

  // Find index of latePos after earlyPos (first occurrence after indexEarly)
  let indexLate = -1
  for (let i = indexEarly + 1; i < expanded.length; i++) {
    if (expanded[i].x === latePos.x && expanded[i].y === latePos.y) {
      indexLate = i
      break
    }
  }

  if (indexEarly === -1 || indexLate === -1) return { wire1: null, wire2: null }

  // wire1: expanded[0 .. indexEarly]
  let wire1: WireTrace | null = null
  const pts1 = expanded.slice(0, indexEarly + 1)
  if (pts1.length >= 2) {
    wire1 = new WireTrace(pts1[0], pts1[pts1.length - 1], wire.color, pts1.slice(1, -1), uuid())
  }

  // wire2: expanded[indexLate .. end]
  let wire2: WireTrace | null = null
  const pts2 = expanded.slice(indexLate)
  if (pts2.length >= 2) {
    wire2 = new WireTrace(pts2[0], pts2[pts2.length - 1], wire.color, pts2.slice(1, -1), uuid())
  }

  // Redistribute crossings to the correct piece
  for (const crossing of wire.crossings) {
    const inW1 = wire1 && svgPointOnWireSegments(crossing.point, wire1, c)
    const target = inW1 ? wire1 : wire2
    if (target) {
      target.crossings.push({ ...crossing, point: { ...crossing.point } })
    }
  }

  // Redistribute sharedHoles to the correct piece
  for (const hole of wire.sharedHoles) {
    const inW1 = wire1 && findHoleOnWire(hole, wire1) !== null
    const target = inW1 ? wire1 : wire2
    if (target) {
      target.sharedHoles.push({ ...hole })
    }
  }

  return { wire1, wire2 }
}
