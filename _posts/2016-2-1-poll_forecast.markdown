---
title: "How to Knock Off Nate Silver: the 430 Election Forecast Model"
date: 2016-02-01
---

It's caucus day in Iowa, so what better time to rip off Nate Silver? Silver has a well-respected [election forecasting model][538] based on polls, polling firms' historical house effects and accuracy, and a few non-poll factors like endorsements. Probably took a lot of hard work.

But it's actually pretty easy to build a simple poll-based model yourself using Python. I've thrown one together, which I'm calling the 430 model. Why 430? Because of the 80/20 rule: you can get 80 percent of the way there with 20 percent of the work, and 430 is about 80 percent of 538. 


Everything below is available in a Jupyter notebook [here][notebook]
Let's start with a little setup:

```python
import collections
import datetime

import numpy as np
import pandas as pd
import requests

API_ENDPOINT = "http://elections.huffingtonpost.com/pollster/api/polls"

np.random.seed(2016)
```

So, first, let's get our polling data, which we can do using the [Pollster API]:

```python
def get_all_results(state='US', party='gop', start_date='2015-6-1'):
    topic = '2016-president-{}-primary'.format(party)
    params = {'state': state,
              'after': start_date,
              'topic': topic
             }
    page = 1
    while True:
        params['page'] = page
        page_results = requests.get(API_ENDPOINT,
                                    params=params).json()
        for poll in page_results:
            subpop = next(i['subpopulations'][0]
                          for i in poll['questions']
                          if i['topic'] == topic)
            for response in subpop['responses']:
                if response['first_name']:
                    yield {'poll': poll['id'],
                           'date': poll['end_date'],
                           'filter': subpop['name'].lower(),
                           'obs': subpop['observations'],
                           'candidate': '{} {}'.format(response['first_name'],
                                                       response['last_name']),
                           'mean': response['value']}

        if len(page_results) < 10:
            break
        page += 1

def get_polls(state='US', party='gop', start_date='2015-6-1'):
    polls = pd.DataFrame(get_all_results(state=state,
                                         party=party,
                                         start_date=start_date))
    polls['date'] = pd.to_datetime(polls['date'])
    return polls
```

Those two functions will allow us to specify a state, a party (either 'gop' or 'dem', per Pollster),  and how far back in time we want to go. What we get back is a Pandas DataFrame where each row has the result for one candidate for one poll, plus some metadata about the poll. All we really need for this model is the date, result, and number of observations, but I've also included the population screen in case you want to, say, restrict to only likely voters.

Now we want to combine those poll results for a point-in-time estimate of the mean, plus a standard deviation of the estimate. But not all polls are equally good; we'll want to be able to weight them somehow. 

We're going to be lazy, and just weight based on recency. For each poll, we'll set a weight of one over the square of the age of the poll plus one (the plus one is so that we don't divide by zero). Then we can create a super-poll, in which we pool all the folks who said they'd vote for each candidate in any poll, multiplied by the weight of that poll. This allows us to calculate both the weighted estimate of the mean and the standard deviation of the estimate:

```python
def get_distribution_for_date(polls, target_date=None, window=30):
    if target_date is None:
        target_date = datetime.datetime.today()
    polls = polls[
        (polls['date'] <= target_date)
        & (polls['date'] > target_date - datetime.timedelta(window))
    ]
    weights = 1 / np.square(
        (target_date - polls['date']) /np.timedelta64(1, 'D') + 1)
    weighted = polls[['candidate']].copy()
    weighted['n'] = weights * polls['obs']
    weighted['votes'] = polls['mean'] / 100 * polls['obs'] * weights
    weighted = weighted.groupby('candidate').sum()
    weighted['mean'] = weighted['votes'] / weighted['n']
    weighted['std'] = np.sqrt(
        (weighted['mean'] * (1 - weighted['mean'])) / weighted['n'])
    return weighted[['mean', 'std']].query('mean > 0').copy()
```

This function allows us to specify a target date, in case we want a snapshot from earlier in the campaign, and also a window that gives us a maximum age of polls. That's so Scott Walker doesn't show up in our results even though he's already dropped out of the race.

Now we can run simulations! All we have to do is a draw from the normal distribution for each candidate, and see who got the highest percent of the vote:

```python
def run_simulation(dists, trials=10000):
    runs = pd.DataFrame(
        [np.random.normal(dists['mean'], dists['std'])
         for i in range(trials)],
        columns=dists.index)
    results = pd.Series(collections.Counter(runs.T.idxmax()))
    return results / results.sum()
```


Finally, here's a little function to automate all the steps and print out results:

```python
def predict(state='us', party='gop', window=30, trials=10000,
            target_date=None):
    polls = get_polls(state=state, party=party)
    dists = get_distribution_for_date(
        polls, window=window,target_date=target_date)
    print('Superpoll Results:')
    print(dists.sort_values('mean', ascending=False)
          .applymap(lambda x: '{:.1%}'.format(x)))
    print()
    print('Simulation Results:')
    print(run_simulation(dists, trials=trials)
          .sort_values(ascending=False)
          .map(lambda x: '{:.1%}'.format(x)))
```


So, now for the fun part, who wins? Here's the superpoll results on the Republican side:

Candidate      | Estimate | Standard Deviation
:--------------|---------:|------------------:
Donald Trump   | 28.2%    | 2.0%
Ted Cruz       | 23.6%    | 1.8%
Marco Rubio    | 17.4%    | 1.6%
Ben Carson     | 7.6%     | 1.2%
Rand Paul      | 4.7%     | 0.9%
Jeb Bush       | 4.1%     | 0.9%
Mike Huckabee  | 3.3%     | 0.8%
John Kasich    | 2.8%     | 0.7%
Carly Fiorina  | 2.4%     | 0.7%
Chris Christie | 2.1%     | 0.6%
Rick Santorum  | 1.3%     | 0.5%
Jim Gilmore    | 0.1%     | 0.2%

In the simulation, Donald Trump won 96 percent of the time, while Ted Cruz won 4 percent.

Here's our superpoll results for the Dems:

Candidate       | Estimate | Standard Deviation
:---------------|---------:|------------------:
Hillary Clinton | 47.4%    | 2.4%
Bernie Sanders  | 46.0%    | 2.4%
Martin O'Malley | 3.6%     | 0.9%

Seems pretty close, but bad news, Bernie fans! In the simulation, Hillary won 66 percent of the time, while Sanders only won 34 percent.

Now, that's all with a 30-day window. What if we keep it to just the most recent polls?

Here's what we get with a 4-day window on the GOP side:

Candidate      | Estimate | Standard Deviation
:--------------|---------:|------------------:
Donald Trump   | 27.5%    | 2.1%
Ted Cruz       | 23.1%    | 2.0%
Marco Rubio    | 18.1%    | 1.9%
Ben Carson     | 7.5%     | 1.3%
Rand Paul      | 5.1%     | 1.1%
Jeb Bush       | 4.1%     | 0.9%
Mike Huckabee  | 3.5%     | 0.9%
John Kasich    | 2.8%     | 0.8%
Carly Fiorina  | 2.5%     | 0.7%
Chris Christie | 2.0%     | 0.7%
Rick Santorum  | 1.3%     | 0.5%

Trump still wins 93.6 percent of simulations, but Cruz is up to 6.4 percent, and Rubio is on the board, although with 0.0%.


On the Democratic side, things get really interesting:

Candidate       | Estimate | Standard Deviation
:---------------|---------:|------------------:
Hillary Clinton | 47.0%    | 2.7%
Bernie Sanders  | 46.9%    | 2.7%
Martin O'Malley | 3.2%     | 1.0%

In the simulation, O'Malley stuns! Just kidding, Clinton wins 51 percent of the time, and Sanders wins 49 percent. Boy is that going to be fun.

Obviously we shouldn't bet the house on these predictions. My weighting model may be wrong (read: is wrong) or the polls themselves may be wrong (read: are completely unreliable in recent elections). But this shows you how simple it really is to get something like this off the ground.

If you decide to play around with this model (again, you can download the Jupyter notebook [here][notebook]), be sure to let me know on [twitter]. It would be a lot of fun to see what people come up with.


[538]: http://projects.fivethirtyeight.com/election-2016/primary-forecast/
[Pollster API]: http://elections.huffingtonpost.com/pollster/api
[notebook]: http://nbviewer.jupyter.org/github/Oliversherouse/blog_notebooks/blob/master/430%20Model.ipynb
[twitter]: http://twitter.com/OliverSherouse
