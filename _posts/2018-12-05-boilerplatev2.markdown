---
date: '2018-12-05'
title: Python Data Script Boilerplate Version 2
---

A while back I wrote up a [Python data script
boilerplate](/2015/08/21/boilerplate.html) that crystallized some of the things
I found myself doing over and over. And while that boilerplate has served
surprisingly well, I've found myself regularly making a few changes, so I
figure it's probably time for an update to version two.

I'll show you the finished product first, and then walk through each chunk,
noting what I've changed[^1].

## The Boilerplate

``` python
#!/usr/bin/env python3
"""
A boilerplate script to be customized for data projects.

This script-level docstring will double as the description when the script is
called with the --help or -h option.
"""

# Standard Library imports
import argparse
# import collections
# import csv
# import itertools
import logging

# External library imports
# import pandas as pd
# import numpy as np

# Standard Library from-style imports go here
from pathlib import Path

# External library from-style imports go here
# from matplotlib import pyplot as plt

__version__ = '0.1'

log = logging.getLogger(__name__ if __name__ != '__main__ '
                        else Path(__file__).stem)


def manipulate_data(data):
    """This function is where the real work happens (or at least starts).

    Probably you should write some real documentation for it.

    Arguments:

    * data: the data to be manipulated

    """
    log.info("Doing some fun stuff here!")
    return data


def parse_args():
    """Parse command line arguments."""
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('infile', nargs='?', default='-')
    parser.add_argument('-ei', '--infile_encoding', default='utf-8')
    parser.add_argument('-o', '--outfile', default='-')
    parser.add_argument('-eo', '--outfile_encoding', default='utf-8')

    verbosity = parser.add_mutually_exclusive_group()
    verbosity.add_argument('-v', '--verbose', action='store_const',
                           const=logging.DEBUG, default=logging.INFO)
    verbosity.add_argument('-q', '--quiet', dest='verbose',
                           action='store_const', const=logging.WARNING)

    parser.add_argument('--version', action='version',
                        version=f'%(prog)s v{__version__}')

    args = parser.parse_args()
    args.infile = argparse.FileType(encoding=args.infile_encoding)(args.infile)
    args.outfile = argparse.FileType(
        mode='w',
        encoding=args.outfile_encoding,
        # newline='', # for csvs
    )(args.outfile)
    return args


def read_instream(instream):
    """Convert raw input for to a manipulable format.

    Arguments:

    * instream: a file-like object

    Returns: probably a DataFrame

    """
    log.info('Reading Input')
    return instream.read()


def main():
    args = parse_args()
    logging.basicConfig(level=args.verbose)
    data = read_instream(args.infile)
    results = manipulate_data(data)
    print(results, file=args.outfile)


if __name__ == "__main__":
    main()
```

## Walkthrough

The first chunk is pretty self explanatory. It sets the shebang (now explicitly
Python 3), gives a docstring that doubles as program help info later, and
organizes the imports. This time I've included commented imports that I often
use, like Pandas and NumPy. I've also dropped some imports that became
unnecessary since `argparse` is a bit more sophisticated than it used to be.

``` python
#!/usr/bin/env python3
"""
A boilerplate script to be customized for data projects.

This script-level docstring will double as the description when the script is
called with the --help or -h option.
"""

# Standard Library imports
import argparse
# import collections
# import csv
# import itertools
import logging

# External library imports
# import pandas as pd
# import numpy as np

# Standard Library from-style imports go here
from pathlib import Path

# External library from-style imports go here
# from matplotlib import pyplot as plt
```

The next chunk sets up our module-level info. I've added in a version this time
around, because you should version things. I've also made the log name
dependent on how whether the script is loaded as a module or not, because the
full name may be more helpful if the script ends up as a submodule somewhere,
which occasionally happens.

``` python
__version__ = '0.1'

log = logging.getLogger(__name__ if __name__ != '__main__ '
                        else Path(__file__).stem)
```

The data manipulation function is more-or-less unchanged, since this is where
the actual work occurs. In general, you'll want to rename this function to what
it actually does.

``` python
def manipulate_data(data):
    """This function is where the real work happens (or at least starts).

    Probably you should write some real documentation for it.

    Arguments:

    * data: the data to be manipulated

    """
    log.info("Doing some fun stuff here!")
    return data
```

The `parse_args` function is in many ways the star of the show here, and I'm
going to break it into different chunks. In the first chunk, we create the
parser and add an `infile` and `outfile` argument. We create optional encoding
for each of those as well. I've changed `infile` to be a positional argument
because that makes it easier to use with make-style workflow tools. We're
taking the `infile` and `outfile` arguments as strings, with default values of
'-'; as we'll see below, this is the least ugly [^2] way to make use of
`argparse`'s neat `FileType` object but also let the user set the encoding at
runtime.

That encoding point is another difference between the old and new version.
Previously, encodings were set as script-level constants, which really works
against the reusability idea.

``` python


def parse_args():
    """Parse command line arguments."""
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('infile', nargs='?', default='-')
    parser.add_argument('-ei', '--infile_encoding', default='utf-8')
    parser.add_argument('-o', '--outfile', default='-')
    parser.add_argument('-eo', '--outfile_encoding', default='utf-8')
```

In the next chunk we just throw in some handy helpers. First we add mutually
exclusive verbose and quiet flags to set the logging level. Then we add in a
version flag, because gosh darn are we professional.

``` python

    verbosity = parser.add_mutually_exclusive_group()
    verbosity.add_argument('-v', '--verbose', action='store_const',
                           const=logging.DEBUG, default=logging.INFO)
    verbosity.add_argument('-q', '--quiet', dest='verbose',
                           action='store_const', const=logging.WARNING)

    parser.add_argument('--version', action='version',
                        version=f'%(prog)s v{__version__}')
```

Now we parse our arguments and convert our input and output files to `FileType`
objects. The great thing about `FileType`s is that you can set the properties
like mode and encoding, and the constructor is smart enough to wrap standard
input and output if the provided filename is '-'. No more messing around with
`sys.stdin` and `io` objects! It looks a bit odd because `FileType` actually
creates a new *type*, which is then instantiated with the path to the file.

I'll admit that while I included standard input and output in my original
boilerplate three years ago, it's only in the last year or so that I've found
myself using it a lot. It plays very well with cloud infrastructure, and makes
modularity all that much easier. Working with text flows also allows you to use
command-line tools like `grep` and `sed` which are often undervalued,
expecially when working with large files.

``` python
    args = parser.parse_args()
    args.infile = argparse.FileType(encoding=args.infile_encoding)(args.infile)
    args.outfile = argparse.FileType(
        mode='w',
        encoding=args.outfile_encoding,
        # newline='', # for csvs
    )(args.outfile)
    return args
```

The `read_instream` function isn't always one that lives through to the
production script. In some cases, the `read_instream` function is entirely
replaced by a `pd.read_csv` or something like that. If it's simple enough, I
keep it in the `main` function. But when you do have a complicated few steps to
get the data in the right shape, it's best to segregate it to its own function.
The temptation is to put the code getting your data *ready* for manipulation or
analysis in the manipulation or analysis function, but that's bad design
because it means you spend a lot of time in a function not doing the thing that
is the point of that function. If only for mental clarity, keep it separate.
Tidy your data here.

``` python
def read_instream(instream):
    """Convert raw input for to a manipulable format.

    Arguments:

    * instream: a file-like object

    Returns: probably a DataFrame

    """
    log.info('Reading Input')
    return instream.read()
```

Finally we have the standard `main` function: input, manipulate, output. On a
suggestion from [Arya McCarthy](https://github.com/aryamccarthy), I've switched
to using the `print` function to print the final results, since `print` will
implicitly handle conversion to a text format, while you have to do that
yourself when using `outfile.write`. Of course, that line will often be
replaced with `to_csv` or something like that.

``` python
def main():
    args = parse_args()
    logging.basicConfig(level=args.verbose)
    data = read_instream(args.infile)
    results = manipulate_data(data)
    print(results, file=args.outfile)


if __name__ == "__main__":
    main()
```

## Why Scripts instead of Notebooks?

I'm not going to re-hash the [Unix
Philosophy](https://en.wikipedia.org/wiki/Unix_philosophy) or the
[overkill](/2015/08/21/boilerplate.html#is-this-overkill) question, since I
covered those last time. But the question that's even more pressing now than it
was three years ago is: why the heck are we writing scripts instead of doing
everything as a Jupyter Notebook?

I guess I'm a bit of a [notebook
skeptic](2018/04/17/notebooks_arent_papers.html), even though I use notebooks
every day. I recognize that people use them all the time to do large-scale,
impressive things at production. Look at
[Netflix](https://medium.com/netflix-techblog/notebook-innovation-591ee3221233).
They're great for experimentation, they're great for graphics.

But I just don't trust them. I don't trust that the cell can be run out of
order, or multiple times, or that you can have a variable that you defined and
then deleted or changed the definition of so that it doesn't match anything on
the screen. I don't like that it doesn't work cleanly and directly with version
control, and I don't like that it doesn't work cleanly and directly with text
streams on the command line. You can't import them, and 99 percent of them are
named "Untitled".

Maybe that means I'm just not disciplined enough, and maybe it means I'm a
grumpy old man. I can live with that. But scripts have never let me down.

## Tell me what you think!

So that's the new boilerplate. If you use it, or have questions or edits, I'd
love to hear from you on [Twitter](https://twitter.com/OliverSherouse) or just
[email me](mailto:oliver@oliversherouse.com).

[^1]: It's also on GitHub
    [here](https://github.com/OliverSherouse/boilerplate), of course

[^2]: It's still a little ugly.
