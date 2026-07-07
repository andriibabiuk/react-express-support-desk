-- Computes the dashboard stats served by `GET /api/tickets/stats`
-- (`server/src/routes/tickets.ts`) in the database instead of pulling rows
-- back to Node and aggregating in JS. Returns a single JSON object shaped
-- exactly like the `TicketStats` type in `core/src/schemas/ticket.ts`, so
-- the route can hand the result straight to `res.json()`.
CREATE OR REPLACE FUNCTION get_ticket_stats()
RETURNS JSON
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
	v_total_tickets INTEGER;
	v_open_tickets INTEGER;
	v_resolved_by_ai_count INTEGER;
	v_avg_resolution_ms DOUBLE PRECISION;
	v_daily_ticket_counts JSON;
	-- `NOW() AT TIME ZONE 'UTC'` rather than `CURRENT_DATE`, so "today" is
	-- always the UTC calendar day regardless of the Postgres session's own
	-- timezone setting — `"createdAt"`/`"updatedAt"` are stored as the UTC
	-- wall-clock value of the original JS `Date` (Prisma's usual convention
	-- for a `timestamp(3)` column with no explicit `@db.Timestamptz`), so
	-- comparing against a UTC "today" keeps day-bucketing consistent with
	-- how the data was written.
	v_today DATE := (NOW() AT TIME ZONE 'UTC')::date;
	v_range_start DATE;
BEGIN
	v_range_start := v_today - INTERVAL '29 days';

	SELECT COUNT(*) INTO v_total_tickets FROM "ticket";

	SELECT COUNT(*) INTO v_open_tickets
	FROM "ticket"
	WHERE "status" = 'open';

	-- "Resolved by AI" is a resolved ticket with an AI-authored reply — the
	-- auto-resolve job (`server/src/lib/auto-resolve-ticket.ts`) is the only
	-- place a `SenderType.ai` reply is ever created, always in the same
	-- transaction that flips the ticket to `resolved`.
	SELECT COUNT(*) INTO v_resolved_by_ai_count
	FROM "ticket" t
	WHERE t."status" = 'resolved'
		AND EXISTS (
			SELECT 1 FROM "TicketReply" tr
			WHERE tr."ticketId" = t."id" AND tr."senderType" = 'ai'
		);

	-- There's no dedicated `resolvedAt` column, so `updatedAt` is used as an
	-- approximation of when a ticket settled into `resolved`/`closed` — see
	-- the same caveat previously documented on the JS implementation this
	-- replaces.
	SELECT AVG(EXTRACT(EPOCH FROM ("updatedAt" - "createdAt")) * 1000)
	INTO v_avg_resolution_ms
	FROM "ticket"
	WHERE "status" IN ('resolved', 'closed');

	-- One entry per day for the last 30 days (oldest first), zero-filled for
	-- days with no tickets — `generate_series` supplies the full calendar
	-- range, left-joined against the actual per-day counts.
	SELECT COALESCE(
		JSON_AGG(JSON_BUILD_OBJECT('date', d.day_label, 'count', d.day_count) ORDER BY d.day),
		'[]'::json
	)
	INTO v_daily_ticket_counts
	FROM (
		SELECT
			gs.day AS day,
			TO_CHAR(gs.day, 'YYYY-MM-DD') AS day_label,
			COALESCE(c.count, 0) AS day_count
		FROM GENERATE_SERIES(v_range_start, v_today, INTERVAL '1 day') AS gs(day)
		LEFT JOIN (
			SELECT "createdAt"::date AS day, COUNT(*) AS count
			FROM "ticket"
			WHERE "createdAt" >= v_range_start
			GROUP BY 1
		) c ON c.day = gs.day::date
	) d;

	RETURN JSON_BUILD_OBJECT(
		'totalTickets', v_total_tickets,
		'openTickets', v_open_tickets,
		'resolvedByAiCount', v_resolved_by_ai_count,
		'resolvedByAiPercent', CASE
			WHEN v_total_tickets > 0 THEN (v_resolved_by_ai_count::float8 / v_total_tickets) * 100
			ELSE 0
		END,
		'avgResolutionMs', v_avg_resolution_ms,
		'dailyTicketCounts', v_daily_ticket_counts
	);
END;
$$;
