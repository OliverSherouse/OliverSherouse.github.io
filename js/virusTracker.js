/* global Papa Chart */

const viTrack = {}

viTrack.urls = {
  confirmed: 'https://raw.githubusercontent.com/CSSEGISandData/COVID-19/master/csse_covid_19_data/csse_covid_19_time_series/time_series_19-covid-Confirmed.csv',
  deaths: 'https://raw.githubusercontent.com/CSSEGISandData/COVID-19/master/csse_covid_19_data/csse_covid_19_time_series/time_series_19-covid-Deaths.csv',
  recovered: 'https://raw.githubusercontent.com/CSSEGISandData/COVID-19/master/csse_covid_19_data/csse_covid_19_time_series/time_series_19-covid-Recovered.csv'
}

viTrack.statemap = {
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

viTrack.Series = class {
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
    return new viTrack.Series(this.id, newData)
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
        return new viTrack.Series(this.id, this.data.slice(i))
      }
    }
  }

  pctChange (lag) {
    if (lag === undefined) { lag = 1 }
    return new viTrack.Series(
      this.id,
      this.data.map((v, i, arr) => i < lag ? undefined : (v / arr[i - lag] - 1))
    )
  }

  slice (idx) {
    return new viTrack.Series(this.id, this.data.slice(idx))
  }

  round (precision) {
    if (precision === undefined) { precision = 0 }
    const multiplier = Math.pow(10, precision)
    return new viTrack.Series(
      this.id,
      this.data.map((v) => Math.round(v * multiplier) / multiplier)
    )
  }
}

viTrack.Dataset = class {
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
    const result = new viTrack.Dataset()
    for (const series of this.data.values()) {
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

  map (mapper) {
    const ds = new viTrack.Dataset()
    for (const series of this) {
      ds.addSeries(mapper(series))
    }
    return ds
  }

  filter (condition) {
    const ds = new viTrack.Dataset()
    for (const series of this) {
      if (condition(series)) {
        ds.addSeries(series)
      }
    }
    return ds
  }

  [Symbol.iterator] () {
    return this.data.values()
  }
}

viTrack.drawConfirmedChart = function () {
  const threshold = 100
  const serieses = new viTrack.Dataset()
  for (const series of viTrack.byRegionOrCountry.confirmed) {
    const pastThreshold = series.getPastThreshold(threshold)
    if (pastThreshold === undefined || pastThreshold.length < 2) { continue }
    serieses.addSeries(pastThreshold)
  }
  viTrack.drawChart(
    'virus-tracker-log-cases',
    serieses,
    Object.values(viTrack.statemap),
    'Confirmed Cases',
    'Johns Hopkins CSSE',
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
      ticks: {
        min: threshold,
        callback: (v) => Math.log10(v) % 1 === 0 ? v.toLocaleString() : null
      },
      scaleLabel: {
        display: true,
        labelString: `Confirmed Cases (Log Scale)`
      }
    }]
  )
}

viTrack.drawDeathsChart = function () {
  const threshold = 100
  const serieses = viTrack.byRegionOrCountry.deaths
    .filter(s => viTrack.byRegionOrCountry.confirmed.get(s.id).getPastThreshold(threshold) !== undefined)
    .map(s => s.slice(viTrack.byRegionOrCountry.confirmed.get(s.id).data
      .map((v, i) => v >= threshold ? i : undefined)
      .filter(v => v !== undefined)[0]
    ))
    .filter(s => s.length > 1)

  viTrack.drawChart(
    'virus-tracker-deaths',
    serieses,
    Object.values(viTrack.statemap),
    'Known Deaths',
    'Johns Hopkins CSSE',
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
      ticks: {
        min: 1,
        callback: (v) => Math.log10(v) % 1 === 0 ? v.toLocaleString() : null
      },
      scaleLabel: {
        display: true,
        labelString: `Known Deaths (Log Scale)`
      }
    }]
  )
}

viTrack.drawUnresolvedChart = function () {
  const threshold = 100
  const serieses = viTrack.byRegionOrCountry.unresolved
    .filter(s => viTrack.byRegionOrCountry.confirmed.get(s.id).getPastThreshold(threshold) !== undefined)
    .map(s => s.slice(viTrack.byRegionOrCountry.confirmed.get(s.id).data
      .map((v, i) => v >= threshold ? i : undefined)
      .filter(v => v !== undefined)[0]
    ))
    .filter(s => s.length > 1)

  viTrack.drawChart(
    'virus-tracker-unresolved',
    serieses,
    Object.values(viTrack.statemap),
    'Unresolved Cases',
    'Johns Hopkins CSSE',
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
      ticks: {
        min: threshold,
        callback: (v) => Math.log10(v) % 1 === 0 ? v.toLocaleString() : null
      },
      scaleLabel: {
        display: true,
        labelString: `Unresolved Cases (Log Scale)`
      }
    }]
  )
}

viTrack.drawPctChangeChart = function () {
  const threshold = 100
  const serieses = new viTrack.Dataset()
  for (const series of viTrack.byRegionOrCountry.confirmed) {
    const pastThreshold = series.getPastThreshold(threshold)
    if (pastThreshold === undefined || pastThreshold.length < 2) { continue }
    serieses.addSeries(pastThreshold.pctChange().mul(100).round(1))
  }
  viTrack.drawChart(
    'virus-tracker-pct-change',
    serieses,
    Object.values(viTrack.statemap),
    'Growth Rate of Cases',
    'Johns Hopkins CSSE',
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
      ticks: {
        min: 0,
        callback: (v) => v + '%'
      },
      scaleLabel: {
        display: true,
        labelString: `Percent Change in Confirmed Cases`
      }
    }]
  )
}

viTrack.drawChart = function (id, serieses, toColor, title, source, xAxes, yAxes) {
  const name = title.toLowerCase().replace(' ', '_')
  const datasets = []
  const neutralColor = 'rgba(0, 0, 0, 0, 0.5)'
  const colors = [
    '#4E79A7', '#8CD17D', '#E15759', '#FABFD2', '#A0CBE8', '#B6992D', '#FF9D9A',
    '#B07AA1', '#F28E2B', '#F1CE63', '#79706E', '#D4A6C8', '#FFBE7D', '#499894',
    '#BAB0AC', '#9D7660', '#59A14F', '#86BCB6', '#D38295', '#D7B5A6'
  ]
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
  const canvas = document.getElementById(id)
  const ctx = canvas.getContext('2d')
  xAxes[0].scaleLabel = xAxes[0].scaleLabel || {}
  xAxes[0].scaleLabel.padding = { top: 4, bottom: 32 }
  // xAxes[0].gridLines = xAxes[0].gridLines || {}
  // xAxes[0].gridLines.display = false
  // yAxes[0].gridLines = yAxes[0].gridLines || {}
  // yAxes[0].gridLines.display = false
  const myChart = new Chart(ctx, {
    type: 'line',
    devicePixelRatio: 2,
    data: {
      datasets: datasets
    },
    options: {
      aspectRatio: 1.5,
      maintainAspectRatio: true,
      title: {
        display: true,
        fontSize: 24,
        fontStyle: 'normal',
        fontColor: '#4a4a4a',
        fontFamily: 'Raleway, sans',
        text: title
      },
      legend: {
        display: window.innerWidth > 500,
        position: 'right',
        labels: {
          filter: (item) => toColor.includes(item.text)
        }
      },
      scales: {
        xAxes: xAxes,
        yAxes: yAxes
      },

      onResize: (chart, size) => {
        const newdisplay = window.innerWidth > 500
        if (newdisplay !== chart.options.legend.display) {
          chart.options.legend.display = newdisplay
          chart.update()
        }
      }
    },
    plugins: [{
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
      },
      afterDraw: function (c) {
        const ctx = c.ctx
        ctx.font = `11px ${c.config.options.defaultFontFamily}`
        ctx.textAlign = 'right'
        ctx.fillStyle = c.config.options.defaultFontColor
        ctx.fillText(`Source: ${source}. OliverSherouse.com`, c.width - 1, c.height - 24)
      }
    }]
  })

  const buttons = document.createElement('div')
  buttons.classList.add('buttons')
  buttons.classList.add('is-centered')

  const button = document.createElement('a')
  button.classList.add('button')
  button.classList.add('is-primary')
  button.innerHTML = '<span class="icon"><span class="fas fa-download"></span></span><span>Download this Chart</span>'
  button.addEventListener('click', function () {
    const anchor = document.createElement('a')
    anchor.setAttribute('href', canvas.toDataURL())
    const date = new Date()
    anchor.setAttribute('download', `${name}_${date.getFullYear()}${date.getMonth() + 1}${date.getDate()[1] ? date.getDate() : '0' + date.getDate()}.png`)
    document.body.appendChild(anchor)
    anchor.click()
  })
  buttons.appendChild(button)
  canvas.after(buttons)
  return myChart
}

viTrack.loadCSV = function (url) {
  return new Promise((resolve) => {
    Papa.parse(url, {
      download: true,
      complete: function (results) {
        const ds = new viTrack.Dataset()
        ds.addSerieses(
          results.data.slice(1).map(function (row) {
            let country = row[1]
            if (country === 'Georgia') {
              country = 'Georgia (country)'
            }
            const pieces = row[0].split(',')
            let region = pieces[pieces.length - 1].trim()
            if (region in viTrack.statemap) {
              region = viTrack.statemap[region]
            } else if (region === 'Hong Kong') {
              country = 'Hong Kong'
              region = ''
            }

            return new viTrack.Series(
              { country: country, region: region },
              row.slice(4))
          })
        )
        resolve(ds)
      }
    })
  })
}

viTrack.loadRaw = async function () {
  const raw = {}
  for (const name in viTrack.urls) {
    raw[name] = await viTrack.loadCSV(viTrack.urls[name])
  }
  return raw
}

viTrack.createByCountry = function () {
  const byCountry = {}
  for (const name in viTrack.raw) {
    const ds = new viTrack.Dataset()
    for (const series of viTrack.raw[name]) {
      const newseries = new viTrack.Series(series.id.country, series.data)
      ds.addSeries(newseries)
    }
    byCountry[name] = ds
  }
  return byCountry
}

viTrack.createByRegionOrCountry = function () {
  const byRegionOrCountry = {}
  for (const name in viTrack.raw) {
    const ds = new viTrack.Dataset()
    for (const series of viTrack.raw[name]) {
      if (series.id.country === 'China') { continue }
      if (series.id.region.startsWith('Diamond')) { continue }
      if (series.id.region.startsWith('Grand')) { continue }
      const label = series.id.region === '' ? series.id.country : series.id.region
      ds.addSeries(new viTrack.Series(label, series.data))
    }
    byRegionOrCountry[name] = ds
  }

  byRegionOrCountry.unresolved = byRegionOrCountry.confirmed
    .subtract(byRegionOrCountry.deaths)
    .subtract(byRegionOrCountry.recovered)
  return byRegionOrCountry
}

viTrack.init = async function () {
  viTrack.raw = await viTrack.loadRaw()
  viTrack.byRegionOrCountry = viTrack.createByRegionOrCountry()
  viTrack.drawConfirmedChart()
  viTrack.drawPctChangeChart()
  viTrack.drawDeathsChart()
  viTrack.drawUnresolvedChart()
}

window.addEventListener('load', viTrack.init)
