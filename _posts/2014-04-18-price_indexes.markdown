---
title: "Comparing Price Indexes"
layout: post
date: 2014-04-18 10:00:00
---

FRED, the excellent [Federal Reserve Internet Database][FRED] has a new
[blog][FRED Blog], the goal of which seems to be to post interesting graphs and
not say anything too controversial about them. 

Recently, the FRED bloggers produced a post about the [various price indexes
used to measure inflation][FRED post].  There are lots of laws indexed to
inflation---tax brackets, Social Security benefits, &c.---and small changes in
how you measure it can matter quite a bit. 

FRED identified three qualifications for a good price index in a policy
context.  An index, in their view, needs to: cover a sufficient part of the
economy, be available immediately, and not pick up too much noise from price
changes in particular products.

To see which performs best, they produced a chart with four different price
indexes: the Consumer Price Index (CPI) for all items, the Consumer Price Index
less food and energy, the Personal Consumer Expenditures (PCE) chain-type
index, and the GDP deflator:

![FRED chart]

I think this is a bad chart, for two reasons: they use numbers indexed to
different years (1982-84 for the CPIs, 2009 for the others), and because
they've left off two increasingly mentioned options: the chained CPI and the
chained CPI less food and energy.  Here's a chart with those two added, and
everything indexed to 2000, which is when those two series became available:

![Six Series]

That's also a bad chart, because there's too much stuff on there.  But there
are two big standouts: First, the simple CPI increases way faster than
everything else.  In fact we've [known for a while][Boskin Comission] that the
CPI actually over-states inflation, so it's almost certainly not our best
option. The Chained CPI less food and energy also seems like an outlier,
probably because it's excluding a large part of the economy. That seems like a
violation of the Fed's "cover as much of the economy as you can" qualification,
so let's get rid of it and the regular CPI Less Food and Energy as well.  That
leaves us three options: PCE, GDP deflator, and the chained CPI:

![Three Series]

And here's what we get if we look at annualized inflation for those three
series:

![Inflation]

Now, those three lines pretty clearly tell similar stories, so we're getting
into "close enough for government work" territory, here.  The PCE and chained
CPI are both jumpier, and show a big spike in inflation in 2008 and a big drop
towards *deflation* in late 2008-2009.  The deflator is calmer, and the
financial crash looks more like a steady decline.

Ultimately, my instinct has always been to use the GDP deflator, exactly
because it covers the entire economy and not some arbitrary basket of goods.
The jumpiness of the chained CPI and PCE, especially when you look at the
financial crisis, strike me as pulling in a lot of noise along with the signal.
But in any case, all three---the deflator, PCE, or chained CPI---seem to be
significantly more reliable than the plain old CPI.  Which, unfortunately, is
what we currently use to index almost everything.

[FRED]: https://research.stlouisfed.org/fred2/
[FRED Blog]: http://fredblog.stlouisfed.org/
[FRED post]: http://fredblog.stlouisfed.org/2014/04/price-indexes-for-policy/
[FRED chart]: http://research.stlouisfed.org/fred2/graph/fredgraph.png?g=wic
[Six Series]: /img/price_indexes_six_series.png
[Boskin Comission]: http://en.wikipedia.org/wiki/Boskin_Commission
[Three Series]: /img/price_indexes_three_series.png
[Inflation]: /img/price_indexes_inflation.png
