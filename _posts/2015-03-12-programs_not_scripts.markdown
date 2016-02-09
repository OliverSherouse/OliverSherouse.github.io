---
title: For Data Projects, Write Programs not Scripts
date: 2015-03-12 10:24:44
---
One thing I see a lot in data work is scripts that look something like this:

```python

"""
Some Data Analysis
"""

import some_library

data = some_library.read_file("input.csv")
data = data.select(["this", "that", "the other"])
# Bunch of work goes here
some_library.write_file(data, "output.csv")
some_library.make_pretty_chart(data, "chart.png")

```

Sometimes you'll get a few functions in there, and sometimes even a main function, but the central driving idea is that you write a script to do the specific task at hand.

In theory that sounds eminently sensible; in practice it makes your life harder.

The whole point of computers is that they do repetition better than we do, and there's almost no step in data work that you will only want to do once.

A better solution is to write every script as if you intended it to be a stand-alone program.  For example, we could make the above pseudo-script look like this:

```python

"""
Do some data analysis
"""
import argparse

import some_library


def analyze(data):
    """Do analysis on data and return result"""
    # Data work goes here
    return data


def write_output(data, ouput_file, output_img):
    """
    Write data file to output_file and
    write chart to output_img
    """
    some_library.write_file(data, output_file)
        some_library.make_pretty_chart(data, output_img)


def create_output_from_file(
        input_file, output_file, output_img):
    """
    Read data from input_file
    Write analyzed data to output_file
    Write chart ot output_img
    """
    data = some_library.read(input_file)
    write_output(data, args.output_file, args.output_img)


    def parse_args():
        parser = argparse.ArgumentParser(description=__doc__)
        parser.add_argument("input_file")
        parser.add_argument("output_file")
        parser.add_argument("output_img")
        return parser.parse_args()


    def main():
        args = parser.parse_args()
        create_output_from_file(args.input_file,
                                args.output_file,
                                args.output_img)


    if __name__ == "__main__":
        main()

```

You would just run this script using `python script_name.py input.csv output.csv output.png` to get the same result as the original. The difference is, this version of the script is completely portable; you can take it and drop it into any project where you need the functionality.

Additionally, it's import-safe, so you can pull your `analyze` or `write_output` function into another script.

Now of course, you still want to put your specific filepaths for the specific project you're working on somewhere, so that you don't have to type them over and over. You could do that using a shell script, a master python script, or even (and ideally), a makefile. But here again, the organization works to your advantage; you can separate your functionality into small, clean, reusable scripts and still have one file that concisely tells you what's happening from beginning to end.

This, of course, is nothing but bringing the [Unix Philosophy][unix] to data work:

> This is the Unix philosophy: Write programs that do one thing and do it well. Write programs to work together. Write programs to handle text streams, because that is a universal interface.
>
> <cite>---Doug McIlroy</cite>

Well, OK, I didn't get to text streams. But one thing at a time.


[unix]: http://en.m.wikipedia.org/wiki/Unix_philosophy
