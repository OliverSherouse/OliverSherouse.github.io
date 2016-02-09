---
title: A Boilerplate for Python Data Scripts
date: 2015-08-21
---

Most of the data scripts I write follow a pretty basic pattern. Since I try to write [scripts as programs][programs], I do my best to properly set up argument parsing and logging and whatnot. But of course that's tedious, and sometimes I get lazy.

So, in the name of not repeating work, and because other people might find it helpful, I've put together a boilerplate for data scripts. I've put up commented and uncommented versions on [GitHub],  But for discussion purposes, here's the commented version:

```python
#!/usr/bin/env python
"""A boilerplate script to be customized for data projects.

This script-level docstring will double as the description when the script is
called with the --help or -h option.

"""

# Standard Library imports go here
import argparse
import contextlib
import io
import logging
import sys

# External library imports go here
#
# Standard Library from-style imports go here
from pathlib import Path

# External library from-style imports go here
#
# Ideally we all live in a unicode world, but if you have to use something
# else, you can set it here
ENCODE_IN = 'utf-8'
ENCODE_OUT = 'utf-8'

# Set up a global logger. Logging is a decent exception to the no-globals rule.
# We want to use the logger because it sends to standard error, and we might
# need to use the standard output for, well, output. We'll set the name of the
# logger to the name of the file (sans extension).
log = logging.getLogger(Path(__file__).stem)


def manipulate_data(data):
    """This function is where the real work happens (or at least starts).

    Probably you should write some real documentation for it.

    Arguments:

    * data_in: the data to be manipulated

    """
    log.info("Doing some fun stuff here!")
    return data


def parse_args():
    """Parse command line arguments."""
    parser = argparse.ArgumentParser(description=__doc__)
    # If user doesn't specify an input file, read from standard input. Since
    # encodings are the worst thing, we're explicitly expecting std
    parser.add_argument('-i', '--infile',
                        type=lambda x: open(x, encoding=ENCODE_IN),
                        default=io.TextIOWrapper(
                            sys.stdin.buffer, encoding=ENCODE_IN)
                        )
    # Same thing goes with the output file.
    parser.add_argument('-o', '--outfile',
                        type=lambda x: open(x, 'w', encoding=ENCODE_OUT),
                        default=io.TextIOWrapper(
                            sys.stdout.buffer, encoding=ENCODE_OUT)
                        )
    # Set the verbosity level for the logger. The `-v` option will set it to
    # the debug level, while the `-q` will set it to the warning level.
    # Otherwise use the info level.
    verbosity = parser.add_mutually_exclusive_group()
    verbosity.add_argument('-v', '--verbose', action='store_const',
                           const=logging.DEBUG, default=logging.INFO)
    verbosity.add_argument('-q', '--quiet', dest='verbose',
                           action='store_const', const=logging.WARNING)
    return parser.parse_args()


def read_instream(instream):
    """Convert raw input for to a manipulatable format.

    Arguments:

    *Instream: a file-like object

    """
    # If you need to read a csv, create a DataFrame, or whatever it might be,
    # do it here.
    return instream.read()


def main():
    args = parse_args()
    logging.basicConfig(level=args.verbose)
    data = read_instream(args.infile)
    results = manipulate_data(data)
    args.outfile.write(results)

if __name__ == "__main__":
    main()
```

The comments explain a what's going on, but the basic idea is to follow Doug McIlroy's version of the [Unix Philosophy]:

>This is the Unix philosophy: Write programs that do one thing and do it well. Write programs to work together. Write programs to handle text streams, because that is a universal interface.

Let's walk through that:

## Do one thing well

A boilerplate can't keep you from over-complicating your script, but the thrust here is to write one primary function, and whatever support functions you need. Keep it simple; one script per conceptual step. That one thing should be reinforced in:

* The name of the script (which doubles as the log name)
* The script-level docstring (which doubles as the help description)
* The name of the manipulation function
* The docstring of the manipulation function

## Write programs to work together

In this context, I take this to mean two things. First, the script can be run stand-alone or imported as a library: the `main`, `parse_args`, and `read_instream` functions take care of all the file stuff so that the manipulate step does exactly that:
manipulate data. The second thing it means to me is flexibility in input and output. This script can read or write from files, or it can read from standard input and write to standard output, or any combination thereof. Which takes me to the next point:

## Write programs to handle text streams

You can pipe in or out of this script with no trouble. In fact, since the `read_instream` function is public,[^public] you can even use text streams with no trouble when using the script as a library. The encodings are unicode by default, but you can change them if you absolutely have to. This is also one reason to use the `logging` module instead of, say, `print` functions. Logs from `logging` print to standard *error*, not standard *output*; you can log safely without worrying about screwing up your output.

## Is this overkill?

The uncommented version of the boilerplate is 79 lines. Is all of it really necessary for every small job? Well, no. Not *necessary*. What I'm trying to do is encourage myself (and anybody who feels like using this boilerplate) to use practices that will be helpful over the long run.

I often find myself repeating tasks in different projects and different circumstances. When I can just drop in a script I already wrote and have it work, it makes my life better. When I know that I could have had that but didn't take the time, it makes my life worse. All this helps me stay on the "better" side.

If you can think of a way to make it even better, feel free to hit me up on [Twitter] or open an issue on [GitHub]!

[^public]: Because this is Python, and we're all adults here.

[programs]: http://www.oliversherouse.com/2015/03/12/programs_not_scripts.html
[GitHub]: https://github.com/OliverSherouse/boilerplate
[Unix Philosophy]: https://en.wikipedia.org/wiki/Unix_philosophy
[Twitter]: http://twitter.com/OliverSherouse
