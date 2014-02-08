---
layout: post
title: Are We Over-Reacting to the Employee-Population Ratio?
---

On Twitter, my old econ prof Don Marron [points][ogtweet] to a blog post
at the New York Fed describing the employment-population ratio is a "[A
Mis-Leading Labor Market Indicator][fedpost]." For context, the E/P is a
number that people like me have been freaking out about since the
financial crisis, because it looks like this:

![Ahhhhhhhhh][empopgraph]

That bit at the end where it goes back to 1980 levels and stays there?
That's us, right now. Wave!

Samuel Kapon and Joseph Tracy, the authors of the Fed post, argue that
people like me, who react to this graph by openly weeping, are
over-reacting because we aren't taking into account changing
demographics. And to prove their point, they undertook a workmanlike
study of the employment patterns of different groups:

> To explore this question, we take all individuals age sixteen or older
> from the Current Population Survey Outgoing Rotation Group samples
> from January 1982 to November 2013. This gives us monthly data with
> 10.2 million observations on individuals and their employment status.
> We divide these individuals into 280 different cohorts defined by each
> individual's decade of birth, sex, race/ethnicity, and educational
> attainment. We assume that individuals within a specific cohort have
> similar career employment rate profiles. We use the 10.2 million
> observations to estimate these 280 career employment rate profiles.

Kapon and Tracy take these cohorts, recombine them to render an
estimated E/P ratio based on demographics. Plotting that against the
actual E/P ratio, we see that we’re not that far off after all:

[![Kapon and Tracy's Estimated E/P][estep]][fedpost]

Well, there you go: we’re not in great shape, but things aren't
apocalyptic either.

The problem is that you can't do that. Let's walk through the steps
Kapon and Tracy took:

1.  Disaggregate a series into constituent groups
2.  Get average behavior for those groups
3.  Recombine the groups according to their proportions
4.  Draw conclusions from the fact that the estimated series is close to
    the observed series

That's a tautology: that analysis literally can't yield anything but a
trend, because they've included all the sample data from the period
they’re observing. Saying that we don't need to worry about people not
working because people right now have a pattern of not working doesn't
tell us anything. It's the pattern that we’re worried about!

To illustrate, here's a simple quadratic fit of the employee population
ratio on the same scale as Kapon and Tracy's graph:

![Quadratic fit of E/P
ratio][quadfit1]

I feel bad, because Kapon and Tracy went through a lot of work to
basically make that graph. But if we were to only use the data before
the latest recession to get our fitted line—I used through January of
2009, you get a different picture:

![Quadratic fit of E/P ratio through 2009][quadfit2]

Wow, now we’re way below trend, even taking into account the inverse
U-shape we expect from an aging workforce. Here's the difference between
predicted and observed E/P when you use all data to predict, and also
when you stop before 2009.

![Difference between predicted and actual E/P ratio using two fits][quadfit3]

So there's two lessons here. First, you can't draw any conclusions by
using data to predict itself. You just can't.

Second, the E/P Ratio is way, way below where it should be. While
demographics should absolutely be taken into account, they’re just not
enough to turn what we’re seeing into standard post-recession behavior.

[fedpost]: http://libertystreeteconomics.newyorkfed.org/2014/02/a-mis-leading-labor-market-indicator.html
[ogtweet]: https://twitter.com/dmarron/status/430391508739448833
[empopgraph]: http://research.stlouisfed.org/fredgraph.png?g=rSW "Ahhhhhhhhh"
[estep]: /img/estimated-empop.jpg "Kapon and Tracy's estimated E/P"
[quadfit1]: /img/quad-fit-emratio-kapontracy.png "Quadratic fit of E/P ratio"
[quadfit2]: /img/quad-fit-emratio-kapontracy2.png "Quadratic fit of E/P ratio through 2009"
[quadfit3]: /img/quad-fit-emratio-kapontracy3.png "Difference between predicted and actual E/P ratio using two fits"
