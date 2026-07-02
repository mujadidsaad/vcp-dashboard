"""Content sections for the swing trading playbook.

Each function returns a list of (kind, ...) tuples consumed by
generate_playbook.render().
"""

# ---------- Section 0: Cover ----------

def cover():
    return [
        ("title", "Swing Trading Playbook"),
        ("subtitle",
         "A structured workflow combining the VCP screener (base &amp; breakout setups) "
         "with the Strong-Start RVOL dashboard (participation &amp; momentum) to find, "
         "size, and manage swing trades on Indian equities."),
        ("hr",),
        ("space", 8),
        ("body",
         "<b>Timeframe:</b> Swing trades held from 2 days up to 6&ndash;8 weeks, planned on the daily chart.<br/>"
         "<b>Universe:</b> NSE / BSE equities (from the app's built-in universes).<br/>"
         "<b>Tools used:</b> VCP Screener tab and RVOL Screener tab of this dashboard."),
        ("note",
         "<b>Disclaimer.</b> This document is educational material summarising well-known "
         "swing-trading conventions (Minervini/O'Neil-style VCP, Wyckoff volume analysis, "
         "and the Strong-Start concept popularised by Manas Arora). It is not personalised "
         "investment advice. Markets involve substantial risk; you are solely responsible "
         "for your trades. Back-test rules on your own history before risking real capital."),
    ]


# ---------- Section 1: Big Picture ----------

def big_picture():
    return [
        ("h1", "1. The Big Picture"),
        ("body",
         "You are hunting for stocks that (a) have already proven demand exists &mdash; a rising "
         "trend and a tightening base &mdash; and (b) are showing fresh institutional participation "
         "right now, via unusually heavy volume and a Strong Start."),
        ("body", "The playbook has four phases:"),
        ("bullet", "<b>Scan</b> &mdash; narrow the universe using VCP + RVOL filters."),
        ("bullet", "<b>Qualify</b> &mdash; apply the 8-point checklist to every candidate."),
        ("bullet", "<b>Enter</b> &mdash; buy at the breakout with pre-defined risk."),
        ("bullet", "<b>Manage</b> &mdash; trail the stop, hit the target, or cut the loss."),
        ("body",
         "You should be in cash by default. Only when a candidate ticks every box do you take a position. "
         "Time in the market matters less than <i>quality of setups you took</i>."),
    ]


# ---------- Section 2: Screeners ----------

def screeners():
    return [
        ("h1", "2. What the Two Screeners Tell You"),

        ("h2", "2.1 VCP Screener"),
        ("body",
         "The VCP (Volatility Contraction Pattern) screener finds stocks in a healthy uptrend that "
         "are digesting recent gains through progressively tighter pullbacks. Each stock is scored "
         "0&ndash;100 across trend, base, and volatility checks and graded A+ down to Rejected."),
        ("body",
         "Use it to answer: <b>Is the base of this stock structurally ready to break out?</b>"),

        ("h2", "2.2 RVOL Screener (Strong-Start Dashboard)"),
        ("body",
         "RVOL measures <i>today's</i> volume against the 20-day average. A ratio &ge; 1.5 means "
         "unusual participation. The Strong-Start (&#9733;) flag fires when the stock opens above "
         "the previous close and holds &ge; 99.5% of it &mdash; a footprint of buyers refusing to "
         "give back the gap."),
        ("body",
         "Use it to answer: <b>Are institutions actually acting on that base today?</b>"),

        ("h2", "2.3 Why combine them"),
        ("body",
         "VCP alone can leave you buying setups that never trigger. RVOL alone can chase newsy "
         "spikes with no base. Together, VCP tells you <i>where</i> a real move is likely, and "
         "RVOL tells you <i>when</i> the move is starting."),
    ]


# ---------- Section 3: Daily Workflow ----------

def workflow():
    return [
        ("h1", "3. Daily Workflow"),
        ("body",
         "Run this routine once per day, ideally after 10:30 AM IST when the opening auction "
         "dust settles. It should take 15&ndash;25 minutes end-to-end."),
        ("table", [
            ["Step", "What to do"],
            ["1. RVOL scan",
             "Run RVOL Screener on <b>All Stocks</b>. Sort by <b>RVOL (highest)</b>. "
             "Note the top 30&ndash;40 tickers with RVOL &ge; 2.0 and Chg% &ge; +1.5."],
            ["2. Strong-Start filter",
             "Toggle <b>Only &#9733; rows</b>. Narrows to stocks that opened up and held. "
             "Usually 5&ndash;15 names remain."],
            ["3. VCP cross-check",
             "Switch to VCP Screener, universe = <b>Nifty 200</b> (or Total Market if you have time). "
             "Filter by <b>Grade &ge; B Watchlist</b> and min score &ge; 65."],
            ["4. Intersect",
             "Only trade names that appear in <b>both</b> lists. That's your day's shortlist "
             "&mdash; typically 1&ndash;5 tickers."],
            ["5. Chart",
             "Open each on a daily chart. Look for a clean base, at least two tightening contractions, "
             "price above the 50-DMA, and today's bar breaking the pivot on volume."],
            ["6. Log",
             "Note pivot high, planned stop, target, and position size <b>before</b> placing the order."],
        ]),
        ("note",
         "If the market itself is weak (Nifty below 50-DMA and 20-DMA sloping down), skip the day. "
         "Individual setups seldom work in a broken tape &mdash; see Section 8."),
    ]


# ---------- Section 4: 8-Point Checklist ----------

def checklist():
    return [
        ("h1", "4. The 8-Point Qualification Checklist"),
        ("body",
         "A trade is only taken when ALL eight are &#10003;. If even one fails, drop the name "
         "and move to the next candidate."),
        ("table", [
            ["Check", "Rule"],
            ["1. Trend",
             "Close &gt; 50-DMA <b>and</b> 50-DMA &gt; 200-DMA. No exceptions."],
            ["2. Prior move",
             "Stock has advanced &ge; 25% at some point in the last 12&ndash;24 weeks (real uptrend to consolidate)."],
            ["3. Base depth",
             "Deepest pullback in the base &le; 30% (ideally 15&ndash;25%)."],
            ["4. Contractions",
             "&ge; 2 contractions, each retracement smaller than the previous "
             "(e.g. 20% &rarr; 12% &rarr; 7%). The VCP card shows the count."],
            ["5. Volatility",
             "Volatility Decrease % positive; the latest contraction happens on <i>low</i> volume."],
            ["6. Pivot",
             "A clean recent high (the pivot) with 2&ndash;5 sessions of tight closes just under it."],
            ["7. Breakout day",
             "Today's bar breaks the pivot on RVOL &ge; 1.5 (ideally &ge; 2.0)."],
            ["8. Strong Start (bonus)",
             "&#9733; flag on the RVOL screener. Not strictly required but strongly preferred."],
        ]),
        ("note",
         "If you can only find B-grade names, sit out. Boredom is not a signal."),
    ]


# ---------- Section 5: Risk & Position Sizing ----------

def risk_and_size():
    return [
        ("h1", "5. Risk &amp; Position Sizing"),
        ("body",
         "Everything downstream &mdash; entries, targets, exits &mdash; only works if position size is "
         "correct. Size <i>from</i> risk, never from the amount of cash you feel like deploying."),

        ("h2", "5.1 The two hard limits"),
        ("bullet", "<b>Per-trade risk:</b> 0.5% to 1.0% of account equity. Beginners: 0.5%."),
        ("bullet", "<b>Portfolio heat:</b> Never more than 5 open positions or 4% total risk across all open trades combined."),
        ("bullet", "<b>Daily loss stop:</b> If you lose 3% of account equity in a single day, close the terminal for the day."),

        ("h2", "5.2 The formula"),
        ("body",
         "Once you know the entry and the stop, position size is deterministic:"),
        ("table", [
            ["Term", "Formula / Example"],
            ["Capital", "&#8377; 5,00,000"],
            ["Risk per trade", "0.75% &rarr; &#8377; 3,750"],
            ["Entry", "&#8377; 500 (pivot high + 1 tick)"],
            ["Stop", "&#8377; 470 (below latest contraction low)"],
            ["Risk per share", "&#8377; 500 &minus; &#8377; 470 = &#8377; 30"],
            ["Shares", "&#8358; 3,750 / &#8377; 30 = <b>125 shares</b>"],
            ["Notional exposure", "125 &times; &#8377; 500 = &#8377; 62,500 (12.5% of capital)"],
        ]),
        ("body",
         "If the resulting notional is more than 25% of capital, either accept lower risk (e.g. 0.5%) "
         "or skip the trade. Never widen the stop to fit a larger position."),

        ("h2", "5.3 Reward-to-risk"),
        ("body",
         "Only take setups where the initial target offers <b>at least 2:1 reward-to-risk</b>. "
         "In practice: measure the depth of the largest contraction in the base and project it up "
         "from the pivot as your first objective. If that objective is &lt; 2R away, skip."),
    ]


# ---------- Section 6: Entry Rules ----------

def entry_rules():
    return [
        ("h1", "6. Entry Rules"),
        ("body",
         "There are two acceptable entries. Pick one and stick to it &mdash; do <b>not</b> switch mid-trade."),

        ("h2", "6.1 A. Breakout entry (default)"),
        ("bullet", "Place a <b>buy-stop</b> order at pivot high + 1 tick, valid for the day only."),
        ("bullet", "It fills only if buyers push through &mdash; you're never chasing air."),
        ("bullet", "Volume on the breakout bar must be &ge; 1.5&times; the 20-day average (RVOL check)."),

        ("h2", "6.2 B. Pullback entry (advanced)"),
        ("bullet",
         "After a confirmed breakout you missed, wait for a low-volume pullback that holds at "
         "the pivot or 10-DMA, then buy the first up bar."),
        ("bullet",
         "Only valid within 5 sessions of the original breakout. Otherwise the setup is stale."),

        ("h2", "6.3 What to avoid"),
        ("bullet", "<b>No market orders at the open.</b> Wait for a 5-minute bar to form."),
        ("bullet", "<b>No averaging down.</b> If it goes against you to the stop, exit &mdash; period."),
        ("bullet",
         "<b>No entries in the last hour</b> unless the intraday range has been tight and the "
         "stock is closing at its highs (a valid late-day breakout)."),
    ]


# ---------- Section 7: Exit Rules ----------

def exit_rules():
    return [
        ("h1", "7. Exit Rules"),
        ("body", "Have all three of the following defined <b>before</b> you enter."),

        ("h2", "7.1 Initial stop"),
        ("bullet",
         "Place a hard stop-loss below the low of the latest (tightest) contraction, "
         "or below the 20-DMA &mdash; whichever is closer."),
        ("bullet",
         "This stop is <b>never</b> widened. It can only be trailed up."),

        ("h2", "7.2 First target (2R)"),
        ("bullet",
         "At +2R (two times your risk per share), sell half. Move the stop on the "
         "remainder to breakeven &mdash; you now have a free trade."),

        ("h2", "7.3 Trailing the runner"),
        ("bullet", "Trail the remaining half under the swing lows or under the rising 20-DMA."),
        ("bullet",
         "Take the stock off on a close below the 20-DMA <b>or</b> a distribution day "
         "(volume &gt; 1.5&times; average with the stock finishing red near its low)."),

        ("h2", "7.4 Full-stop exit"),
        ("bullet",
         "If your stop is hit, exit the entire position. Do not journal 'wait a bit', "
         "do not toggle to a lower timeframe. The rule was made for this moment."),
        ("h2", "7.5 Time stop"),
        ("bullet",
         "If the stock has not made a new high within 5 sessions of your entry, exit at the market "
         "on session 6. Dead money is opportunity cost."),
    ]


# ---------- Section 8: Market Regime ----------

def market_regime():
    return [
        ("h1", "8. Market Regime Filter"),
        ("body",
         "Even perfect individual setups fail in a broken tape. Before you take any trade, "
         "check the state of the Nifty 50 daily chart."),
        ("table", [
            ["State", "Action"],
            ["Nifty &gt; 50-DMA &gt; 200-DMA, 50-DMA rising",
             "<b>Full size.</b> Trade the playbook as written."],
            ["Nifty &gt; 50-DMA but 50-DMA flat",
             "<b>Half size.</b> Only A+ / A Watchlist grades."],
            ["Nifty &lt; 50-DMA",
             "<b>No new longs.</b> Manage open trades tighter (0.5R below cost as the new stop)."],
            ["Nifty &lt; 200-DMA",
             "<b>Fully cash.</b> Optionally look for short setups (out of scope for this playbook)."],
        ]),
        ("body",
         "Your job during hostile regimes is not to make money but to lose <i>nothing</i>. "
         "Sitting in cash is a position."),
    ]


# ---------- Section 9: Two Worked Examples ----------

def playbook_examples():
    return [
        ("pbreak",),
        ("h1", "9. Two Worked Examples"),

        ("h2", "9.1 A textbook winner"),
        ("body",
         "<b>Setup:</b> A midcap stock has run from &#8377; 300 to &#8377; 500 over 6 months. "
         "It then builds a 9-week base with three tightening pullbacks of 20%, 12%, and 6%. "
         "Pivot forms at &#8377; 505. On the breakout day the stock opens at &#8377; 508, "
         "holds &#8377; 505 all day, closes at &#8377; 516 on RVOL 3.4x with the &#9733; flag on."),
        ("bullet", "VCP score: 82, Grade: A+ Confirmed. Checklist: 8/8."),
        ("bullet", "Entry: buy-stop at &#8377; 506. Stop: &#8377; 478 (below 12% contraction low)."),
        ("bullet", "Risk per share: &#8377; 28. On &#8377; 5L capital @ 0.75%: 134 shares."),
        ("bullet", "First target (2R): &#8377; 562. Trailing stop on the rest under 20-DMA."),
        ("bullet",
         "<b>Outcome sketch:</b> Sold half at &#8377; 562 in 8 sessions. Trailed the runner up to "
         "&#8377; 618 over the next 5 weeks. Blended R multiple: ~3.2R."),

        ("h2", "9.2 A textbook rejection"),
        ("body",
         "<b>Setup:</b> A smallcap stock is up 90% in 6 weeks (parabolic). It shows RVOL 8x today "
         "with a &#9733;, but the &quot;base&quot; is only 4 days old and there is no prior "
         "consolidation. VCP grade: Rejected."),
        ("bullet", "Even though RVOL screams, the base structure is missing (Check #3 &amp; #4 fail)."),
        ("bullet", "<b>Action:</b> pass. Add to a watchlist to re-check in 3&ndash;6 weeks after a real base forms."),
        ("body",
         "The dashboard will surface this stock repeatedly on the RVOL side. Discipline "
         "here is what separates a swing trader from a chaser."),
    ]


# ---------- Section 10: Journaling ----------

def journaling():
    return [
        ("h1", "10. Journaling &amp; Review"),
        ("body",
         "Every trade must be logged with the numbers you decided in advance. Screenshots optional; "
         "the data columns below are not."),
        ("table", [
            ["Column", "What to record"],
            ["Date, Symbol", "Entry date and ticker."],
            ["Setup", "\"VCP breakout\" or \"pullback re-entry\"."],
            ["VCP grade / score", "From the screener at the moment of entry."],
            ["RVOL / &#9733;", "Today's RVOL ratio, and whether Strong Start fired."],
            ["Entry, Stop, 2R target", "The three numbers you pre-committed to."],
            ["Shares, &#8377; risked", "So R multiples can be computed later."],
            ["Exit, Exit reason", "\"Stop hit\", \"2R\", \"20-DMA loss\", \"time stop\"."],
            ["R multiple", "(Exit &minus; Entry) &divide; (Entry &minus; Stop) for longs."],
            ["Notes", "Any deviation from the plan (this is where you learn)."],
        ]),
        ("body",
         "Do a <b>weekly</b> review (Sunday, 30 minutes). Two questions only:"),
        ("bullet", "Did I follow my rules on every trade this week? Where did I deviate?"),
        ("bullet", "Of the setups I rejected, how did they play out? Was my filter too tight or too loose?"),
        ("body",
         "The system improves by <i>tightening the rules based on your journal</i>, "
         "not by adding new indicators."),
    ]


# ---------- Section 11: Glossary ----------

def glossary():
    return [
        ("h1", "11. Glossary"),
        ("table", [
            ["Term", "Meaning"],
            ["VCP",
             "Volatility Contraction Pattern &mdash; a base with progressively tighter pullbacks "
             "on decreasing volume. Popularised by Mark Minervini."],
            ["Pivot",
             "The most recent significant high inside the base, from which a breakout is measured."],
            ["Base",
             "A sideways or gently declining consolidation after an uptrend, typically 4&ndash;20 weeks."],
            ["Contraction",
             "A single pullback within the base measured from a swing high to the next swing low."],
            ["RVOL",
             "Relative Volume &mdash; today's volume divided by the average volume of the last N days."],
            ["Strong Start",
             "Today's open &gt; previous close, and today's low &ge; previous close &times; 0.995. "
             "Buyers refusing to give back the gap."],
            ["50-DMA / 200-DMA",
             "50-day and 200-day simple moving averages of closing price."],
            ["R",
             "Unit of risk. 1R = (entry &minus; stop) &times; shares. A +2R trade returned twice the amount "
             "you risked on it."],
            ["Distribution day",
             "A session where a major index closes down &gt; 0.2% on higher volume than the previous "
             "day &mdash; institutional selling footprint."],
            ["Portfolio heat",
             "Sum of open risk across all live positions. Cap at 4&ndash;5% of account equity."],
        ]),

        ("space", 12),
        ("hr",),
        ("space", 8),
        ("note",
         "End of playbook. This document travels with the dashboard &mdash; regenerate at any time via "
         "<font face='Courier'>python3 docs/generate_playbook.py</font>.  Edit the sections in "
         "<font face='Courier'>docs/playbook_sections.py</font> to make the rules your own; the "
         "generator will pick up the changes on the next run."),
    ]
