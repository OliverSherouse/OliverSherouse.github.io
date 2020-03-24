/* global Papa Chart */

const viTrack = {}

viTrack.colors = {
  neutral: 'rgba(0, 0, 0, 0, 0.2)',
  theme: [
    '#4E79A7', '#8CD17D', '#E15759', '#FABFD2', '#A0CBE8', '#B6992D', '#FF9D9A',
    '#B07AA1', '#F28E2B', '#F1CE63', '#79706E', '#D4A6C8', '#FFBE7D', '#499894',
    '#BAB0AC', '#9D7660', '#59A14F', '#86BCB6', '#D38295', '#D7B5A6'
  ]
}

viTrack.urls = {
  confirmed: [
    'https://raw.githubusercontent.com/CSSEGISandData/COVID-19/master/csse_covid_19_data/csse_covid_19_time_series/time_series_covid19_confirmed_global.csv'
  ],
  deaths: [
    'https://raw.githubusercontent.com/CSSEGISandData/COVID-19/master/csse_covid_19_data/csse_covid_19_time_series/time_series_covid19_deaths_global.csv'
  ],
  testing: []
}

viTrack.getDateParts = function (date) {
  const year = date.getFullYear().toString()
  let month = (date.getMonth() + 1).toString()
  month = month.length === 1 ? '0' + month : month
  let day = date.getDate().toString()
  day = day.length === 1 ? '0' + day : day
  return [year, month, day]
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

  growthRate (periods, threshold) {
    periods = periods || 1
    threshold = threshold || 1
    const pastThreshold = this.getPastThreshold(threshold)
    if (pastThreshold === undefined) { return undefined }
    return new viTrack.Series(
      this.id,
      pastThreshold.data
        .map((v, i, arr) => i < periods ? undefined : Math.pow(v / arr[i - periods], 1 / periods) - 1)
        .slice(periods)
    )
  }

  slice (idx) {
    return new viTrack.Series(this.id, this.data.slice(idx))
  }

  round (precision) {
    precision = precision || 0
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
      const newseries = mapper(series)
      if (newseries !== undefined) {
        ds.addSeries(newseries)
      }
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

  getPastThreshold (threshold) {
    return this.map(s => s.getPastThreshold(threshold))
  }

  growthRate (periods, threshold) {
    return this.map(s => s.growthRate(periods, threshold))
  }

  round (precision) {
    return this.map(s => s.round(precision))
  }

  [Symbol.iterator] () {
    return this.data.values()
  }
}

viTrack.buildChart = function (id, title, source, yAxis) {
  const name = title.toLowerCase().replace(/ /g, '_')

  const canvas = document.getElementById(id)
  const ctx = canvas.getContext('2d')

  const chart = new Chart(ctx, {
    type: 'line',
    devicePixelRatio: 2,
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
        position: 'right'
      },
      scales: {
        xAxes: [{
          type: 'linear',
          ticks: { precision: 0 },
          scaleLabel: {
            display: true,
            padding: {
              top: 4,
              bottom: 32
            }
          }
        }],
        yAxes: [yAxis]
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
        // fill to go behind the initn graph, not on top of it.
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
    const [year, month, day] = viTrack.getDateParts(new Date())
    anchor.setAttribute('download', `${name}_${year}-${month}-${day}.png`)
    document.body.appendChild(anchor)
    anchor.click()
  })
  buttons.appendChild(button)
  canvas.after(buttons)

  return [canvas, chart]
}

viTrack.getTopAreasAndStates = function (data, number) {
  number = number || 10

  const sortedLastObs = []
  for (const series of data) {
    sortedLastObs.push({ id: series.id, lastObs: series.data[series.length - 1] })
  }
  sortedLastObs.sort((a, b) => a.lastObs === b.lastObs ? 0 : (a.lastObs > b.lastObs ? -1 : 1))
  const topAreas = sortedLastObs
    .map(x => x.id)
    .slice(0, 10)
  const states = Object.values(viTrack.statemap)
  const topStates = sortedLastObs
    .map(x => x.id)
    .filter(x => states.includes(x))
    .slice(0, 10)
  return [topAreas, topStates]
}

viTrack.getChartDatasets = function (data, toColor) {
  const datasets = []
  let colored = 0

  for (const series of data) {
    const dataset = {
      label: series.id,
      data: series.data.map(function (v, j) { return { x: j, y: v } }),
      borderColor: viTrack.colors.neutral,
      backgroundColor: viTrack.colors.neutral,
      hoverBorderColor: viTrack.colors.neutral,
      hoverBackgroundColor: viTrack.colors.neutral,
      pointHoverBorderColor: viTrack.colors.neutral,
      pointHoverBackgroundColor: viTrack.colors.neutral,
      pointRadius: 0,
      pointHoverRadius: 0,
      pointHitRadius: 10,
      order: 1,
      fill: false
    }
    if (toColor.includes(series.id)) {
      const color = viTrack.colors.theme[colored % viTrack.colors.theme.length]
      dataset.borderColor = color
      dataset.backgroundColor = color
      dataset.hoverBorderColor = color
      dataset.hoverBackgroundColor = color
      dataset.order = -1
      colored += 1
    }
    datasets.push(dataset)
  }
  return datasets
}

viTrack.initThresholdChart = function (id, data, initialThreshold, units, yscale, title, source) {
  const yAxis = {
    type: yscale,
    scaleLabel: {
      display: true
    }
  }
  if (yscale === 'logarithmic') {
    yAxis.ticks = {
      callback: (v) => Math.log10(v) % 1 === 0 ? v.toLocaleString() : null
    }
    yAxis.scaleLabel.labelString = `${units} (Log Scale)`
  } else {
    yAxis.scaleLabel.labelString = units
  }

  const [canvas, chart] = viTrack.buildChart(id, title, source, yAxis)
  const [topAreas, topStates] = viTrack.getTopAreasAndStates(data)
  const parent = canvas.parentElement
  canvas.insertAdjacentHTML(
    'afterEnd',
    `<div class="field is-horizontal">
      <div class="field-label is-normal">
        <label class="label">Threshold:</label>
      </div>
      <div class="field-body">
        <div class="field">
          <div class="control">
            <input class="input threshold" value=${initialThreshold}></input>
          </div>
          <p class="help is-danger is-hidden threshold-help">Threshold must be a number</p>
        </div>
      </div>
    </div>
    `
  )

  const thresholdInput = parent.querySelector('.threshold')

  const update = function () {
    const threshold = thresholdInput.value
    const preppedData = data
      .getPastThreshold(threshold)
      .filter(s => s.length > 1)
    const toColor = []
    for (let i = 0; i < viTrack.highlightSelect.selectedOptions.length; i++) {
      const value = viTrack.highlightSelect.selectedOptions[i].value
      if (value === 'top-states') {
        for (let j = 0; j <= topStates.length; j++) {
          toColor.push(topStates[j])
        }
      } else if (value === 'top-areas') {
        for (let j = 0; j <= topAreas.length; j++) {
          toColor.push(topAreas[j])
        }
      } else {
        toColor.push(value)
      }
    }

    chart.data.datasets = viTrack.getChartDatasets(preppedData, toColor)
    chart.options.legend.labels.filter = (item) => toColor.includes(item.text)
    if (chart.options.scales.yAxes[0].type === 'logarithmic') {
      chart.options.scales.yAxes[0].ticks.min = Math.pow(10, Math.trunc(Math.log10(threshold)))
    } else {
      chart.options.scales.yAxes[0].ticks.min = 0
    }
    chart.options.scales.xAxes[0].scaleLabel.labelString = `Days Since Passing ${threshold} ${title}`
    chart.update({ duration: 0 })
  }

  viTrack.highlightSelect.addEventListener('change', update)
  thresholdInput.addEventListener('input', () => {
    if (thresholdInput.value.match(/^\d+(\.\d+)?$/)) {
      parent.querySelector('.threshold-help').classList.add('is-hidden')
      update()
    } else {
      parent.querySelector('.threshold-help').classList.remove('is-hidden')
    }
  })
  update()
}

viTrack.initGrowthRateChart = function (id, data, initialPeriods, units, title, source) {
  const initialThreshold = 100
  const yAxis = {
    type: 'linear',
    ticks: {
      callback: (v) => v + '%'
    },
    scaleLabel: {
      display: true
    }
  }
  const [canvas, chart] = viTrack.buildChart(id, title, source, yAxis)
  const parent = canvas.parentElement
  const [topAreas, topStates] = viTrack.getTopAreasAndStates(data)
  canvas.insertAdjacentHTML(
    'afterEnd',
    `<div class="field is-horizontal">
      <div class="field-label is-normal">
        <label class="label">Periods:</label>
      </div>
      <div class="field-body">
        <div class="field">
          <div class="control">
            <input class="input periods" value=${initialPeriods}></input>
          </div>
          <p class="help is-danger is-hidden periods-help">Periods must be an integer</p>
        </div>
      </div>
    </div>
    <div class="field is-horizontal">
      <div class="field-label is-normal">
        <label class="label">Threshold:</label>
      </div>
      <div class="field-body">
        <div class="field">
          <div class="control">
            <input class="input threshold" value=${initialThreshold}></input>
          </div>
          <p class="help is-danger is-hidden threshold-help">Threshold must be a number</p>
        </div>
      </div>
    </div>

    `
  )

  const periodInput = parent.querySelector('.periods')
  const thresholdInput = parent.querySelector('.threshold')

  function update () {
    const periods = periodInput.value
    const threshold = thresholdInput.value
    const preppedData = data
      .growthRate(periods, threshold)
      .filter(s => s.length > 1)
      .mul(100)
      .round(1)
    const toColor = []
    for (let i = 0; i < viTrack.highlightSelect.selectedOptions.length; i++) {
      const value = viTrack.highlightSelect.selectedOptions[i].value
      if (value === 'top-states') {
        for (let j = 0; j <= topStates.length; j++) {
          toColor.push(topStates[j])
        }
      } else if (value === 'top-areas') {
        for (let j = 0; j <= topAreas.length; j++) {
          toColor.push(topAreas[j])
        }
      } else {
        toColor.push(value)
      }
    }

    chart.data.datasets = viTrack.getChartDatasets(preppedData, toColor)
    chart.options.legend.labels.filter = (item) => toColor.includes(item.text)
    chart.options.scales.xAxes[0].scaleLabel.labelString = `Days Since Passing ${threshold} ${units}`
    chart.options.scales.yAxes[0].scaleLabel.labelString = `${periods}-day Compound Growth Rate of ${units}`
    chart.update({ duration: 0 })
  }
  viTrack.highlightSelect.addEventListener('change', update)
  periodInput.addEventListener('input', () => {
    if (periodInput.value.match(/^\d+$/)) {
      parent.querySelector('.periods-help').classList.add('is-hidden')
      update()
    } else {
      parent.querySelector('.periods-help').classList.remove('is-hidden')
    }
  })
  thresholdInput.addEventListener('input', () => {
    if (thresholdInput.value.match(/^\d+(\.\d+)?$/)) {
      parent.querySelector('.threshold-help').classList.add('is-hidden')
      update()
    } else {
      parent.querySelector('.threshold-help').classList.remove('is-hidden')
    }
  })
  update()
}

viTrack.initConfirmedChart = function () {
  viTrack.initThresholdChart(
    'virus-tracker-log-cases',
    viTrack.byRegionOrCountry.confirmed,
    100,
    'Confirmed Cases',
    'logarithmic',
    'Confirmed Cases',
    'Johns Hopkins CSSE'
  )
}

viTrack.initConfirmedPerMChart = function () {
  const data = viTrack.byRegionOrCountry.confirmed
    .filter(s => viTrack.scalars.population[s.id] > 5000000)
    .map(s => s.divide(viTrack.scalars.population[s.id] / 1000000).round())
  viTrack.initThresholdChart(
    'virus-tracker-cases-per-m',
    data,
    25,
    'Confirmed Cases per Million People',
    'logarithmic',
    'Confirmed Cases per Million',
    'Johns Hopkins CSSE, World Bank, Census'
  )
}

viTrack.initDeathsChart = function () {
  viTrack.initThresholdChart(
    'virus-tracker-deaths',
    viTrack.byRegionOrCountry.deaths,
    10,
    'Known Deaths',
    'logarithmic',
    'Known Deaths',
    'Johns Hopkins CSSE'
  )
}

viTrack.initRecentChart = function () {
  const length = 21
  const recent = viTrack.byRegionOrCountry.confirmed
    .filter(s => s.length > length)
    .map(s => new viTrack.Series(s.id, s.data.map((v, i, arr) => v - arr[i - length]).slice(length)))

  viTrack.initThresholdChart(
    'virus-tracker-recent',
    recent,
    100,
    'Confirmed Cases',
    'logarithmic',
    'Recent Cases',
    'Johns Hopkins CSSE'
  )
}

viTrack.initRecentPerBedChart = function () {
  const length = 21
  const serieses = viTrack.byRegionOrCountry.confirmed
    .filter(s => s.length > length)
    .map(s => new viTrack.Series(s.id, s.data.map((v, i, arr) => v - arr[i - length]).slice(length)))
    .filter(s => s.id in viTrack.scalars.beds)
    .filter(s => viTrack.scalars.population[s.id] > 5000000)
    .map(s => s.divide(viTrack.scalars.beds[s.id]).round(3))

  viTrack.initThresholdChart(
    'virus-tracker-recent-per-bed',
    serieses,
    0.01,
    'Recent Cases per Hospital Bed',
    'logarithmic',
    'Recent Cases per Hospital Bed',
    'Johns Hopkins CSSE, World Bank, Kaiser Family Foundation'
  )
}

viTrack.initGrowthRateConfirmedChart = function () {
  viTrack.initGrowthRateChart(
    'virus-tracker-pct-change',
    viTrack.byRegionOrCountry.confirmed,
    5,
    'Confirmed Cases',
    'Growth Rate of Confirmed Cases',
    'Johns Hopkins CSSE'
  )
}

viTrack.loadCSV = async function (url) {
  const results = await new Promise((resolve) => {
    Papa.parse(url, { download: true, complete: (results) => resolve(results) })
  })
  return results.data.slice(1).map(function (row) {
    let country = row[1]
    country = (country === 'Georgia') ? 'Georgia (country)' : country
    country = (country === 'Korea, South') ? 'South Korea' : country
    const pieces = row[0].split(',')
    let region = pieces[pieces.length - 1].trim()
    if (region in viTrack.statemap) {
      region = viTrack.statemap[region]
    } else if (region === 'Hong Kong') {
      country = 'Hong Kong'
      region = ''
    }

    return new viTrack.Series(`${country}----${region}`, row.slice(4))
  })
}

viTrack.loadRaw = async function () {
  const raw = {}
  for (const name in viTrack.urls) {
    raw[name] = new viTrack.Dataset()
    for (let i = 0; i < viTrack.urls[name].length; i++) {
      raw[name].addSerieses(await viTrack.loadCSV(viTrack.urls[name][i]))
    }
  }
  return raw
}

viTrack.createByRegionOrCountry = function () {
  const byRegionOrCountry = {}
  for (const name in viTrack.raw) {
    const ds = new viTrack.Dataset()
    for (const series of viTrack.raw[name]) {
      const [country, region] = series.id.split('----')
      if (country.includes('China')) { continue }
      if (region.includes('Diamond Princess')) { continue }
      // if (region.startsWith('Grand')) { continue }
      const label = region === '' ? country : region
      ds.addSeries(new viTrack.Series(label, series.data))
    }
    byRegionOrCountry[name] = ds
  }

  return byRegionOrCountry
}

viTrack.highlightSelectInit = function () {
  viTrack.highlightSelect = document.getElementById('virus-tracker-highlight-select')
  viTrack.highlightSelect.innerHTML = `
    <option value="top-areas">Top States or Countries</option>
  `
  // <option value="top-states">Top US States</option>
  const areas = Array.from(viTrack.byRegionOrCountry.confirmed.data.keys())
  areas.sort()
  for (const area of areas) {
    viTrack.highlightSelect.insertAdjacentHTML(
      'beforeEnd',
      `<option value="${area}">${area}</option>`
    )
  }
  viTrack.highlightSelect.options[0].selected = true
}

viTrack.init = async function () {
  viTrack.raw = await viTrack.loadRaw()
  viTrack.byRegionOrCountry = viTrack.createByRegionOrCountry()
  viTrack.highlightSelectInit()
  viTrack.initConfirmedChart()
  viTrack.initConfirmedPerMChart()
  viTrack.initGrowthRateConfirmedChart()
  viTrack.initDeathsChart()
  viTrack.initRecentChart()
  viTrack.initRecentPerBedChart()
}

window.addEventListener('load', viTrack.init)

viTrack.statemap = { AL: 'Alabama', AK: 'Alaska', AZ: 'Arizona', AR: 'Arkansas', CA: 'California', CO: 'Colorado', CT: 'Connecticut', DE: 'Delaware', 'D.C.': 'District of Columbia', FL: 'Florida', GA: 'Georgia', HI: 'Hawaii', ID: 'Idaho', IL: 'Illinois', IN: 'Indiana', IA: 'Iowa', KS: 'Kansas', KY: 'Kentucky', LA: 'Louisiana', ME: 'Maine', MD: 'Maryland', MA: 'Massachusetts', MI: 'Michigan', MN: 'Minnesota', MS: 'Mississippi', MO: 'Missouri', MT: 'Montana', NE: 'Nebraska', NV: 'Nevada', NH: 'New Hampshire', NJ: 'New Jersey', NM: 'New Mexico', NY: 'New York', NC: 'North Carolina', ND: 'North Dakota', OH: 'Ohio', OK: 'Oklahoma', OR: 'Oregon', PA: 'Pennsylvania', RI: 'Rhode Island', SC: 'South Carolina', SD: 'South Dakota', TN: 'Tennessee', TX: 'Texas', UT: 'Utah', VT: 'Vermont', VA: 'Virginia', WA: 'Washington', WV: 'West Virginia', WI: 'Wisconsin', WY: 'Wyoming' }
viTrack.scalars = {
  population: { Afghanistan: 37172386, Albania: 2866376, Algeria: 42228429, Andorra: 77006, 'Antigua and Barbuda': 96286, Argentina: 44494502, Armenia: 2951776, Aruba: 105845, Australia: 24992369, Austria: 8847037, Azerbaijan: 9942334, 'The Bahamas': 385640, Bahrain: 1569439, Bangladesh: 161356039, Barbados: 286641, Belarus: 9485386, Belgium: 11422068, Benin: 11485048, Bhutan: 754394, Bolivia: 11353142, 'Bosnia and Herzegovina': 3323929, Brazil: 209469333, Brunei: 428962, Bulgaria: 7024216, 'Burkina Faso': 19751535, Cambodia: 16249798, Cameroon: 25216237, Canada: 37058856, 'Central African Republic': 4666377, Chile: 18729160, China: 1392730000, Colombia: 49648685, 'Congo (Kinshasa)': 84068091, 'Congo (Brazzaville)': 5244363, 'Costa Rica': 4999441, "Cote d'Ivoire": 25069229, Croatia: 4089400, Cuba: 11338138, Cyprus: 1189265, Czechia: 10625695, Denmark: 5797446, 'Dominican Republic': 10627165, Ecuador: 17084357, Egypt: 98423595, 'Equatorial Guinea': 1308974, Estonia: 1320884, Eswatini: 1136191, Ethiopia: 109224559, Finland: 5518050, France: 66987244, Gabon: 2119275, 'The Gambia': 2280102, 'Georgia (country)': 3731000, Germany: 82927922, Ghana: 29767108, Greece: 10727668, Greenland: 56025, Guatemala: 17247807, Guinea: 12414318, Guyana: 779004, Honduras: 9587522, 'Hong Kong': 7451000, Hungary: 9768785, Iceland: 353574, India: 1352617328, Indonesia: 267663435, Iran: 81800269, Iraq: 38433600, Ireland: 4853506, Israel: 8883800, Italy: 60431283, Jamaica: 2934855, Japan: 126529100, Jordan: 9956011, Kazakhstan: 18276499, Kenya: 51393010, 'South Korea': 51635256, Kosovo: 1845300, Kuwait: 4137309, Latvia: 1926542, Lebanon: 6848925, Liberia: 4818977, Liechtenstein: 37910, Lithuania: 2789533, Luxembourg: 607728, Malaysia: 31528585, Maldives: 515696, Malta: 483530, Mauritania: 4403319, Mexico: 126190788, Moldova: 3545883, Monaco: 38682, Mongolia: 3170208, Montenegro: 622345, Morocco: 36029138, Namibia: 2448255, Nepal: 28087871, Netherlands: 17231017, 'New Zealand': 4885500, Nigeria: 195874740, 'North Macedonia': 2082958, Norway: 5314336, Oman: 4829483, Pakistan: 212215030, Panama: 4176873, Paraguay: 6956071, Peru: 31989256, Philippines: 106651922, Poland: 37978548, Portugal: 10281762, Qatar: 2781677, Romania: 19473936, Russia: 144478050, Rwanda: 12301939, 'San Marino': 33785, 'Saudi Arabia': 33699947, Senegal: 15854360, Serbia: 6982084, Seychelles: 96762, Singapore: 5638676, Slovakia: 5447011, Slovenia: 2067372, Somalia: 15008154, 'South Africa': 57779622, Spain: 46723749, 'Sri Lanka': 21670000, 'Saint Lucia': 181889, 'Saint Vincent and the Grenadines': 110210, Sudan: 41801533, Suriname: 575991, Sweden: 10183175, Switzerland: 8516543, Tanzania: 56318348, Thailand: 69428524, Togo: 7889094, 'Trinidad and Tobago': 1389858, Tunisia: 11565204, Turkey: 82319724, Ukraine: 44622516, 'United Arab Emirates': 9630959, 'United Kingdom': 66488991, US: 327167434, Uruguay: 3449299, Uzbekistan: 32955400, Venezuela: 28870195, Vietnam: 95540395, Alabama: 4903185, Alaska: 731545, Arizona: 7278717, Arkansas: 3017804, California: 39512223, Colorado: 5758736, Connecticut: 3565287, Delaware: 973764, 'District of Columbia': 705749, Florida: 21477737, Georgia: 10617423, Hawaii: 1415872, Idaho: 1787065, Illinois: 12671821, Indiana: 6732219, Iowa: 3155070, Kansas: 2913314, Kentucky: 4467673, Louisiana: 4648794, Maine: 1344212, Maryland: 6045680, Massachusetts: 6892503, Michigan: 9986857, Minnesota: 5639632, Mississippi: 2976149, Missouri: 6137428, Montana: 1068778, Nebraska: 1934408, Nevada: 3080156, 'New Hampshire': 1359711, 'New Jersey': 8882190, 'New Mexico': 2096829, 'New York': 19453561, 'North Carolina': 10488084, 'North Dakota': 762062, Ohio: 11689100, Oklahoma: 3956971, Oregon: 4217737, Pennsylvania: 12801989, 'Rhode Island': 1059361, 'South Carolina': 5148714, 'South Dakota': 884659, Tennessee: 6829174, Texas: 28995881, Utah: 3205958, Vermont: 623989, Virginia: 8535519, Washington: 7614893, 'West Virginia': 1792147, Wisconsin: 5822434, Wyoming: 578759 },
  beds: { Afghanistan: 18586.193, Albania: 8312.4904, Algeria: 80234.0151, Andorra: 192.515, 'Antigua and Barbuda': 365.8868, Argentina: 222472.51, Armenia: 12397.4592, Australia: 94971.0022, Austria: 67237.4812, Azerbaijan: 46728.9698, 'The Bahamas': 1118.356, Bahrain: 3138.878, Bangladesh: 129084.8312, Barbados: 1662.5178, Belarus: 104339.246, Belgium: 70816.8216, Benin: 5742.524, Bhutan: 1282.4698, Bolivia: 12488.4562, 'Bosnia and Herzegovina': 11633.7515, Brazil: 460832.5326, Brunei: 1158.1974, Bulgaria: 47764.6688, 'Burkina Faso': 7900.614, Cambodia: 12999.8384, Cameroon: 32781.1081, Canada: 100058.9112, 'Central African Republic': 4666.377, Chile: 41204.152, China: 5849466.0, Colombia: 74473.0275, 'Congo (Kinshasa)': 67254.4728, 'Congo (Brazzaville)': 8390.9808, 'Costa Rica': 5999.3292, "Cote d'Ivoire": 10027.6916, Croatia: 22900.64, Cuba: 58958.3176, Cyprus: 4043.501, Czechia: 69067.0175, Denmark: 14493.615, 'Dominican Republic': 17003.464, Ecuador: 25626.5355, Egypt: 157477.752, 'Equatorial Guinea': 2748.8454, Estonia: 6604.42, Eswatini: 2386.0011, Ethiopia: 32767.3677, Finland: 24279.42, France: 435417.086, Gabon: 13351.4325, 'The Gambia': 2508.1122, 'Georgia (country)': 9700.6, Germany: 688301.7526, Ghana: 26790.3972, Greece: 46128.9724, Greenland: 804.1492479086, Guatemala: 10348.6842, Guinea: 3724.2954, Guyana: 1246.4064, Honduras: 6711.2654, 'Hong Kong': 36442.0969061851, Hungary: 68381.495, Iceland: 1131.4368, India: 946832.1295999999, Indonesia: 321196.122, Iran: 122700.4035, Iraq: 53807.04, Ireland: 13589.8168, Israel: 27539.78, Italy: 205466.3622, Jamaica: 4989.2535, Japan: 1695489.9399999999, Jordan: 13938.4154, Kazakhstan: 122452.5433, Kenya: 71950.214, 'South Korea': 593805.444, Kuwait: 8274.618, Latvia: 11173.9436, Lebanon: 19861.8825, Liberia: 3855.1816, Lithuania: 20363.5909, Luxembourg: 2917.0944, Malaysia: 59904.3115, Maldives: 2217.4928, Malta: 2272.591, Mauritania: 1761.3276, Mexico: 189286.182, Moldova: 20566.1214, Monaco: 533.8116, Mongolia: 22191.456, Montenegro: 2489.38, Morocco: 39632.0518, Namibia: 6610.2885, Nepal: 8426.3613, Netherlands: 80985.7799, 'New Zealand': 13679.4, Nigeria: 97937.37, 'North Macedonia': 9165.0152, Norway: 20725.9104, Oman: 7727.1728, Pakistan: 127329.018, Panama: 9606.8079, Paraguay: 9042.8923, Peru: 51182.8096, Philippines: 106651.922, Poland: 246860.562, Portugal: 34957.9908, Qatar: 3338.0124, Romania: 122685.7968, Russia: 1184720.01, Rwanda: 19683.1024, 'San Marino': 128.383, 'Saudi Arabia': 90989.8569, Senegal: 4756.308, Serbia: 39797.8788, Seychelles: 348.3432, Singapore: 13532.8224, Slovakia: 31592.6638, Slovenia: 9509.9112, Somalia: 13507.3386, 'South Africa': 161782.9416, Spain: 140171.247, 'Sri Lanka': 78012.0, 'Saint Lucia': 236.4557, 'Saint Vincent and the Grenadines': 286.546, Sudan: 33441.2264, Suriname: 1785.5721, Sweden: 26476.255, Switzerland: 40027.7521, Tanzania: 39422.8436, Thailand: 145799.9004, Togo: 5522.3658, 'Trinidad and Tobago': 4169.574, Tunisia: 26599.9692, Turkey: 222263.2548, Ukraine: 392678.1408, 'United Arab Emirates': 11557.1508, 'United Kingdom': 186169.1748, US: 948785.5586, Uruguay: 9658.0372, Uzbekistan: 131821.6, Venezuela: 23096.156, Vietnam: 248405.027, Alabama: 15199.8735, Alaska: 1609.399, Arizona: 13829.5623, Arkansas: 9656.9728, California: 71122.0014, Colorado: 10941.5984, Connecticut: 7130.574, Delaware: 2142.2808, 'District of Columbia': 3105.2956, Florida: 55842.1162, Georgia: 25481.8152, Hawaii: 2690.1568, Idaho: 3395.4235, Illinois: 31679.5525, Indiana: 18176.9913, Iowa: 9465.21, Kansas: 9613.9362, Kentucky: 14296.5536, Louisiana: 15341.0202, Maine: 3360.53, Maryland: 11486.792, Massachusetts: 15852.7569, Michigan: 24967.1425, Minnesota: 14099.08, Mississippi: 11904.596, Missouri: 19026.0268, Montana: 3526.9674, Nebraska: 6963.8688, Nevada: 6468.3276, 'New Hampshire': 2855.3931, 'New Jersey': 21317.256, 'New Mexico': 3774.2922, 'New York': 52524.6147, 'North Carolina': 22024.9764, 'North Dakota': 3276.8666, Ohio: 32729.48, Oklahoma: 11079.5188, Oregon: 6748.3792, Pennsylvania: 37125.7681, 'Rhode Island': 2224.6581, 'South Carolina': 12356.9136, 'South Dakota': 4246.3632, Tennessee: 19804.6046, Texas: 66690.5263, Utah: 5770.7244, Vermont: 1310.3769, Virginia: 17924.5899, Washington: 12945.3181, 'West Virginia': 6810.1586, Wisconsin: 12227.1114, Wyoming: 2025.6565 }
}
