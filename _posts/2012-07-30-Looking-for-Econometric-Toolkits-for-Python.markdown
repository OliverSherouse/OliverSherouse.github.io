---
layout: post
title: Looking for Econometric Toolkits for Python
date: 2012-07-30 10:00:00
---
Most people learn econometric analysis using one of several standard and
venerable statistics programs:  SAS, Stata, SPSS, maybe a few others.
 And to be sure they get the job done.  
  
But let's be honest; they're pretty terrible as languages.  They feel
like programming in a 1980s-era language. SAS data loops are ridiculous.
 Stata's a bit better, but the format of commands is clumsy.  Perhaps
worst of all, none of these really work well with a decent editor like
vim.  
  
What's more you have to pay for them.  That's not bad in and of itself
but one would imagine that there have to be open source equivalents.
It's just math, right?  
  
Well, it turns out that there are a few open source replacements.  The
most well known is probably [R](http://www.r-project.org/).  But R isn't
really better as a language: it's also quite old, and modeled after a
proprietary language called S.  And it's really not primarily made for
econometric analysis, although Grant Farnsworth has written an
[excellent
manual](http://cran.r-project.org/doc/contrib/Farnsworth-EconometricsInR.pdf)[PDF] if
you want to go down that route.  
  
But in an age of SciPy, you'd have to imagine that there's a good Python
option right?  Unfortunately, there doesn't seem to be, or at least not
in a final form.  But there's a decent stack that you can bring together
that, all told seem to make up a great SAS/Stata replacement.  Here's
what I've found:  
  

-   [NumPy](http://numpy.scipy.org/) for its math and data handling
    capabilities
-   [Pandas](http://pandas.pydata.org/) for its data structures
-   [StatsModels](http://statsmodels.sourceforge.net/) for its
    statistical modeling and testing capabilities (this is the heart of
    it all, of course)
-   [MatPlotLib](http://matplotlib.sourceforge.net/) for data
    visualization
-   [IPython](http://ipython.org/) as an interactive prompt.  This works
    especially well with MatPlotLib

I'm new to basically all of these.  I've heard about IPython for a
while, but never really saw the advantage of the clutter over a
well-configured python prompt until I used it with MatPlotLib.  But it's
exciting, and my early explorations say that this will be as powerful a
stack as I could hope for.

  

If I can figure it out.
