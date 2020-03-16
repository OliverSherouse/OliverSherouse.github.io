/* global dfjs Chart */

Chart.plugins.register({
  afterRender: function (c) {
    console.log('afterRender called')
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
  DC: 'District of Columbia',
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

virusTracker.DataSet = class {
  constructor () {
    this.data = []
  }

  add (series) {
    for (let i = 0; i < this.data.length; i++) {
      if (this.data[i].id === series.id) {
        this.data[i].add(series)
        return
      }
    }
    this.data.push(series)
  }
}

virusTracker.Series = class {
  constructor (id, data) {
    this.id = id
    this.data = data
  }

  add (a) {
    if (this.length !== a.length) { throw Error('Cannot add of different length') }
    for (const i in this.data) {
      this.data[i] += a.data[i]
    }
  }

  get length () { return this.data.length }

  getObsPastThreshold (threshold) {
    for (const i in this.data) {
      if (this.data[i] >= threshold) {
        return this.data.slice(i)
      }
    }
  }
}

virusTracker.drawRegionalLogCasesChart = function () {
  const threshold = 100
  const serieses = {}
  for (const series of virusTracker.byRegionOrCountry.data) {
    const obsPastThreshold = series.getObsPastThreshold(threshold)
    if (obsPastThreshold === undefined) { continue }
    serieses[series.id] = obsPastThreshold
  }
  virusTracker.drawChart(
    'virus-tracker-log-cases-regional',
    serieses,
    Object.values(virusTracker.statemap),
    ['Percent Change in Confirmed Cases', 'Countries and Subnational Regions'],
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
  const serieses = {}
  for (const series of virusTracker.byRegionOrCountry.data) {
    const obsPastThreshold = series.getObsPastThreshold(threshold)
    if (obsPastThreshold === undefined) { continue }
    serieses[series.id] = obsPastThreshold
      .map((v, i, arr) => i < 1 ? undefined : Math.round(100 * (v / arr[i - 1] - 1), 1))
  }
  virusTracker.drawChart(
    'virus-tracker-pct-change-regional',
    serieses,
    Object.values(virusTracker.statemap),
    ['Percent Change in Confirmed Cases', 'Countries and Subnational Regions'],
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

virusTracker.drawChart = function (id, serieses, toColor, title, xAxes, yAxes) {
  const datasets = []
  const neutralColor = 'rgba(0, 0, 0, 0, 0.5)'
  const colors = ['#4682b4', '#2f4858', '#ef767a', '#6a8d92', '#efb0a1']
  let colored = 0

  for (const name in serieses) {
    const data = serieses[name]
    const dataset = {
      label: name,
      data: data.map(function (v, j) { return { x: j, y: v } }),
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
    if (toColor.includes(name)) {
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
        text: ['Source: Johns Hopkins CSSE. Produced by Oliver Sherouse, OliverSherouse.com'],
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
    console.log(ctx)
    anchor.setAttribute('href', ctx.toDataURL())
    const date = new Date()
    console.log(title)
    const name = 'download'
    anchor.setAttribute('download', `${name}_${date.getFullYear()}${date.getMonth() + 1}${date.getDate()[1] ? date.getDate() : '0' + date.getDate()}.png`)
    document.body.appendChild(anchor)
    anchor.click()
  })
  ctx.after(button)
  return myChart
}

virusTracker.loadRaw = async function () {
  const df = (await dfjs.DataFrame.fromCSV(virusTracker.url)).toArray()
  const raw = new virusTracker.DataSet()
  for (const array of df) {
    const pieces = array[0].split(',')
    let region = pieces[pieces.length - 1].trim()
    if (region in virusTracker.statemap) {
      region = virusTracker.statemap[region]
    }

    raw.add(new virusTracker.Series(
      { country: array[1], region: region },
      array.slice(4).map(o => +o)
    ))
  }
  return raw
}

virusTracker.createByCountry = function () {
  const byCountry = new virusTracker.DataSet()
  for (const series of virusTracker.raw.data) {
    const newseries = new virusTracker.Series(series.id.country, series.data)
    byCountry.add(newseries)
  }
  return byCountry
}

virusTracker.createByRegionOrCountry = function () {
  const byRegionOrCountry = new virusTracker.DataSet()
  for (const series of virusTracker.raw.data) {
    if (series.id.country === 'China') { continue }
    if (series.id.region.startsWith('Diamond')) { continue }
    const label = series.id.region === '' ? series.id.country : series.id.region
    byRegionOrCountry.add(new virusTracker.Series(label, series.data))
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
