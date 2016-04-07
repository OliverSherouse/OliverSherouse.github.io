---
title: Why aren't you using make for your data projects?
---

Data work can take a long, long time. Once you've moved beyond small scale projects, you just have to get used to doing something else while your machine chugs away at cleaning, preparing, or analyzing your data. And since most of the time you have to try a few things to see what comes out, you'll have to do sit and wait through multiple rounds of each step.

But a lot of people make it worse by doing one of two things: either they have one big script which they re-run from start to finish every time they make a change, or they run each step on-demand (say, in an Jupyter notebook), and mentally keep track of what they need to do in what order.

The first is bad because every single run will take the whole run time, and your life will be swallowed up in waiting. The second is bad because you have to depend on yourself to keep what can be a pretty intricate map of your analysis flow in your head.

The Unix utility [Make] provides a better solution. Make is the old standard build system, designed to help with the compilation of large programs. Just like with data projects, compiling large programs takes forever, has a variety of smaller steps where you might need to go back and edit something, and has a web of dependent steps you might need to re-run depending on what you've changed. In other words: it's a perfect fit.

What's more, Make helps you keep your steps separate computationally, which helps *you* keep them clear conceptually. You don't even have to use the same language with each step: I've had occasion to mix Python, Scala, and *Stata* in the same project,[^project] and make made that much less painful.

And here's the good news: if you're on a Mac or Linux, it's probably already installed. On windows, just install [Gow].

So how does it work? The basic idea is, you write a *makefile* filled with *recipes* that tell you how to *make* a *target*. Each target can have *dependencies*, and if a dependency has been modified more recently than the target, the recipe for the target gets re-run.

So let's say I want to classify some text in a folder, using some trainers in another folder. Both have to be prepped for analysis, using a script in my scripts subdirectory. I might put the following recipe in my makefile:

``` make
data/clean/trainers.csv: scripts/clean_text.py data/raw/trainers
	python -o data/clean/trainers.csv scripts/clean_text.py data/raw/trainers
```

What's going on here? The file before the colon is the target, the thing we're trying to make. The files after are dependencies, things that need to be made before the target. The line beneath, which is indented by a tab---yes, a **tab**---is the command that makes the file. Now, if we were to run `make data/clean/trainers`, make would check to see if either the clean_text.py script or the trainers directory[^directory] had been modified more recently than the output file, and if so, it would run the script to create the file.

We can write this recipe a simpler way:

``` make
data/clean/trainers.csv: scripts/clean_text.py data/raw/trainers
	python -o $@ $^
```

In a makefile, `$@` stands for the target, and `$^` stands for the list of dependencies in order. This means if our dependencies are a script and a list of arguments to that script, we can use them as a stand-in for the recipe.

Now let's say we use the same script to clean the unlabeled input. We just need to add it as a new target:

``` make
data/clean/trainers.csv: scripts/clean_text.py data/raw/trainers
	python -o $@ $^

data/clean/unlabeled.csv: scripts/clean_text.py data/raw/unlabeled
	python -o $@ $^
```

Easy! Now if we update clean_text.py, Make knows we need to remake both those targets. But I hate repeating myself. Luckily, Make gives us *canned recipes*:

``` make
define pyscript
python -o $@ $^
endef

data/clean/trainers.csv: scripts/clean_text.py data/raw/trainers
	$(pyscript)

data/clean/unlabeled.csv: scripts/clean_text.py data/raw/unlabeled
	$(pyscript)

```

In fact, since I write all my scripts based off of the same [boilerplate], let's fill out what the whole project might look like:

``` make
define pyscript
python -o $@ $^
endef

data/results/output.csv: scripts/classify.py data/classifier.pickle data/clean/unlabeled.csv
	$(pyscript)

data/classifier.pickle: scripts/train_classifier.py data/clean/trainers.csv data/trainer_labels.csv
	$(pyscript)

data/results/analysis.csv: scripts/tune_classifier.py data/clean/trainers.csv data/clean/unlabeled.csv
	$(pyscript)

data/clean/trainers.csv: scripts/clean_text.py data/raw/trainers
	$(pyscript)

data/clean/unlabeled.csv: scripts/clean_text.py data/raw/unlabeled
	$(pyscript)
```

So that's five scripts total: each reasonably separated and able to be dropped into other projects with minimal modification. If we change any of them, either because of a bug, or because we wanted to try something different, we can use make to update only those parts that are dependent on the chain. And if we just type the command `make`, it automatically makes the first recipe, so we can be sure that our output.csv is using all the latest and greatest work we've put in.

There's a lot more to Make, and I'll focus in on a few features, tips, and tricks in an occasional series here. It's been a big help to me, and if you find it helpful too, I'd love to [hear from you][twitter]!



[^project]: I said I did it, not that I'm proud of it.
[^directory]: The directory itself, mind you, not the files inside it! 

[Make]: https://www.gnu.org/software/make/manual/html_node/index.html
[Gow]: https://github.com/bmatzelle/gow/wiki
[boilerplate]: {% post_url 2015-08-21-boilerplate %}
[twitter]: http://twitter.com/OliverSherouse

