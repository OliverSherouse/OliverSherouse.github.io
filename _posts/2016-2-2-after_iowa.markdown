---
layout: post
title: "After Iowa: How Did the 430 Forecast Perform?"
---
So how did my [430 model] do? On both sides the 30-day version was significantly worse than the 4-day. That makes sense; there was a lot of polling in the final days, and a good number of voters wait until the end of a campaign to make up their minds already.

On the Democratic side, the race looked like a coin flip, with the odds very, very slightly in Clinton's favor. As it turns out the race is being called (by Sanders, at least) a [virtual tie], and in fact several delegates *were* awarded on [coin flips][flips][^coins]. Martin O'Malley over-performed in the model; seems like none of his people bothered to show up.

On the Republican side, the 430 model far overestimated Trump's chances, and underestimated both Cruz and Rubio. It's a great example of "garbage in, garbage out." The polls overestimated how many of Trump's voters would turn out (and how few of Cruz's would), so the model did the same. With Rubio, I think, what happened was a little different: he surged very late and very fast, and there just weren't many polls at the right time to catch it.

So, should we change the model at all? Maybe we should assume all Trump results are inflated (which I feel is probably true) and deflate them by some amount. That feels pretty arbitrary, though, and we'd probably overcompensate anyway. Or we could try to see which pollsters are the best and weight accordingly. That also seems prone to over-fitting, though, unless you want to go the full 538. So I don't think I'm going to try to add too much sophistication in it that way.

I *do* think I may fool around both with the time-weighting function, which was more or less pulled out of a hat, and with the window. It may be that, instead of looking at a time-window (so, all polls in the last 30 days), it would be more helpful to look at a number-of-polls window, still weighted by time-delay. That way, as we get closer to elections and more polling happens, we zero in automatically. I'll probably put out a new version for New Hampshire and see what that looks like.

And you should, too! The notebook is available [here][notebook], so feel free to make your own version and let me know on [Twitter] if you come up with anything interesting!

[^coins]: The Clinton campaign won 6 of 6 tosses, the odds of which are only 1 in 64. But surely if the Clinton camp were sharp enough to pre-supply unfair coins they would have won outright, right? Right?

[430 model]: {{site.url}}/2016/02/01/poll_forecast.html
[virtual tie]: http://www.huffingtonpost.com/entry/bernie-sanders-iowa_us_56b03247e4b057d7d7c7fcfa?dyytlnmi
[flips]: http://www.theguardian.com/us-news/2016/feb/02/how-hillary-clinton-won-some-iowa-caucuses-with-a-coin-toss
[notebook]: http://nbviewer.jupyter.org/github/OliverSherouse/blog_notebooks/blob/master/430%20Model.ipynb
[Twitter]: http://twitter.com/OliverSherouse
