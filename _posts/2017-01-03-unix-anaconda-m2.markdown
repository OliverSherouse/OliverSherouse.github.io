---
title: Get a Decent Unix Toolkit on Windows With Anaconda
---

I'm a Linux guy at heart, but like a lot of folks, I'm stuck on Windows
at work. But even on Windows, I spend a lot of time in the command line.
Now, the whole point of Windows was to get away from the command line,
so the default command prompt, `cmd.exe`, has never been much more than
a glorified DOS shell. The alternative for power users, PowerShell, is
something I've always found to be confusing and terrible.

I want my Unix tools, dang it! And, open source being open source, there
have been a few attempts to make that happen, most notably
[Cygwin](https://www.cygwin.com/) and [MinGW](http://www.mingw.org/).
But while those are certainly impressive projects, they're not something
I want to try to keep updated for my team, or document for researchers
who I want to use my scripts; the install and update tools are just too
complicated for that.

Happily, [Anaconda](http://www.mingw.org/) is there to save the day.
Again[^1] . The Anaconda default channels include a suite of tools built
with M2, a project descended from MinGW. That means that not only do you
get to manage the tools you want with the excellent conda package
manager, but you also can easily reproduce your environment elsewhere
using conda requirement files. And no administrator privileges needed!

There's only one drawback, which really isn't a drawback: you can't run
m2-based programs in the default anaconda environment. Why isn't that
really a drawback? Because it keeps your path clean if you ever need to
be using the Windows built-in tools instead of Unix ones that happen to
have the same name.

To install m2 (assuming you have Anaconda already installed), just
create a new conda environment or switch to one that already exists.
Then install the `m2-base` package. I have one environment called "main"
which I use when I'm not isolating requirements on a project for
release. You can create one by running this command (replacing `main`
with the desired name):

``` {.cmd}
conda create -n main m2-base
```

Now, whenever you want to use your Unix tools, just run `activate main`
(or whatever you called the environment).

Or, if you have an environment you want to use already, just activate it
and `conda install m2-base`.

That will give you all the [coreutils](https://www.gnu.org/software/coreutils/manual/coreutils.html), as well as bash if you want to use
that. And, while this gives you a perfectly good base system, there are
plenty of more tools, like
[make]({{site.url}}/2016/04/07/makefiles.html). Just run
`conda search m2-.*` to see them all.

Is it as good as using Linux? No. No it is not. But as far as I can
tell, it's the next best thing.

[^1]: If you aren't using Anaconda to manage your Python environment on
    Windows, you really, really should be. Start
    [here](http://anaconda-installer.readthedocs.io/en/latest/intro.html).

