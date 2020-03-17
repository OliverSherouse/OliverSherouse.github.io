/* global dfjs Chart */

Chart.plugins.register({
  afterRender: function (c) {
    const ctx = c.chart.ctx
    ctx.save()
    // This line is apparently essential to getting the
    // fill to go behind the drawn graph, not on top of it.
    // Technique is taken from:
    // https://stackoverflow.com/a/50126796/165164
    ctx.globalCompositeOperation = 'destination-over'
    ctx.fillStyle = 'white'
    ctx.fillRect(0, 0, c.chart.width, c.chart.height)
    ctx.restore()
  }
})

const virusTracker = {}

virusTracker.url = 'https://raw.githubusercontent.com/CSSEGISandData/COVID-19/master/csse_covid_19_data/csse_covid_19_time_series/time_series_19-covid-Confirmed.csv'

virusTracker.statemap = {
  AL: 'Alabama',
  AK: 'Alaska',
  AZ: 'Arizona',
  AR: 'Arkansas',
  CA: 'California',
  CO: 'Colorado',
  CT: 'Connecticut',
  DE: 'Delaware',
  'D.C.': 'District of Columbia',
  FL: 'Florida',
  GA: 'Georgia',
  HI: 'Hawaii',
  ID: 'Idaho',
  IL: 'Illinois',
  IN: 'Indiana',
  IA: 'Iowa',
  KS: 'Kansas',
  KY: 'Kentucky',
  LA: 'Louisiana',
  ME: 'Maine',
  MD: 'Maryland',
  MA: 'Massachusetts',
  MI: 'Michigan',
  MN: 'Minnesota',
  MS: 'Mississippi',
  MO: 'Missouri',
  MT: 'Montana',
  NE: 'Nebraska',
  NV: 'Nevada',
  NH: 'New Hampshire',
  NJ: 'New Jersey',
  NM: 'New Mexico',
  NY: 'New York',
  NC: 'North Carolina',
  ND: 'North Dakota',
  OH: 'Ohio',
  OK: 'Oklahoma',
  OR: 'Oregon',
  PA: 'Pennsylvania',
  RI: 'Rhode Island',
  SC: 'South Carolina',
  SD: 'South Dakota',
  TN: 'Tennessee',
  TX: 'Texas',
  UT: 'Utah',
  VT: 'Vermont',
  VA: 'Virginia',
  WA: 'Washington',
  WV: 'West Virginia',
  WI: 'Wisconsin',
  WY: 'Wyoming'
}

virusTracker.Series = class {
  constructor (id, data) {
    this.id = id
    this.data = data.map(Number)
  }

  operation (other, mapper) {
    const isNumber = typeof other === 'number'
    if (!isNumber) {
      if (this.length !== other.length) {
        throw Error('Series must be of the same size')
      }
      if (this.id !== other.id) {
        throw Error('Series must have the same id')
      }
    }
    const newData = []
    for (let i = 0; i < this.length; i++) {
      newData.push(mapper(this.data[i], isNumber ? other : other.data[i]))
    }
    return new virusTracker.Series(this.id, newData)
  }

  get length () {
    return this.data.length
  }

  add (other) {
    return this.operation(other, (a, b) => a + b)
  }

  subtract (other) {
    return this.operation(other, (a, b) => a - b)
  }

  mul (other) {
    return this.operation(other, (a, b) => a * b)
  }

  divide (other) {
    return this.operation(other, (a, b) => a / b)
  }

  getPastThreshold (threshold) {
    for (const i in this.data) {
      if (this.data[i] >= threshold) {
        return new virusTracker.Series(this.id, this.data.slice(i))
      }
    }
  }

  pctChange (lag) {
    if (lag === undefined) { lag = 1 }
    return new virusTracker.Series(
      this.id,
      this.data.map((v, i, arr) => i < lag ? undefined : (v / arr[i - lag] - 1))
    )
  }

  round (precision) {
    if (precision === undefined) { precision = 0 }
    const multiplier = Math.pow(10, precision)
    return new virusTracker.Series(
      this.id,
      this.data.map((v) => Math.round(v * multiplier) / multiplier)
    )
  }
}

virusTracker.Dataset = class {
  constructor () {
    this.data = new Map()
  }

  addSeries (series) {
    if (this.has(series.id)) {
      this.data.set(series.id, this.get(series.id).add(series))
    } else {
      this.data.set(series.id, series)
    }
    return this
  }

  addSerieses (serieses) {
    for (const series of serieses) { this.addSeries(series) }
    return this
  }

  get (key) {
    return this.data.get(key)
  }

  has (key) {
    return this.data.has(key)
  }

  operation (other, mapper) {
    const result = new virusTracker.Dataset()
    for (const series of this.data.values()) {
      console.log(series)
      result.addSeries(mapper(series, other))
    }
    return result
  }

  add (other) {
    const mapper = other.data ? (s, o) => s.add(o.get(s.id)) : (s, o) => s.add(o)
    return this.operation(other, mapper)
  }

  subtract (other) {
    const mapper = other.data ? (s, o) => s.subtract(o.get(s.id)) : (s, o) => s.subtract(o)
    return this.operation(other, mapper)
  }

  mul (other) {
    const mapper = other.data ? (s, o) => s.mul(o.get(s.id)) : (s, o) => s.mul(o)
    return this.operation(other, mapper)
  }

  divide (other) {
    const mapper = other.data ? (s, o) => s.divide(o.get(s.id)) : (s, o) => s.divide(o)
    return this.operation(other, mapper)
  }

  [Symbol.iterator] () {
    return this.data.values()
  }
}

virusTracker.drawRegionalLogCasesChart = function () {
  const threshold = 100
  const serieses = new virusTracker.Dataset()
  for (const series of virusTracker.byRegionOrCountry) {
    const pastThreshold = series.getPastThreshold(threshold)
    if (pastThreshold === undefined || pastThreshold.length < 2) { continue }
    serieses.addSeries(pastThreshold)
  }
  virusTracker.drawChart(
    'virus-tracker-log-cases-regional',
    serieses,
    Object.values(virusTracker.statemap),
    'log_cases',
    [{
      type: 'linear',
      ticks: { precision: 0 },
      scaleLabel: {
        display: true,
        labelString: `Days after reaching ${threshold} cases`
      }
    }],
    [{
      type: 'logarithmic',
      ticks: { min: threshold },
      scaleLabel: {
        display: true,
        labelString: `Confirmed Cases (Log Scale)`
      }
    }]
  )
}

virusTracker.drawRegionalPctChangeChart = function () {
  const threshold = 100
  const serieses = new virusTracker.Dataset()
  for (const series of virusTracker.byRegionOrCountry) {
    const pastThreshold = series.getPastThreshold(threshold)
    if (pastThreshold === undefined || pastThreshold.length < 2) { continue }
    serieses.addSeries(pastThreshold.pctChange().mul(100).round(1))
  }
  virusTracker.drawChart(
    'virus-tracker-pct-change-regional',
    serieses,
    Object.values(virusTracker.statemap),
    'growth_rate',
    [{
      type: 'linear',
      ticks: { precision: 0, min: 1 },
      scaleLabel: {
        display: true,
        labelString: `Days after reaching ${threshold} cases`
      }
    }],
    [{
      type: 'linear',
      ticks: { min: 0 },
      scaleLabel: {
        display: true,
        labelString: `Percent Change in Confirmed Cases`
      }
    }]
  )
}

virusTracker.drawChart = function (id, serieses, toColor, name, xAxes, yAxes) {
  const datasets = []
  const neutralColor = 'rgba(0, 0, 0, 0, 0.5)'
  const colors = ['#4682b4', '#2f4858', '#ef767a', '#6a8d92', '#efb0a1']
  let colored = 0

  for (const series of serieses) {
    const dataset = {
      label: series.id,
      data: series.data.map(function (v, j) { return { x: j, y: v } }),
      borderColor: neutralColor,
      backgroundColor: neutralColor,
      hoverBorderColor: neutralColor,
      hoverBackgroundColor: neutralColor,
      pointHoverBorderColor: neutralColor,
      pointHoverBackgroundColor: neutralColor,
      pointRadius: 0,
      pointHoverRadius: 0,
      pointHitRadius: 10,
      order: 1,
      fill: false
    }
    if (toColor.includes(series.id)) {
      const color = colors[colored % colors.length]
      dataset.borderColor = color
      dataset.backgroundColor = color
      dataset.hoverBorderColor = color
      dataset.hoverBackgroundColor = color
      dataset.order = -1
      colored += 1
    }
    datasets.push(dataset)
  }
  const ctx = document.getElementById(id)
  const myChart = new Chart(ctx, {
    type: 'line',
    data: {
      datasets: datasets
    },
    options: {
      title: {
        display: true,
        fontSize: 10,
        fontStyle: 'normal',
        text: ['Source: Johns Hopkins CSSE. OliverSherouse.com'],
        position: 'bottom'
      },
      legend: {
        position: 'right',
        labels: {
          filter: (item) => toColor.includes(item.text)
        }
      },
      scales: {
        xAxes: xAxes,
        yAxes: yAxes
      }
    }
  })
  const button = document.createElement('a')
  button.classList.add('button')
  button.innerHTML = 'Download this Chart'
  button.addEventListener('click', function () {
    const anchor = document.createElement('a')
    anchor.setAttribute('href', ctx.toDataURL())
    const date = new Date()
    anchor.setAttribute('download', `${name}_${date.getFullYear()}${date.getMonth() + 1}${date.getDate()[1] ? date.getDate() : '0' + date.getDate()}.png`)
    document.body.appendChild(anchor)
    anchor.click()
  })
  ctx.after(button)
  return myChart
}

virusTracker.loadRaw = async function () {
  const df = (await dfjs.DataFrame.fromCSV(virusTracker.url)).toArray()
  const raw = new virusTracker.Dataset()
  for (const array of df) {
    let country = array[1]
    if (country === 'Georgia') {
      country = 'Georgia (country)'
    }
    const pieces = array[0].split(',')
    let region = pieces[pieces.length - 1].trim()
    if (region in virusTracker.statemap) {
      region = virusTracker.statemap[region]
    }
    raw.addSeries(new virusTracker.Series(
      { country: country, region: region },
      array.slice(4))
    )
  }
  return raw
}

virusTracker.createByCountry = function () {
  const byCountry = new virusTracker.Dataset()
  for (const series of virusTracker.raw) {
    const newseries = new virusTracker.Series(series.id.country, series.data)// .map(Number))
    byCountry.addSeries(newseries)
  }
  return byCountry
}

virusTracker.createByRegionOrCountry = function () {
  const byRegionOrCountry = new virusTracker.Dataset()
  for (const series of virusTracker.raw) {
    if (series.id.country === 'China') { continue }
    if (series.id.region.startsWith('Diamond')) { continue }
    const label = series.id.region === '' ? series.id.country : series.id.region
    byRegionOrCountry.addSeries(new virusTracker.Series(label, series.data)) // .map(Number)))
  }
  return byRegionOrCountry
}

virusTracker.init = async function () {
  virusTracker.raw = await virusTracker.loadRaw()
  virusTracker.byCountry = virusTracker.createByCountry()
  virusTracker.byRegionOrCountry = virusTracker.createByRegionOrCountry()
  virusTracker.drawRegionalLogCasesChart()
  virusTracker.drawRegionalPctChangeChart()
}

window.addEventListener('load', virusTracker.init)
