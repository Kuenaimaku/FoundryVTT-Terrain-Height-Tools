import { Point } from "./point.mjs";

/**
 * Represents a line segment, from `p1` to `p2`.
 * LineSegments are considered equal regardless of 'direction'. I.E. p1 vs p2 order does not matter.
 */
export class LineSegment {
	/** @type {number | undefined} */
	#length;

	/** @type {number | undefined} */
	#angle;

	/**
	 * @param {Point | { x: number; y: number; }} p1
	 * @param {Point | { x: number; y: number; }} p2
	 */
	constructor(p1, p2) {
		this.p1 = p1 instanceof Point ? p1 : new Point(p1.x, p1.y);
		this.p2 = p2 instanceof Point ? p2 : new Point(p2.x, p2.y);
	}

	/**
	 * Creates a LineSegment from a pair of x,y coordinates.
	 * @param {number} x1
	 * @param {number} y1
	 * @param {number} x2
	 * @param {number} y2
	 */
	static fromCoords(x1, y1, x2, y2) {
		return new LineSegment(new Point(x1, y1), new Point(x2, y2));
	}

	/** Determines if this line segment is pointing in a clockwise direction. */
	get clockwise() {
		// If the p1.x < p2.x, then clockwise
		// If p1.x ~= p2.x, check if p1.y > p2.y, then clockwise
		if (Math.abs(this.dx) < 1)
			return this.p1.y > this.p2.y;
		return this.p1.x < this.p2.x;
	}

	get dx() {
		return this.p2.x - this.p1.x;
	}

	get dy() {
		return this.p2.y - this.p1.y;
	}

	get slope() {
		return this.p1.x !== this.p2.x
			? this.dy / this.dx
			: Infinity;
	}

	get angle() {
		// Lazily evaluated + cached angle
		return this.#angle ??= Math.atan2(this.dy, this.dx);
	}

	get lengthSquared() {
		return Math.pow(this.dx, 2) + Math.pow(this.dy, 2);
	}

	get length() {
		// Lazily evaluated + cached length
		return this.#length ??= Math.hypot(this.dx, this.dy);
	}

	/** @param {LineSegment} other */
	equals(other) {
		return (this.p1.equals(other.p1) && this.p2.equals(other.p2))
			|| (this.p1.equals(other.p2) && this.p2.equals(other.p1));
	}

	/**
	 * Determines if this LineSegment is parallel to another LineSegment, ignoring the direction of the lines.
	 * @param {LineSegment} other
	 * @param {Object} [options]
	 */
	isParallelTo(other) {
		let diff = Math.abs(this.angle - other.angle);

		// Adjust to handle cases where the angles are near different extremes
		if (diff > Math.PI)
			diff = Math.PI * 2 - diff;

		// Adjust to handle cases where the angles are in opposite directions
		if (diff > Math.PI / 2)
			diff = Math.PI - diff;

		return diff <= Number.EPSILON;
	}

	/**
	 * Determines if the given point lies on this LineSegment.
	 * @param {number} x
	 * @param {number} y
	 */
	pointOnLine(x, y) {
		// Cross product checks if the point lies on the line (must be ~0)
		const cross = (y - this.p1.y) * this.dx - (x - this.p1.x) * this.dy;
		if (Math.abs(cross) > Number.EPSILON) return false;

		// Dot product checks if point lies between p1 and p2 (must be between 0 and length^2).
		const dot = (x - this.p1.x) * (this.p2.x - this.p1.x) + (y - this.p1.y) * (this.p2.y - this.p1.y);
		return dot >= 0 && dot <= this.lengthSquared;
	}

	/**
	 * Gets the Y position that this line segment intersects a vertical line at `x`. Returns undefined if this line is
	 * vertical or does not pass the given `x` position.
	 * @param {number} x
	 * @returns {number | undefined}
	 */
	intersectsXAt(x) {
		// If the given `x` is not between p1.x and p2.x, return undefined
		if (x >= Math.max(this.p1.x, this.p2.x) || x <= Math.min(this.p1.x, this.p2.x))
			return undefined;

		const slope = this.slope;

		// If slope is infinity, line is vertical, so does not intersect X
		if (slope === Infinity)
			return undefined;

		// If slope is 0, line is horizontal, so it's p1.y and p2.y are the same, and it intersects there
		if (slope === 0)
			return this.p1.y;

		// For other values, line is diagonal, so work out where it would meet the X
		return this.p1.y + (x - this.p1.x) * slope;
	}

	/**
	 * Gets the X poisition that this line segmnet intersects a horizontal line at `y`. Returns undefined if this line
	 * is horizontal or does not pass the given `y` position.
	 * @param {number} y
	 * @returns {number | undefined}
	 */
	intersectsYAt(y) {
		// If the given `y` is not between p1.y and p2.y, return undefined
		if (y > Math.max(this.p1.y, this.p2.y) || y < Math.min(this.p1.y, this.p2.y))
			return undefined;

		const slope = this.slope;

		// If slope is 0, line is horizontal, so does not intersect Y
		if (slope === 0)
			return undefined;

		// If slope is infinity, line is vertical, so it's p1.x and p2.x are the same, and it intersects there
		if (slope === Infinity)
			return this.p1.x;

		// For other values, line is diagonal, so work out where it would meet the Y
		return this.p1.x + (y - this.p1.y) / slope;
	}

	/**
	 * Gets the X and Y position that this line segment intersects another line segment, as well as the relative
	 * distance along each line segmnet that the intersection occured.
	 *
	 * The returned `t` value is how far along 'this' line segment the intersection point is at:
	 * - 0 means that the intersection is at this.p1.
	 * - 1 means that the intersection is at this.p2.
	 * - Another value (which will be between 0-1) means it proportionally lies along the line segment.
	 *
	 * The returned `u` value is the equivalent of `t` but for the 'other' line segment.
	 *
	 * Returns undefined if the line segments do not intersect.
	 * Parallel lines are never considered to intersect.
	 * @param {LineSegment} other
	 * @returns {{ x: number; y: number; t: number; u: number } | undefined}
	 */
	intersectsAt(other) {
		if (this.lengthSquared <= 0 || other.lengthSquared <= 0) return undefined;

		const { x: x1, y: y1 } = this.p1;
		const { x: x2, y: y2 } = this.p2;
		const { x: x3, y: y3 } = other.p1;
		const { x: x4, y: y4 } = other.p2;

		// If slopes are equal (or very close) then the lines are parallel, so we treat as no intersection
		if (this.isParallelTo(other)) return undefined;

		// `t` is how far along `this` line the intersection point is at: 0 means that the intersection is at p1, 1 means
		// that the intersection is at p2, a value between 0-1 means it lies on the line, <0 or >1 means it lies out of the
		// line. `u` is the same, but for the `other` line.
		const denom = (x1 - x2) * (y3 - y4) - (y1 - y2) * (x3 - x4);
		const t = ((x1 - x3) * (y3 - y4) - (y1 - y3) * (x3 - x4)) / denom;
		const u = -((x1 - x2) * (y1 - y3) - (y1 - y2) * (x1 - x3)) / denom;

		// If the intersection point lies outside of either line, then there is no intersection
		if (t < 0 || t > 1 || u < 0 || u > 1) return undefined;

		return {
			x: x1 + t * (x2 - x1),
			y: y1 + t * (y2 - y1),
			t: Math.max(Math.min(t, 1), 0),
			u: Math.max(Math.min(u, 1), 0)
		};
	}

	/**
	 * Linearly interpolates the X,Y position of a point that is at `t` along the line.
	 * @param {number} t
	 * @returns {[number, number]}
	 */
	lerp(t) {
		return [
			this.dx * t + this.p1.x,
			this.dy * t + this.p1.y
		];
	}

	/**
	 * Works out the interior angle between this line segment and another line segment.
	 * This makes the assumption `other` starts where `this` ends and the polygon is defined clockwise.
	 * @param {LineSegment} other
	 * @returns A value in range [0, 2PI)
	 */
	angleBetween(other) {
		const angle = this.angle;
		const angleOther = other.angle;

		let diff = angle - angleOther + Math.PI;
		while (diff < 0) diff += 2 * Math.PI;
		while (diff >= Math.PI * 2) diff -= 2 * Math.PI;
		return diff;
	}

	/**
	 * Creates the LineSegment that represents this inverse of this LineSegment.
	 */
	inverse() {
		return new LineSegment(this.p2, this.p1);
	}

	toString() {
		return `LineSegment { (${this.p1.x}, ${this.p1.y}) -> (${this.p2.x}, ${this.p2.y}) }`;
	}
}
