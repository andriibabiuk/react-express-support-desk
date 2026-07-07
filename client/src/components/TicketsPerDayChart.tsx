import type { TicketStats } from 'core';
import { useState } from 'react';
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

type DailyTicketCount = TicketStats['dailyTicketCounts'][number];

const MONTH_LABELS = [
	'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
	'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

// `date` is a plain `YYYY-MM-DD` UTC calendar day (see `core/src/schemas/ticket.ts`),
// not an instant — parsed by hand rather than through `Date` so formatting
// can't shift the day depending on the reader's local timezone.
function parseDayParts(date: string) {
	const [year, month, day] = date.split('-').map(Number);
	return { year, month, day };
}

function formatShortDay(date: string): string {
	const { month, day } = parseDayParts(date);
	return `${MONTH_LABELS[month - 1]} ${day}`;
}

function formatFullDay(date: string): string {
	const { year, month, day } = parseDayParts(date);
	return `${MONTH_LABELS[month - 1]} ${day}, ${year}`;
}

// Rounds the y-axis max up to a "clean" step (1/2/5/10 scaled by magnitude)
// so gridlines land on round numbers instead of an arbitrary data max.
function niceMax(max: number): number {
	if (max <= 4) return 4;
	const magnitude = 10 ** Math.floor(Math.log10(max));
	const normalized = max / magnitude;
	const step = normalized <= 2 ? 2 : normalized <= 5 ? 5 : 10;
	return step * magnitude;
}

const VIEW_WIDTH = 900;
const LEFT_MARGIN = 34;
const RIGHT_MARGIN = 4;
// Headroom above the tallest bar so its direct value label never gets
// clipped by the SVG's own viewBox.
const TOP_PADDING = 16;
const PLOT_HEIGHT = 150;
const AXIS_HEIGHT = 24;
const VIEW_HEIGHT = TOP_PADDING + PLOT_HEIGHT + AXIS_HEIGHT;
const BASELINE = TOP_PADDING + PLOT_HEIGHT;
const MAX_BAR_WIDTH = 24;
const BAR_GAP = 2;

// A <rect> with `rx` rounds all four corners — bars need a square baseline,
// so this draws the shape by hand instead (round top corners, straight
// bottom edge).
function roundedTopBarPath(
	x: number,
	width: number,
	top: number,
	bottom: number,
): string {
	const height = bottom - top;
	const radius = Math.max(0, Math.min(4, height, width / 2));
	if (radius === 0) {
		return `M${x},${bottom} L${x},${top} L${x + width},${top} L${x + width},${bottom} Z`;
	}
	return [
		`M${x},${bottom}`,
		`L${x},${top + radius}`,
		`Q${x},${top} ${x + radius},${top}`,
		`L${x + width - radius},${top}`,
		`Q${x + width},${top} ${x + width},${top + radius}`,
		`L${x + width},${bottom}`,
		'Z',
	].join(' ');
}

const SKELETON_BARS = Array.from({ length: 30 }, (_, i) =>
	Math.round(35 + 45 * Math.abs(Math.sin(i * 0.7))),
);

export function TicketsPerDayChart({
	data,
	isPending,
	isError,
}: {
	data: DailyTicketCount[] | undefined;
	isPending: boolean;
	isError: boolean;
}) {
	const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

	const days = data?.length ?? 0;
	const maxCount = data ? Math.max(0, ...data.map(d => d.count)) : 0;
	const yMax = niceMax(Math.max(maxCount, 1));
	const peakIndex =
		maxCount > 0 && data ? data.findIndex(d => d.count === maxCount) : -1;

	const plotWidth = VIEW_WIDTH - LEFT_MARGIN - RIGHT_MARGIN;
	const slotWidth = days > 0 ? plotWidth / days : 0;
	const barWidth = Math.max(1, Math.min(MAX_BAR_WIDTH, slotWidth - BAR_GAP));
	// Roughly 6 evenly spaced date labels rather than all 30 — spec calls for
	// labeling selectively, never every point.
	const labelEvery = Math.max(1, Math.ceil(days / 6));

	const hovered = hoveredIndex !== null ? data?.[hoveredIndex] : undefined;
	const hoveredLeftPercent =
		hoveredIndex !== null && days > 0
			? ((hoveredIndex + 0.5) / days) * 100
			: 0;

	return (
		<Card>
			<CardHeader>
				<CardTitle className='text-base font-medium'>Tickets per day</CardTitle>
				<CardDescription>Last 30 days</CardDescription>
			</CardHeader>
			<CardContent>
				{isPending && (
					<div className='flex h-[188px] items-end gap-[3px]' aria-hidden>
						{SKELETON_BARS.map((height, i) => (
							<Skeleton
								key={i}
								className='flex-1'
								style={{ height: `${height}%` }}
							/>
						))}
					</div>
				)}
				{isError && (
					<p className='text-sm text-destructive'>Failed to load ticket volume.</p>
				)}
				{data && (
					<div className='relative'>
						{hovered && (
							<div
								className='pointer-events-none absolute bottom-full z-10 mb-2 -translate-x-1/2 rounded-md bg-popover px-2.5 py-1.5 text-xs whitespace-nowrap text-popover-foreground shadow-md ring-1 ring-foreground/10'
								style={{ left: `${hoveredLeftPercent}%` }}
							>
								<p className='font-medium'>{formatFullDay(hovered.date)}</p>
								<p className='text-muted-foreground'>
									{hovered.count.toLocaleString()} ticket
									{hovered.count === 1 ? '' : 's'}
								</p>
							</div>
						)}
						<svg
							viewBox={`0 0 ${VIEW_WIDTH} ${VIEW_HEIGHT}`}
							className='w-full'
							role='img'
							aria-label='Total tickets created per day over the last 30 days'
						>
							{[0, yMax / 2, yMax].map(tick => {
								const y = BASELINE - (tick / yMax) * PLOT_HEIGHT;
								return (
									<g key={tick}>
										<line
											x1={LEFT_MARGIN}
											x2={VIEW_WIDTH - RIGHT_MARGIN}
											y1={y}
											y2={y}
											className='stroke-border'
											strokeWidth={1}
										/>
										<text
											x={LEFT_MARGIN - 6}
											y={y + 3}
											textAnchor='end'
											className='fill-muted-foreground text-[10px]'
										>
											{Math.round(tick).toLocaleString()}
										</text>
									</g>
								);
							})}
							{data.map((d, i) => {
								const x =
									LEFT_MARGIN + i * slotWidth + (slotWidth - barWidth) / 2;
								const barHeight = (d.count / yMax) * PLOT_HEIGHT;
								const top = BASELINE - barHeight;
								const isDimmed = hoveredIndex !== null && hoveredIndex !== i;
								return (
									<g key={d.date}>
										{d.count > 0 && (
											<path
												d={roundedTopBarPath(x, barWidth, top, BASELINE)}
												className='fill-primary'
												opacity={isDimmed ? 0.85 : 1}
											/>
										)}
										{i === peakIndex && (
											<text
												x={x + barWidth / 2}
												y={top - 6}
												textAnchor='middle'
												className='fill-foreground text-[10px] font-medium'
											>
												{d.count}
											</text>
										)}
										{i % labelEvery === 0 && (
											<text
												x={LEFT_MARGIN + i * slotWidth + slotWidth / 2}
												y={BASELINE + 18}
												textAnchor='middle'
												className='fill-muted-foreground text-[10px]'
											>
												{formatShortDay(d.date)}
											</text>
										)}
										<rect
											x={LEFT_MARGIN + i * slotWidth}
											y={TOP_PADDING}
											width={slotWidth}
											height={PLOT_HEIGHT}
											fill='transparent'
											tabIndex={0}
											aria-label={`${formatFullDay(d.date)}: ${d.count} ticket${d.count === 1 ? '' : 's'}`}
											onMouseEnter={() => setHoveredIndex(i)}
											onMouseLeave={() => setHoveredIndex(null)}
											onFocus={() => setHoveredIndex(i)}
											onBlur={() => setHoveredIndex(null)}
										/>
									</g>
								);
							})}
						</svg>
					</div>
				)}
			</CardContent>
		</Card>
	);
}
