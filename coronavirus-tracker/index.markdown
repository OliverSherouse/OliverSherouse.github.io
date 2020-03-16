---
layout: nonpost
permalink: '/coronavirus-tracker/'
title: Coronavirus Tracker
---

This page shows a number of ways to track the spread of the COVID-19 virus,
primarily in the United States. Because the US is larger than most countries
both in population and geographically, it seems to me to make the most sense to
compare US states to other countries. The source data also breaks out provinces
in Australia and Canada; so those are included in these charts as well. China is
excluded from these charts because its experience of the pandemic was somewhat
unique and I don't think it makes a good comparison.

Data updates daily from the [Johns Hopkins University Center for Systems Science
and Engineering](https://github.com/CSSEGISandData/COVID-19). I'll be updating
the charts with new features and ways of looking at the data as I think of them
and have time to implement. Feel free to let me know if you think of any
features that would be helpful on [Twitter](https://twitter.com/OliverSherouse).

## Confirmed Cases in Country or States with Outbreaks

<canvas id="virus-tracker-log-cases-regional"></canvas>

## Growth Rate of Confirmed Cases in Countries or States with Outbreaks.

<canvas id="virus-tracker-pct-change-regional"></canvas>
<script src="https://cdnjs.cloudflare.com/ajax/libs/Chart.js/2.9.3/Chart.js" integrity="sha256-nZaxPHA2uAaquixjSDX19TmIlbRNCOrf5HO1oHl5p70=" crossorigin="anonymous"></script>
<script src="https://gmousse.github.io/dataframe-js/dist/dataframe.min.js"></script>
<script src="/js/virusTracker.js"></script>

## FAQ

### Are you an epidemiologist?

No. I'm a data guy, and I'm just visualizing the data we have for myself and
anyone else who would find it interesting.

### Isn't this data worthless because tests are unavailable?

It's possible, though the patterns at this moment don't seem artificially
constrained to me. This is the best data I know of, so it's what I'm using.
