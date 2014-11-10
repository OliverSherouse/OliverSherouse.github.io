---
layout: post
title: "Can We Really Say Voter ID Suppressed Turnout?"
date: 2014-11-10
category: ppe
---

In a post dramatically entitled *[Voter Suppression in 2014]*, Sean McElwee of
the think tank Demos argues that early statistics[^mcdonald] already
suggest that meaningful numbers of voters were wrongly disenfranchised. He
makes three points: first, that the number of people who cannot vote because
they committed a felony was high relative to some victory margins; second, that
states with voter ID laws saw suppressed turnout, and third, that states with
same-day registration had higher turnouts.

I want to focus on the second point there, because it's been a hot-button issue
lately, and because I'm more skeptical than most people that voter ID makes
much of a difference[^nefarious]. McElwee's tries to demonstrate his point by
graphing the mean voter turnout among states in three pools: those which
require photo ID, those which require non-photo ID, and those with no ID
requirement[^data].

![mean]

Mean turnout was highest in the no-ID states, and higher in the (presumably
less restrictive) non-photo ID states than in the photo ID states. Case closed,
right?

Not exactly. To use statistics like this to make a real point, you have to
remember that you're got an incredibly small sample size. What we really want
to know is whether the variance between groups is bigger than the variance
across groups.

For example, here's another version of that graph, but I've added confidence
intervals:

![mean-ci]

The idea here is that, if you tell me which group a state is in, I
can be 95% sure, statistically, that the voter turnout for that state fell
between the top and bottom of the black line. You can see that there's a lot of
overlap. A turnout of 38 percent, say, wouldn't be out of line for any group.

Maybe we'd be better off if we didn't look at the mean, but rather the
median---the state that ranks exactly in the middle of its group in terms of
turnout.  This takes care of any outliers---observations that aren't
characteristic of the group as a whole:

![median]

Whoops! Now the suppression story doesn't fit at all. There's almost no
difference between photo ID states and no-ID states, and non-photo ID states do
worse for some reason. Of course, at this point, we start to suspect that it's
not so much a reason as chance, and other unexplained factors that affect
turnout.

Heck, let's do one more. Here's a box plot:

![box]

The line in the middle is the mean---same as the first graph. The box
represents the middle 50 percent of the states in that group. Finally, the
lines (called "whiskers") represent the entire range across the group, up to
one and a half times the spread of the middle 50 above and below the mean.

Here we see an important point: there are two dots in the no-ID group that are
so much higher than the rest that they fall outside that
mean-plus-one-and-a-half-times-middle-fifty range. Those dots happen to
represent Maine and Wisconsin, which had particularly high turnouts, and which
pulled the mean of the no-ID group up quite a bit. Now, looking across the
whole distribution, that data point looks a lot less compelling.

This all amounts to a huge statistical nothingburger. As more data comes out,
I'm sure more careful analyses will be run on the numbers to see whether we
think voter ID laws were important to the election. My bet's on the null
hypothesis, but I might be wrong.

But let's not excite ourselves about statistically meaningless charts just yet,
shall we? 


[^mcdonald]: The turnout numbers come from Michael P. McDonald, a professor at
    the University of Florida, and his website,
    [electproject.org](http://www.electproject.org/).

[^nefarious]: I believe some nefarious folks have tried to use voter ID to
    improve their chances in elections, I'm just skeptical that it worked.

[^data]: I put the data and script I used to create these charts in a [GitHub
    repository](https://github.com/OliverSherouse/voter_turnout_2014_post)
    for anyone who's interested.

[Voter Suppression in 2014]: http://www.demos.org/blog/11/6/14/voter-suppression-2014
[mean]: /img/voter_turnout_2014/mean.png
[mean-ci]: /img/voter_turnout_2014/mean_ci.png
[median]: /img/voter_turnout_2014/median.png
[box]: /img/voter_turnout_2014/box.png
