# Umami analytics

Analytics stays disabled until analytics-config.js contains the public website ID
and exact production hostname(s). Use the script URL from Umami’s tracking snippet.
Never add a secret API key. The dashboard is https://cloud.umami.is and requires
the owner's Umami login; do not enable a public share link for private reports.

Pageviews use synthetic /planner/<page> paths, including the main sidebar's
system tabs and Jelly workspace tabs. Smaller controls inside individual tools
are not all instrumented. Save imports report success/failure (automatic session
restores excluded). Jelly optimization reports started/completed/failed/cancelled.
Other optimizer lifecycles can be instrumented through PlannerAnalytics.event.

active_time events contain incremental seconds: sum seconds by page, rather than
counting events or treating Umami's default duration as this active-time metric.
Timing stops when hidden or after 60 seconds without input. Events flush every
30 seconds and on navigation/hide; final events may be lost on browser shutdown.
Application errors are generic and capped at five per page load; no error text,
save contents, DOM text, query strings, hashes, or user identifiers are collected.
Referrers are reduced to origins. No replay or heatmap tracking is enabled.

The hostname allowlist excludes local previews. Do Not Track, Global Privacy
Control and the privacy page's browser opt-out disable analytics. An unavailable
or blocked tracker does not stop the planner. A bounded in-memory queue handles
script loading; it is discarded on tracker failure.

Activation checklist:
1. Fill analytics-config.js from the owner's Umami website settings.
2. For hosts honoring _headers, permit the supplied script and ingestion origins
   in script-src/connect-src. GitHub Pages does not consume this headers file.
3. Run node test-analytics.js and npm run build, then deploy the built site.
4. Visit the production site and inspect Umami for /planner/home, navigate between
   systems, import a save and run Jelly optimization. Confirm expected events and
   active_time seconds, and verify the network payload excludes save contents.
5. Verify the opt-out stops requests after reloading the planner. Keep the Umami
   dashboard private. Traffic before installation cannot be recovered.
