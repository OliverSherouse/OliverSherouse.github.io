---
title: "Jupyter Notebooks Can't Fix the Scientific Paper"
---

[This piece](https://www.theatlantic.com/science/archive/2018/04/the-scientific-paper-is-obsolete/556676/) in the Atlantic has been making the rounds, suggesting that Jupyter notebooks are "what comes next" as the scientific paper goes the way of legal vellum and religious papyrus. The argument runs something like this: most of the actual work of science is computational. Notebook environments give an excellent environment for doing replicable computation while also interspersing explanatory text, and Jupyter notebooks are the best ones around. This clears away the need for much of the gobbledygook for which scientific papers are so widely criticized, and puts the work front and center. 


And some of that is right. Jupyter is amazing; my team and I are actually working right now to build a Jupyter-based research platform for our organization. And well-documented Jupyter notebooks are certainly a step up over incomprehensible do files that we see with many papers, especially when they're augmented with simple controls to modify parameters, for example. 

But the problem with this line of thinking is that it gets the basic point of a scientific paper wrong. The computation is *not* the most important part of a paper. The most important part is the writing. 

A paper should do three things:

1. Orient the reader to the current state of knowledge
2. Offer relevant evidence
3. Integrate the evidence to produce a new current state of knowledge

Computations happen, if at all, in number 2. Jupyter's great for presenting that. Jupyter doesn't help at all for numbers 1 and 3, and they are equally as important, if not more so. What helps them---and really the only thing that helps them---is clear thinking and writing.

Now, obviously you can *have* text in a Jupyter notebook. You have Markdown and HTML, and that's a lot! But Jupyter is not a writing environment. There's no formatting help if you forget the Markdown syntax. You can't track changes or get comments easily from your peers or coauthors. You can't manage your bibliography. And it's just not a pleasant interface for composing text.

For that matter, it's also not great for *reading* text. The lines are too long, for one thing. You can't easily jump to the footnotes and back, like you can in a well-formatted PDF. There aren't columns, and can't be. 

That's not really a criticism; that's not what Jupyter is *for*.  It has text support for writing short bits of text that are secondary to the computational work.  But let's not pretend that Jupyter will ever be an excellent replacement for ~~Word~~ Vim on the editing side, or a $$\LaTeX$$ PDF on the reading side.

So, if not notebooks, is there something that can replace the crappy scientific paper? At the risk of being dull, how about: the *good* scientific paper? Papers where introductions and conclusions aren't unnecessarily ponderous, where the evidence is delivered with minimal gobbledygook and presented in a replicable way[^help], and implications are explored with straightforwardness and intellectual humility?

Of course, that's what we're supposed to be doing now. John H. Cochrane has a [wonderful write-up](http://tertilt.vwl.uni-mannheim.de/phd/phd_paper_writing.pdf) on how to do it in economics[^science]. And there are good examples out there. Watson and Crick's paper introducing the double-helix structure of DNA? It's [one page long](http://www.sns.ias.edu/~tlusty/courses/landmark/WatsonCrick1953.pdf). Including a picture.

Now, if we don't do that in the future, it'll be for the same reason we don't do it now. Journals and peers don't make us. Publish-or-perish puts more emphasis on producing papers than on producing good papers. Papers are written to be published, not read.

Fixing that technology---the institutional, meta-technology of publishing, would fix the scientific paper. But I don't think Jupyter Notebooks, glorious powerful magic though they are, can do that.

[^help]: Jupyter can help with this!
[^science]: *NOT SCIENCE LOL!* I know, I know.
