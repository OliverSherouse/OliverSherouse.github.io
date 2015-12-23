---
layout: post
title: "Quick Tips: An Easy Way to Make Slideshows from Jupyter Notebooks"
date: 2015-10-27
---

[Jupyter] seems to be working towards support for converting notebooks to [Reveal.js] slideshows, but it's not working quite yet, at least for me. Luckily, there's a pretty easy way to turn your Jupyter notebooks into slideshows not only with Reveal, but also S5, DZSlides, Slidy, Slideous, or the latex beamer package: [Pandoc].

Pandoc is a document converter that can read a good number of formats and turn them into an even greater number. The idea is to use `nbconvert` to convert your notebook to markdown---which, if anything, is Pandoc's native language---and use Pandoc to convert to the slide format of your choice.

Here's the one liner:

{% highlight bash %}
nbconvert --to markdown --stdout path/to/notebook.ipynb | pandoc -Ss -t revealjs -o slides.html
{% endhighlight %}

The `-Ss` handles smart quotes and produces a standalone file. You can change the `-t` format to whatever slide engine you want. If you would like your lists to appear incrementally, add the `-i` flag to the `pandoc` command, like so:

{% highlight bash %}
nbconvert --to markdown --stdout path/to/notebook.ipynb | pandoc -Ssi -t revealjs -o slides.html
{% endhighlight %}

This works well for me with images and code blocks. You do have to keep in mind [the way Pandoc parses markdown for slides][sliderules], but it's pretty simple. The thing to keep in mind is that the highest-level header that is followed by non-header content is the slide-level title, the level above that becomes the section-level title, and levels below that are in-slide headers. You can actually get a fair amount of customization with Pandoc options, like the location of the slide libraries or slide themes, but I'll leave that as an exercise for the reader.


[Jupyter]:http://jupyter.org/
[Reveal.js]:https://github.com/hakimel/reveal.js
[Pandoc]:http://pandoc.org/
[sliderules]:http://pandoc.org/README.html#producing-slide-shows-with-pandoc 
