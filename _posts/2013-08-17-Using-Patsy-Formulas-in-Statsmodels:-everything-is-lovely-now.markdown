---
layout: post
title: "Using Patsy Formulas in Statsmodels everything is lovely now"
date: 2013-08-17 18:33:00
---
Statsmodels, the Python [toolkit for statistical
modeling](http://statsmodels.sourceforge.net/), has just released
version 0.5.0. While this release has a [number of new
features](http://statsmodels.sourceforge.net/stable/release/version0.5.html),
the real headliner is the new support for formulas, using the [patsy
library](http://patsy.readthedocs.org/en/latest/).  
  
Now, it's been possible for a while now to use patsy formulas alongside
statsmodels using patsy's own API, but it's always felt a bit unwieldy.
With this release, however, statsmodels has really integrated patsy in a
way that makes it intuitive, while patsy's recent update has also made
the situation a more pleasant.  
  
Let's take an example with a (naive and improvised) model for economic
growth, based on some variables for human capital and policy
environment: population, primary school enrollment, dependency ratio,
trade sector (% GDP), government consumption (% GDP), and gross capital
formation (% GDP). We'll use
[wbdata](https://pypi.python.org/pypi/wbdata/0.1.0) to pull the data
from the World Bank.  
  
Here's some quick setup:  
{% highlight python %}
    import statsmodels.api as sm
    import wbdata
    indicators = {
        "NY.GDP.PCAP.KD.ZG": "growth",
        "SP.POP.TOTL": "pop",
        "SE.PRM.NENR": "enroll",
        "SP.POP.DPND": "dpnd",
        "NE.CON.GOVT.ZS": "gov",
        "NE.TRD.GNFS.ZS": "trade",
        "NE.GDI.TOTL.ZS": "gcf",
        }
    df = wbdata.get_dataframe(indicators).dropna()
{% endhighlight %}
Now, if we were going to do our analysis without formulas, it a first
stab would look something like this:  
{% highlight python %}
    endog = df["growth"]
    exog = sm.add_constant(
        df[["pop", "enroll", "dpnd",
            "gov", "trade", "gcf"]])
    model = sm.OLS(endog, exog)
    print(model.fit().summary2())
{% endhighlight %}
Which gets us the following:  
 
<table class="simpletable">
<tr>        <td>Model:</td>          <td>OLS</td>         <td>AIC:</td>         <td>22887.7001</td><tr>
<tr>  <td>Dependent Variable:</td> <td>growth</td>        <td>BIC:</td>         <td>22931.8782</td><tr>
<tr>   <td>No. Observations:</td>   <td>4069</td>    <td>Log-Likelihood:</td>     <td>-11437.</td> <tr>
<tr>       <td>Df Model:</td>         <td>6</td>      <td>F-statistic:</td>        <td>105.4</td>  <tr>
<tr>     <td>Df Residuals:</td>     <td>4062</td>  <td>Prob (F-statistic):</td>  <td>1.01e-123</td><tr>
<tr>      <td>R-squared:</td>       <td>0.135</td>       <td>Scale:</td>          <td>16.205</td>  <tr>
<tr>    <td>Adj. R-squared:</td>    <td>0.133</td>          <td></td>                <td></td>     <tr>
</table>
<table class="simpletable">
<tr>     <td></td>     <th>Coef.</th>  <th>Std.Err.</th>     <th>t</th>     <th>P>|t|</th> <th>[0.025</th>  <th>0.975]</th> <tr>
<tr>  <th>const</th>  <td>2.1576</td>   <td>0.7222</td>   <td>2.9875</td>  <td>0.0028</td> <td>0.7417</td>  <td>3.5736</td> <tr>
<tr>  <th>pop</th>    <td>0.0000</td>   <td>0.0000</td>   <td>0.0504</td>  <td>0.9598</td> <td>-0.0000</td> <td>0.0000</td> <tr>
<tr>  <th>enroll</th> <td>-0.0033</td>  <td>0.0051</td>   <td>-0.6420</td> <td>0.5209</td> <td>-0.0132</td> <td>0.0067</td> <tr>
<tr>  <th>dpnd</th>   <td>-0.0270</td>  <td>0.0047</td>   <td>-5.7367</td> <td>0.0000</td> <td>-0.0363</td> <td>-0.0178</td><tr>
<tr>  <th>gov</th>    <td>-0.1394</td>  <td>0.0108</td>  <td>-12.8542</td> <td>0.0000</td> <td>-0.1607</td> <td>-0.1181</td><tr>
<tr>  <th>trade</th>  <td>0.0084</td>   <td>0.0016</td>   <td>5.2293</td>  <td>0.0000</td> <td>0.0053</td>  <td>0.0116</td> <tr>
<tr>  <th>gcf</th>    <td>0.1624</td>   <td>0.0089</td>   <td>18.2754</td> <td>0.0000</td> <td>0.1450</td>  <td>0.1798</td> <tr>
</table>
<table class="simpletable">
<tr>     <td>Omnibus:</td>    <td>706.445</td>  <td>Durbin-Watson:</td>      <td>1.386</td>   <tr>
<tr>  <td>Prob(Omnibus):</td>  <td>0.000</td>  <td>Jarque-Bera (JB):</td>  <td>12491.440</td> <tr>
<tr>       <td>Skew:</td>      <td>0.277</td>      <td>Prob(JB):</td>        <td>0.000</td>   <tr>
<tr>     <td>Kurtosis:</td>   <td>11.566</td>   <td>Condition No.:</td>   <td>10483629976</td><tr>
</table>

Using the formulas approach, things are a little simpler (and you get
the constant for free):  
{% highlight python %}
    model = sm.OLS.from_formula(
        "growth ~ pop + enroll + dpnd"
        "+ gov + trade + gcf", df)
    print(model.fit().summary2())
{% endhighlight %}

<table class="simpletable">
<tr>        <td>Model:</td>          <td>OLS</td>         <td>AIC:</td>         <td>22887.7001</td><tr>
<tr>  <td>Dependent Variable:</td> <td>growth</td>        <td>BIC:</td>         <td>22931.8782</td><tr>
<tr>   <td>No. Observations:</td>   <td>4069</td>    <td>Log-Likelihood:</td>     <td>-11437.</td> <tr>
<tr>       <td>Df Model:</td>         <td>6</td>      <td>F-statistic:</td>        <td>105.4</td>  <tr>
<tr>     <td>Df Residuals:</td>     <td>4062</td>  <td>Prob (F-statistic):</td>  <td>1.01e-123</td><tr>
<tr>      <td>R-squared:</td>       <td>0.135</td>       <td>Scale:</td>          <td>16.205</td>  <tr>
<tr>    <td>Adj. R-squared:</td>    <td>0.133</td>          <td></td>                <td></td>     <tr>
</table>
<table class="simpletable">
<tr>      <td></td>       <th>Coef.</th>  <th>Std.Err.</th>     <th>t</th>     <th>P>|t|</th> <th>[0.025</th>  <th>0.975]</th> <tr>
<tr>  <th>Intercept</th> <td>2.1576</td>   <td>0.7222</td>   <td>2.9875</td>  <td>0.0028</td> <td>0.7417</td>  <td>3.5736</td> <tr>
<tr>  <th>pop</th>       <td>0.0000</td>   <td>0.0000</td>   <td>0.0504</td>  <td>0.9598</td> <td>-0.0000</td> <td>0.0000</td> <tr>
<tr>  <th>enroll</th>    <td>-0.0033</td>  <td>0.0051</td>   <td>-0.6420</td> <td>0.5209</td> <td>-0.0132</td> <td>0.0067</td> <tr>
<tr>  <th>dpnd</th>      <td>-0.0270</td>  <td>0.0047</td>   <td>-5.7367</td> <td>0.0000</td> <td>-0.0363</td> <td>-0.0178</td><tr>
<tr>  <th>gov</th>       <td>-0.1394</td>  <td>0.0108</td>  <td>-12.8542</td> <td>0.0000</td> <td>-0.1607</td> <td>-0.1181</td><tr>
<tr>  <th>trade</th>     <td>0.0084</td>   <td>0.0016</td>   <td>5.2293</td>  <td>0.0000</td> <td>0.0053</td>  <td>0.0116</td> <tr>
<tr>  <th>gcf</th>       <td>0.1624</td>   <td>0.0089</td>   <td>18.2754</td> <td>0.0000</td> <td>0.1450</td>  <td>0.1798</td> <tr>
</table>
<table class="simpletable">
<tr>     <td>Omnibus:</td>    <td>706.445</td>  <td>Durbin-Watson:</td>      <td>1.386</td>   <tr>
<tr>  <td>Prob(Omnibus):</td>  <td>0.000</td>  <td>Jarque-Bera (JB):</td>  <td>12491.440</td> <tr>
<tr>       <td>Skew:</td>      <td>0.277</td>      <td>Prob(JB):</td>        <td>0.000</td>   <tr>
<tr>     <td>Kurtosis:</td>   <td>11.566</td>   <td>Condition No.:</td>   <td>10483629976</td><tr>
</table>
  
Of course, you'll have noticed that that model is terrible. To make it a
little more realistic, we should assume that all our variables have
diminishing returns (because, well, what doesn't?).  Before, this would
mean having to create new columns or arrays. With formulas, however, we
can take advantage of built-in interpretation:  
  

{% highlight python %}
    from numpy import log
    model = sm.OLS.from_formula(
        "growth ~ log(pop) + log(enroll)"
        "+ log(dpnd) + log(gov)"
        "+ log(trade) + log(gcf)", df)
    print(model.fit().summary2())
{% endhighlight  %}

<table class="simpletable">
<tr>        <td>Model:</td>          <td>OLS</td>         <td>AIC:</td>         <td>22862.8353</td><tr>
<tr>  <td>Dependent Variable:</td> <td>growth</td>        <td>BIC:</td>         <td>22907.0134</td><tr>
<tr>   <td>No. Observations:</td>   <td>4069</td>    <td>Log-Likelihood:</td>     <td>-11424.</td> <tr>
<tr>       <td>Df Model:</td>         <td>6</td>      <td>F-statistic:</td>        <td>110.1</td>  <tr>
<tr>     <td>Df Residuals:</td>     <td>4062</td>  <td>Prob (F-statistic):</td>  <td>4.42e-129</td><tr>
<tr>      <td>R-squared:</td>       <td>0.140</td>       <td>Scale:</td>          <td>16.106</td>  <tr>
<tr>    <td>Adj. R-squared:</td>    <td>0.139</td>          <td></td>                <td></td>     <tr>
</table>
<table class="simpletable">
<tr>       <td></td>        <th>Coef.</th>  <th>Std.Err.</th>     <th>t</th>     <th>P>|t|</th> <th>[0.025</th>  <th>0.975]</th> <tr>
<tr>  <th>Intercept</th>   <td>1.4340</td>   <td>2.4575</td>   <td>0.5835</td>  <td>0.5596</td> <td>-3.3840</td> <td>6.2520</td> <tr>
<tr>  <th>log(pop)</th>    <td>0.0350</td>   <td>0.0313</td>   <td>1.1176</td>  <td>0.2638</td> <td>-0.0264</td> <td>0.0963</td> <tr>
<tr>  <th>log(enroll)</th> <td>-0.3430</td>  <td>0.2800</td>   <td>-1.2254</td> <td>0.2205</td> <td>-0.8919</td> <td>0.2058</td> <tr>
<tr>  <th>log(dpnd)</th>   <td>-1.7545</td>  <td>0.2851</td>   <td>-6.1530</td> <td>0.0000</td> <td>-2.3135</td> <td>-1.1954</td><tr>
<tr>  <th>log(gov)</th>    <td>-2.3681</td>  <td>0.1799</td>  <td>-13.1644</td> <td>0.0000</td> <td>-2.7208</td> <td>-2.0155</td><tr>
<tr>  <th>log(trade)</th>  <td>0.8595</td>   <td>0.1562</td>   <td>5.5035</td>  <td>0.0000</td> <td>0.5533</td>  <td>1.1657</td> <tr>
<tr>  <th>log(gcf)</th>    <td>3.8320</td>   <td>0.2103</td>   <td>18.2234</td> <td>0.0000</td> <td>3.4197</td>  <td>4.2442</td> <tr>
</table>
<table class="simpletable">
<tr>     <td>Omnibus:</td>    <td>792.966</td>  <td>Durbin-Watson:</td>     <td>1.390</td>  <tr>
<tr>  <td>Prob(Omnibus):</td>  <td>0.000</td>  <td>Jarque-Bera (JB):</td> <td>15258.125</td><tr>
<tr>       <td>Skew:</td>      <td>0.391</td>      <td>Prob(JB):</td>       <td>0.000</td>  <tr>
<tr>     <td>Kurtosis:</td>   <td>12.454</td>   <td>Condition No.:</td>      <td>750</td>   <tr>
</table> 

And now we're starting to see dividends. Now here's something that used
to be annoyingly complicated in statsmodels, and actually kept me using
pandas' built-in ols convenience function: fixed effects. But fixed
effects are easy, now, using patsy's categorical variables. If your
categorical variables are numerical, you'll have to wrap it in a “C()”
function in your formula ('C' stands for categorical). If they're
strings, patsy will automatically create dummies just by including the
column name.  So to get country fixed effects:  
  
{% highlight python %}
    model = sm.OLS.from_formula(
        "growth ~ log(pop) + log(enroll)"
        "+ log(dpnd) + log(gov)"
        "+ log(trade) + log(gcf)"
        "+ country ", df.reset_index())
    print(model.fit().summary2())
{% endhighlight %}


<table class="simpletable">
<tr>        <td>Model:</td>          <td>OLS</td>         <td>AIC:</td>         <td>22456.2048</td><tr>
<tr>  <td>Dependent Variable:</td> <td>growth</td>        <td>BIC:</td>         <td>23762.6133</td><tr>
<tr>   <td>No. Observations:</td>   <td>4069</td>    <td>Log-Likelihood:</td>     <td>-11021.</td> <tr>
<tr>       <td>Df Model:</td>        <td>206</td>     <td>F-statistic:</td>        <td>7.829</td>  <tr>
<tr>     <td>Df Residuals:</td>     <td>3862</td>  <td>Prob (F-statistic):</td>  <td>3.83e-173</td><tr>
<tr>      <td>R-squared:</td>       <td>0.295</td>       <td>Scale:</td>          <td>13.894</td>  <tr>
<tr>    <td>Adj. R-squared:</td>    <td>0.257</td>          <td></td>                <td></td>     <tr>
</table>
<table class="simpletable">
<tr>                              <td></td>                                <th>Coef.</th>  <th>Std.Err.</th>     <th>t</th>     <th>P>|t|</th>  <th>[0.025</th>   <th>0.975]</th> <tr>
<tr>  <th>Intercept</th>                                                  <td>53.2769</td>  <td>9.0518</td>   <td>5.8858</td>  <td>0.0000</td>  <td>35.5302</td>  <td>71.0237</td><tr>
<tr>  <th>country[T.Algeria]</th>                                         <td>2.7467</td>   <td>2.3953</td>   <td>1.1467</td>  <td>0.2516</td>  <td>-1.9494</td>  <td>7.4427</td> <tr>
<tr>  <th>[rows omitted]</th></tr>
<tr>  <th>country[T.Zimbabwe]</th>                                        <td>-0.8009</td>  <td>2.9856</td>   <td>-0.2683</td> <td>0.7885</td>  <td>-6.6544</td>  <td>5.0525</td> <tr>
<tr>  <th>log(pop)</th>                                                   <td>-3.6012</td>  <td>0.5556</td>   <td>-6.4817</td> <td>0.0000</td>  <td>-4.6905</td>  <td>-2.5119</td><tr>
<tr>  <th>log(enroll)</th>                                                <td>2.7130</td>   <td>0.6057</td>   <td>4.4789</td>  <td>0.0000</td>  <td>1.5254</td>   <td>3.9005</td> <tr>
<tr>  <th>log(dpnd)</th>                                                  <td>-2.8916</td>  <td>0.6682</td>   <td>-4.3273</td> <td>0.0000</td>  <td>-4.2018</td>  <td>-1.5815</td><tr>
<tr>  <th>log(gov)</th>                                                   <td>-4.7072</td>  <td>0.3241</td>  <td>-14.5254</td> <td>0.0000</td>  <td>-5.3425</td>  <td>-4.0718</td><tr>
<tr>  <th>log(trade)</th>                                                 <td>2.2907</td>   <td>0.3322</td>   <td>6.8955</td>  <td>0.0000</td>  <td>1.6394</td>   <td>2.9420</td> <tr>
<tr>  <th>log(gcf)</th>                                                   <td>2.9715</td>   <td>0.2769</td>   <td>10.7321</td> <td>0.0000</td>  <td>2.4286</td>   <td>3.5143</td> <tr>
</table>
<table class="simpletable">
<tr>     <td>Omnibus:</td>    <td>727.958</td>  <td>Durbin-Watson:</td>     <td>1.622</td>  <tr>
<tr>  <td>Prob(Omnibus):</td>  <td>0.000</td>  <td>Jarque-Bera (JB):</td> <td>15503.644</td><tr>
<tr>       <td>Skew:</td>      <td>0.205</td>      <td>Prob(JB):</td>       <td>0.000</td>  <tr>
<tr>     <td>Kurtosis:</td>   <td>12.554</td>   <td>Condition No.:</td>     <td>10000</td>  <tr>
</table>
  
And, finally, to add in time fixed effects:  
{% highlight python %}
    model = sm.OLS.from_formula(
        "growth ~ log(pop) + log(enroll)"
        "+ log(dpnd) + log(gov)"
        "+ log(trade) + log(gcf)"
        "+ country + date",
        df.reset_index())
    print(model.fit().summary2())
{% endhighlight %}


<table class="simpletable">
<tr>        <td>Model:</td>          <td>OLS</td>         <td>AIC:</td>         <td>22092.3315</td><tr>
<tr>  <td>Dependent Variable:</td> <td>growth</td>        <td>BIC:</td>         <td>23663.8085</td><tr>
<tr>   <td>No. Observations:</td>   <td>4069</td>    <td>Log-Likelihood:</td>     <td>-10797.</td> <tr>
<tr>       <td>Df Model:</td>        <td>248</td>     <td>F-statistic:</td>        <td>8.973</td>  <tr>
<tr>     <td>Df Residuals:</td>     <td>3820</td>  <td>Prob (F-statistic):</td>  <td>1.16e-234</td><tr>
<tr>      <td>R-squared:</td>       <td>0.368</td>       <td>Scale:</td>          <td>12.582</td>  <tr>
<tr>    <td>Adj. R-squared:</td>    <td>0.327</td>          <td></td>                <td></td>     <tr>
</table>
<table class="simpletable">
<tr>                              <td></td>                                <th>Coef.</th>  <th>Std.Err.</th>     <th>t</th>     <th>P>|t|</th>  <th>[0.025</th>   <th>0.975]</th> <tr>
<tr>  <th>Intercept</th>                                                  <td>36.3498</td>  <td>10.4236</td>  <td>3.4873</td>  <td>0.0005</td>  <td>15.9135</td>  <td>56.7861</td><tr>
<tr>  <th>country[T.Algeria]</th>                                         <td>-0.0816</td>  <td>2.5110</td>   <td>-0.0325</td> <td>0.9741</td>  <td>-5.0046</td>  <td>4.8414</td> <tr>
<tr>  <th>[rows omitted]</th></tr>
<tr>  <th>country[T.Zimbabwe]</th>                                        <td>-1.9363</td>  <td>2.9074</td>   <td>-0.6660</td> <td>0.5055</td>  <td>-7.6365</td>  <td>3.7639</td> <tr>
<tr>  <th>date[T.1971]</th>                                               <td>-0.1978</td>  <td>0.8754</td>   <td>-0.2260</td> <td>0.8212</td>  <td>-1.9141</td>  <td>1.5184</td> <tr>
<tr>  <th>[rows omitted]</th></tr>
<tr>  <th>date[T.2012]</th>                                               <td>-3.9064</td>  <td>1.6811</td>   <td>-2.3237</td> <td>0.0202</td>  <td>-7.2024</td>  <td>-0.6105</td><tr>
<tr>  <th>log(pop)</th>                                                   <td>-2.3427</td>  <td>0.7107</td>   <td>-3.2965</td> <td>0.0010</td>  <td>-3.7360</td>  <td>-0.9494</td><tr>
<tr>  <th>log(enroll)</th>                                                <td>2.6449</td>   <td>0.5864</td>   <td>4.5106</td>  <td>0.0000</td>  <td>1.4952</td>   <td>3.7945</td> <tr>
<tr>  <th>log(dpnd)</th>                                                  <td>-3.2983</td>  <td>0.7049</td>   <td>-4.6793</td> <td>0.0000</td>  <td>-4.6803</td>  <td>-1.9164</td><tr>
<tr>  <th>log(gov)</th>                                                   <td>-3.5368</td>  <td>0.3216</td>  <td>-10.9992</td> <td>0.0000</td>  <td>-4.1672</td>  <td>-2.9064</td><tr>
<tr>  <th>log(trade)</th>                                                 <td>2.2057</td>   <td>0.3518</td>   <td>6.2705</td>  <td>0.0000</td>  <td>1.5160</td>   <td>2.8953</td> <tr>
<tr>  <th>log(gcf)</th>                                                   <td>2.9358</td>   <td>0.2756</td>   <td>10.6525</td> <td>0.0000</td>  <td>2.3954</td>   <td>3.4761</td> <tr>
</table>
<table class="simpletable">
<tr>     <td>Omnibus:</td>    <td>889.473</td>  <td>Durbin-Watson:</td>     <td>1.665</td>  <tr>
<tr>  <td>Prob(Omnibus):</td>  <td>0.000</td>  <td>Jarque-Bera (JB):</td> <td>21385.977</td><tr>
<tr>       <td>Skew:</td>      <td>0.448</td>      <td>Prob(JB):</td>       <td>0.000</td>  <tr>
<tr>     <td>Kurtosis:</td>   <td>14.195</td>   <td>Condition No.:</td>     <td>11602</td>  <tr>
</table>

  
All of this is to say that the Python statistical stack is getting
better and better for econometricians.
