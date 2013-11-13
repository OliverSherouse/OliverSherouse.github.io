---
layout: post
title: The Perfect Economic Analysis Workflow
---

The way most people do economic data work is painful. You have to work with
different programs and file types, many of which are unpleasant
individually---the do file editor, the office equation editor---and few of
which work well with one another. What's worse, there's no obvious way to
organize files or keep track of changes.  What a mess.

So since ["beautiful is better than ugly"][zen], I've put together a workflow
for serious economic analysis that is coherent and straightforward. The basic
outline is this:

1.  Track sources using [BibTeX]
2.  Do exploratory work in the [IPython Notebook], using APIs to fetch data if
    possible
3.  Finalize your start-to-finish data processing, from data fetching and
    munging to statistical analysis to chart and graph creation in a Python
    script
4.  Write your prose using markdown as understood by [Pandoc], with LaTeX where
    needed
5.  Use Pandoc to create a pdf version of your paper via LaTeX
6.  When you're ready to receive feedback, upload all your source files and
    output datasets to a public repository at [GitHub]
7.  As you update your work, track changes using git

Let's take a look at each of those a bit more fully.

### Track Sources Using BibTeX

Since the first step of any meaningful research effort is an exploration of the
existing literature, a good tool to keep track of your sources is essential.
The general idea here is to track the sources you're using in a form which can
eventually be used by Pandoc to automatically format citations and save us a
lot of trouble. Pandoc supports a [number of formats][pd-cite], but I suggest
staying with [BibTeX] because it's mature, well-supported, and works well even
if we slip into raw LaTeX later on.  There are a lot of [useful
tools][bibtex-tools] to make working with BibTeX easy, but I find it just as
easy to edit the .bib file by hand.

### Explore Data Using the IPython Notebook

It took me longer than I care to admit to get the point of the [IPython
Notebook], but now that I have it's hard to imagine doing work without it. The
IPython Notebook is an interactive environment that lets you execute lines of
code, grouped into "cells", which you can re-edit and re-run as often as you
like, until you get it right. Using IPython's pylab functionality, you can
create [matplotlib] charts in-line---by far the most pleasant way to deal with
them.  You can even use markdown and html to include images and formatted text
to explain your work to yourself or to others.

This gives you a wonderful space to play around with data. In the ideal
situation, you can use libraries and APIs to download your data as required.
I'll insert here a shameless plug for my wrapper libraries for the [World
Bank][wbdata] and [BLS] APIs, but there's also good support for [FRED].
[Quandl] also looks promising, though I'll admit I haven't actually found a use
for it yet.

You can also use all your other Python data libraries, including [Pandas] and 
[Statsmodels].  Pandas, of course, has excellent import and export functions to
help you deal with any data you can't get through a nice library or API.

### Finalize Your Python Script

As you're playing around with your data, you'll want to save your constants and
functions to create your models, outputs, and graphs to a proper Python script.
If you're careful, you can download your IPython file as a script and just run
it that way, but more often you'll be developing the script and the exploratory
analysis at the same time. Generally, I use my script as a library within
IPython so that I never have to worry that I've copied my functions wrong or
anything like that.

Writing a good script to accompany an economic analysis is worth it's own post,
but the broad principles to keep in mind are:

*   Use particularly clear names for variables, and use docstrings and comments
    to explain what's going on even more than you normally would
*   To maximize replicability, use one file that can do everything from start
    to finish, from pulling the data to running your analysis, to outputting
    your final datasets and creating your plots
*   In contrast to what you would normally do with a script, don't encapsulate
    variables in a main function---or if you do, be sure to return important
    variables into the global namespace so that they can be easily accessed in
    an interactive context

### Write Prose in Pandoc's Markdown

Pandoc is a heck of a program, and it's the linchpin of the workflow presented
here. Pandoc, as its name implies, takes pretty much any kind of document and
turns it into pretty much any other kind. But for the best results for our
purposes, you'll want to write with markdown and output to a PDF using LaTeX.

Markdown is nothing but specially formatted plain text. Originally it was
intended to be converted to HTML, but Pandoc has really brought out the fact
that if you can identify italics, say, for the purposes of HTML, you can
identify them for the purposes of LaTeX or Word or whatever you like. It's
[easy to learn][markdown], and since it's plain text you can use the same
editor you use to create your Python script.

Pandoc has also included a number of [extensions][pandoc-markdown] that makes
its version of markdown particularly useful, including support for citations,
footnotes, syntax highlighting for code, and everything else you need to write
a solid paper. Perhaps most importantly, you can use raw LaTeX for math
expressions or other commands, meaning you get to use LaTeX's beautifully
simple language to write out your equations, while still getting all the
simplicity of markdown's formatting.

This also means that if, say, you output a table from a statsmodels OLS model
object in LaTeX format, you can include that table using an `\input{}` command
that will simply be ignored when converting to other formats.  The whole system
just works together, unless you want to make custom alterations, in which case
it still works together pretty well.

### Create a PDF Using Pandoc and LaTeX

In the simplest case, all you'll need to do to create a beautiful version of
your paper is run it through pandoc using a command something like this:

    pandoc -S --normalize -o mypaper.pdf mypaper.markdown

This will convert markdown to LaTeX, then compile using LaTeX. The `-S` flag
tells pandoc to use smart quotes and dashes, while the `--normaliaze` option
simply makes the output a bit cleaner technically.

If you want to do anything particularly complicated, however, such as using a
custom title page layout or post-processing the translated LaTeX to set the
size of figures, you may want to create a makefile on Linux or OSX, or a batch
file on Windows.

For example, you might have a special skeleton LaTeX file called "mypaper.tex"
with front and back matter but missing the body text, which you've written in
Pandoc. Instead, where the body text goes, your skeleton file has an
`\input{body.tex}` command.  The makefile for this on a system that uses make
might look like this:

    pdf:
        pandoc -S --normalize -o body.tex mypaper.markdown
        pdflatex mypaper.tex
        bibtex mypaper
        pdflatex mypaper.tex
        pdflatex mypaper.tex

Running `make` would convert the body text, then run the LaTeX-BibLaTeX pattern
to produce the final paper.

Again, this is really only something you have to mess with if you want to be
fancy; Pandoc's functionality will cover most of what you'll generally want.

### Release Files on GitHub

Once you've got your code, data, and prose drafted, you've got a working
product ready to share with others. The draft is usable, but you're going to
want to make controlled changes, while keeping track of why and where you got
your ideas. It seems to me that a version control system is by far the best way
to do this, and the best one going right now is [git][gitbook].

Git tracks all your files and allows you to make changes incrementally,
document the reasons for them, and even reverts specific changes without
affecting changes before or after.  Think of it as Word's track changes, but
not terrible, and you can use it for all your (text-based) files in the same
way.

Currently, the easiest way to publish your files on git is to create a public
repository on [GitHub]. GitHub is a fantastic, convenient development platform
(this blog, actually, is a [GitHub repo][siterepo]), excellent
[documentation][github-docs], and even a [tutorial][git-tutorial] to help you
learn the basics of git. And it's a particularly good platform for data, since
they've done work making data [pleasant to see][github-csv] right in the
repository itself.

### Keep Things Up-to-date

Now all you have to do is mark the changes to your code and prose as you
receive feedback from others. The nice thing about git commit messages is that
they allow you to include a fuller description of the reasons you've changed
your mind (or not changed your mind) than is usually justified in the text of
a paper. They also allow you to associate particular changes with the views of
particular people, so it's easier for you to know who to thank and for others
to recognize where contributions were really made.  When you're done working on
your paper, you can just commit your final pdf and data set, then let the files
live on the web as a fully documented contribution to economic science.

## Conclusion

I've called this the "Perfect Economic Analysis Workflow," and that is a lie.
It's not perfect; there are still little things that bug me (Copy and pasting
code between IPython Notebooks and an editor? Surely I'm missing something!),
and you might choose to substitute some tools for others. 

But I think it's pretty darned good, and hopefully it will save some time and
frustration for others.

[zen]: http://www.python.org/dev/peps/pep-0020/
[BibTeX]: http://en.wikibooks.org/wiki/LaTeX/Bibliography_Management#BibTeX
[IPython Notebook]: http://ipython.org/notebook.html
[Pandoc]: http://johnmacfarlane.net/pandoc/
[GitHub]: http://github.com/
[pd-cite]: http://johnmacfarlane.net/pandoc/README.html#citations
[bibtex-tools]: http://en.wikibooks.org/wiki/LaTeX/Bibliography_Management#Helpful_tools
[matplotlib]: http://matplotlib.org/
[wbdata]: https://pypi.python.org/pypi/wbdata
[BLS]: https://pypi.python.org/pypi/bls
[FRED]: https://pypi.python.org/pypi/fred
[Quandl]: http://www.quandl.com/
[Pandas]: http://pandas.pydata.org/
[Statsmodels]: http://statsmodels.sourceforge.net/ 
[markdown]: http://daringfireball.net/projects/markdown/basics
[pandoc-markdown]: http://johnmacfarlane.net/pandoc/README.html#pandocs-markdown
[gitbook]: http://git-scm.com/documentation
[siterepo]: https://github.com/OliverSherouse/OliverSherouse.github.io
[github-docs]: https://help.github.com/
[git-tutorial]: http://try.github.com/
[github-csv]: https://github.com/blog/1601-see-your-csvs
