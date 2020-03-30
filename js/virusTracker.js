/* global Papa Chart */

const viTrack = {}

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

  change (periods) {
    if (this.length < periods + 1) { return undefined }
    return new viTrack.Series(
      this.id,
      this.data.map((v, i, arr) => i < periods ? undefined : v - arr[i - periods])
    )
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

  change (periods) {
    return this.map(s => s.change(periods))
  }

  [Symbol.iterator] () {
    return this.data.values()
  }
}

viTrack.getDateParts = function (date) {
  const year = date.getFullYear().toString()
  let month = (date.getMonth() + 1).toString()
  month = month.length === 1 ? '0' + month : month
  let day = date.getDate().toString()
  day = day.length === 1 ? '0' + day : day
  return [year, month, day]
}

viTrack.createElement = function (name, ...classes) {
  const e = document.createElement(name)
  e.classList.add(...classes)
  return e
}

viTrack.Box = class {
  constructor (id) {
    const container = document.getElementById(id)
    container.classList.add('column')
    const box = viTrack.createElement('div', 'box', 'chartbox')
    this.canvas = document.createElement('canvas')
    this.controls = document.createElement('aside')
    const buttons = viTrack.createElement('aside', 'buttons', 'is-centered')
    this.downloadButton = viTrack.createElement('a', 'button', 'is-primary')
    this.downloadButton.innerHTML = '<span class="icon"><span class="fas fa-download"></span></span><span>Download this Chart</span>'
    buttons.appendChild(this.downloadButton)
    this.messages = document.createElement('aside')
    box.appendChild(this.canvas)
    box.appendChild(this.controls)
    box.appendChild(buttons)
    box.appendChild(this.messages)
    container.appendChild(box)
  }

  addField (type, labelText, value) {
    const outerField = viTrack.createElement('div', 'field', 'is-horizontal')
    const fieldLabel = viTrack.createElement('div', 'field-label', 'is-normal')
    const label = viTrack.createElement('label', 'label')
    label.innerHTML = labelText
    fieldLabel.appendChild(label)
    const fieldBody = viTrack.createElement('div', 'field-body')
    fieldLabel.appendChild(label)
    const innerField = viTrack.createElement('div', 'field')
    const control = viTrack.createElement('div', 'control')
    const input = viTrack.createElement('input', 'input')
    input.type = type
    input.value = value
    const help = viTrack.createElement('p', 'help', 'is-danger')
    control.appendChild(input)
    control.appendChild(help)
    innerField.appendChild(control)
    fieldBody.appendChild(innerField)
    outerField.appendChild(fieldLabel)
    outerField.appendChild(fieldBody)
    this.controls.appendChild(outerField)
    return { input: input, help: help }
  }

  clearMessages () { this.messages.innerHTML = '' }

  addMessage (text) {
    const container = viTrack.createElement('div', 'message', 'is-info')
    const par = viTrack.createElement('p', 'message-body')
    par.innerHTML = text
    container.appendChild(par)
    this.messages.append(container)
  }
}

viTrack.buildChart = function (canvas, title, source) {
  const chart = new Chart(canvas, {
    type: 'line',
    devicePixelRatio: 5,
    options: {
      aspectRatio: 1,
      title: {
        display: true,
        fontSize: 24,
        fontStyle: 'normal',
        fontColor: '#4a4a4a',
        fontFamily: 'Raleway, sans',
        text: title
      },
      tooltips: {
        displaycolor: false,
        callbacks: {
          title: (item) => `Day ${item[0].label}`
          // label: (item, data) => `${data[item.datasetIndex].label}: ${item.value.toLocaleString()}`
        }
      },
      legend: {
        position: 'top'
      },
      scales: {
        xAxes: [{
          type: 'linear',
          ticks: { precision: 0 },
          scaleLabel: {
            display: true,
            padding: {
              top: 4,
              bottom: 48
            }
          }
        }],
        yAxes: [{
          scaleLabel: { display: true },
          ticks: { callback: v => v.toLocaleString() }
        }]
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
        const sourcetext = viTrack.meta[viTrack.getCurrentLevel()][source].source
        ctx.fillText(`Source: ${sourcetext}`, c.width - 1, c.height - 36)
        ctx.fillText(`OliverSherouse.com`, c.width - 1, c.height - 24)
      }
    }]
  })

  return chart
}

viTrack.getToColor = function (data) {
  const sortedLastObs = []
  for (const series of data) {
    sortedLastObs.push({ id: series.id, lastObs: Number(series.data[series.length - 1]) })
  }
  sortedLastObs.sort((a, b) => a.lastObs === b.lastObs ? 0 : (a.lastObs > b.lastObs ? -1 : 1))
  const topAreas = sortedLastObs
    .map(x => x.id)
    .slice(0, 5)
  const topStates = sortedLastObs
    .map(x => x.id)
    .filter(x => viTrack.states.includes(x))
    .slice(0, 5)
  const toColor = []
  for (let i = 0; i < viTrack.global.highlight.selectedOptions.length; i++) {
    const value = viTrack.global.highlight.selectedOptions[i].value
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
  return toColor
}

viTrack.getChartDatasets = function (data, toColor) {
  const datasets = []
  const unhighlighted = viTrack.getShowUnhighlighted()
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
    if (unhighlighted || toColor.includes(series.id)) {
      datasets.push(dataset)
    }
  }
  return datasets
}

viTrack.initChart = function (id, title, source, fieldspecs, update) {
  const box = new viTrack.Box(id)
  const chart = viTrack.buildChart(box.canvas, title, source)

  const fields = {}
  for (const fieldname in fieldspecs) {
    const fs = fieldspecs[fieldname]
    fields[fieldname] = box.addField(fs.type || 'text', fs.label, fs.value)
  }

  function wrappedUpdate () {
    update(chart, fields, box)
    chart.update({ duration: 0 })
  }

  for (const fieldname in fields) {
    const field = fields[fieldname]
    field.input.addEventListener('input', function () {
      const fs = fieldspecs[fieldname]
      const value = field.input.value
      if (fs.validator.test(value)) {
        field.help.innerHTML = ''
        wrappedUpdate()
      } else {
        field.help.innerHTML = fs.validator.help
      }
    })
  }

  const name = title.toLowerCase().replace(/ /g, '_')
  box.downloadButton.addEventListener('click', function () {
    const anchor = document.createElement('a')
    anchor.setAttribute('href', box.canvas.toDataURL())
    const [year, month, day] = viTrack.getDateParts(new Date())
    anchor.setAttribute('download', `${name}_${year}-${month}-${day}.png`)
    document.body.appendChild(anchor)
    anchor.click()
  })

  viTrack.registerGlobalOptions(wrappedUpdate)
  wrappedUpdate()
}

viTrack.validators = {
  float: {
    test: v => v.match(/^\d+(\.\d+)?$/),
    help: 'Must be a number'
  },
  int: {
    test: v => v.match(/^\d+$/),
    help: 'Must be an integer'
  }
}

viTrack.setLogTicks = function (chart) {
  chart.options.scales.yAxes[0].type = 'logarithmic'
  chart.options.scales.yAxes[0].ticks.callback = (v) => Math.log10(v) % 1 === 0 ? v.toLocaleString() : null
}

viTrack.initRecentPerBedChart = function () {
  const length = 21
  viTrack.initChart(
    'virus-tracker-recent-per-bed',
    'Recent Cases per Hospital Bed',
    'perbed',
    {
      threshold: {
        label: 'Threshold:',
        value: 0.01,
        validator: viTrack.validators.float
      },
      minpop: {
        label: 'Minimum Population:',
        value: 1000000,
        validator: viTrack.validators.int
      }
    },
    function (chart, fields, box) {
      const threshold = Number(fields.threshold.input.value)
      const minpop = Number(fields.minpop.input.value)
      const data = viTrack.getCurrentData().confirmed
        .map(s => new viTrack.Series(s.id, s.data.map((v, i, arr) => i - length < 0 ? v : v - arr[i - length])))
        .filter(s => viTrack.scalars.population[s.id] > minpop)
        .filter(s => s.id in viTrack.scalars.beds)
        .map(s => s.divide(viTrack.scalars.beds[s.id]).round(3))
        .getPastThreshold(threshold)
      const toColor = viTrack.getToColor(data)
      chart.data.datasets = viTrack.getChartDatasets(data, toColor)
      chart.options.legend.labels.filter = (item) => toColor.includes(item.text)
      viTrack.setLogTicks(chart)
      chart.options.scales.yAxes[0].scaleLabel.labelString = `Cases Confirmed in the Last ${length} Days per Bed (Log Scale)`
      chart.options.scales.xAxes[0].scaleLabel.labelString = `Days Since Reaching ${threshold} Recent Cases per Bed`
      box.clearMessages()
      const message = viTrack.meta[viTrack.getCurrentLevel()].perbed.message
      if (message !== undefined) { box.addMessage(message) }
    }
  )
}

viTrack.initConfirmedChart = function () {
  viTrack.initChart(
    'virus-tracker-cases',
    'Confirmed Cases',
    'counts',
    {
      threshold: {
        label: 'Threshold:',
        value: 100,
        validator: viTrack.validators.int
      }
    },
    function (chart, fields) {
      const threshold = Number(fields.threshold.input.value)
      const data = viTrack.getCurrentData().confirmed
        .getPastThreshold(threshold)
        .filter(s => s.length > 1)
      const toColor = viTrack.getToColor(data)
      chart.data.datasets = viTrack.getChartDatasets(data, toColor)
      chart.options.legend.labels.filter = (item) => toColor.includes(item.text)
      viTrack.setLogTicks(chart)
      chart.options.scales.yAxes[0].scaleLabel.labelString = 'Confirmed Cases (Log Scale)'
      chart.options.scales.xAxes[0].scaleLabel.labelString = `Days Since Reaching ${threshold} Confirmed Cases`
    }
  )
}

viTrack.initDeathsChart = function () {
  viTrack.initChart(
    'virus-tracker-deaths',
    'Known Deaths',
    'counts',
    {
      threshold: {
        label: 'Threshold:',
        value: 10,
        validator: viTrack.validators.int
      }
    },
    function (chart, fields) {
      const threshold = Number(fields.threshold.input.value)
      const data = viTrack.getCurrentData().deaths
        .getPastThreshold(threshold)
        .filter(s => s.length > 1)
      const toColor = viTrack.getToColor(data)
      chart.data.datasets = viTrack.getChartDatasets(data, toColor)
      chart.options.legend.labels.filter = (item) => toColor.includes(item.text)
      viTrack.setLogTicks(chart)
      chart.options.scales.yAxes[0].scaleLabel.labelString = 'Known Deaths (Log Scale)'
      chart.options.scales.xAxes[0].scaleLabel.labelString = `Days Since Reaching ${threshold} Known Deaths`
    }
  )
}

viTrack.getRecent = function () {
  const length = 21
  const recent = viTrack.getCurrentData().confirmed.map(s => new viTrack.Series(s.id, s.data.map((v, i, arr) => v - (arr[i - length] || 0))))
  return [length, recent]
}

viTrack.initRecentChart = function () {
  viTrack.initChart(
    'virus-tracker-recent',
    'Recent Cases',
    'counts',
    {
      threshold: {
        label: 'Threshold:',
        value: 100,
        validator: viTrack.validators.int
      }
    },
    function (chart, fields) {
      const threshold = Number(fields.threshold.input.value)
      const [length, recent] = viTrack.getRecent()

      const preppedData = recent
        .getPastThreshold(threshold)

      const toColor = viTrack.getToColor(preppedData)
      chart.data.datasets = viTrack.getChartDatasets(preppedData, toColor)
      chart.options.legend.labels.filter = (item) => toColor.includes(item.text)
      viTrack.setLogTicks(chart)
      chart.options.scales.yAxes[0].scaleLabel.labelString = `Cases Confirmed in the Last ${length} Days (Log Scale)`
      chart.options.scales.xAxes[0].scaleLabel.labelString = `Days Since Reaching ${threshold} Recent Cases`
    }
  )
}

viTrack.initConfirmedPerMChart = function () {
  viTrack.initChart(
    'virus-tracker-cases-per-m',
    'Confirmed Cases per Million People',
    'perm',
    {
      threshold: {
        label: 'Threshold:',
        value: 10,
        validator: viTrack.validators.float
      },
      minpop: {
        label: 'Minimum Population:',
        value: 1000000,
        validator: viTrack.validators.int
      }
    },
    function (chart, fields) {
      const threshold = Number(fields.threshold.input.value)
      const minpop = Number(fields.minpop.input.value)
      const data = viTrack.getCurrentData().confirmed
        .filter(s => viTrack.scalars.population[s.id] > minpop)
        .map(s => s.divide(viTrack.scalars.population[s.id] / 1000000).round(2))
        .getPastThreshold(threshold)
        .filter(s => s.length > 1)
      const toColor = viTrack.getToColor(data)
      chart.data.datasets = viTrack.getChartDatasets(data, toColor)
      chart.options.legend.labels.filter = (item) => toColor.includes(item.text)
      viTrack.setLogTicks(chart)
      chart.options.scales.yAxes[0].scaleLabel.labelString = 'Confirmed Cases per Million People (Log Scale)'
      chart.options.scales.xAxes[0].scaleLabel.labelString = `Days Since Reaching ${threshold} Confirmed Cases per Million People`
    }
  )
}

viTrack.initDeathsPerMChart = function () {
  viTrack.initChart(
    'virus-tracker-deaths-per-m',
    'Known Deaths per Million People',
    'perm',
    {
      threshold: {
        label: 'Threshold:',
        value: 1,
        validator: viTrack.validators.float
      },
      minpop: {
        label: 'Minimum Population:',
        value: 1000000,
        validator: viTrack.validators.int
      }

    },
    function (chart, fields) {
      const threshold = Number(fields.threshold.input.value)
      const minpop = Number(fields.minpop.input.value)
      const data = viTrack.getCurrentData().deaths
        .filter(s => viTrack.scalars.population[s.id] > minpop)
        .map(s => s.divide(viTrack.scalars.population[s.id] / 1000000).round(2))
        .getPastThreshold(threshold)
        .filter(s => s.length > 1)
      const toColor = viTrack.getToColor(data)
      chart.data.datasets = viTrack.getChartDatasets(data, toColor)
      chart.options.legend.labels.filter = (item) => toColor.includes(item.text)
      viTrack.setLogTicks(chart)
      chart.options.scales.yAxes[0].scaleLabel.labelString = 'Known Deaths per Million People (Log Scale)'
      chart.options.scales.xAxes[0].scaleLabel.labelString = `Days Since Reaching ${threshold} Known Death per Million People`
    }
  )
}

viTrack.initRecentPerMChart = function () {
  viTrack.initChart(
    'virus-tracker-recent-per-m',
    'Recent Cases per Million People',
    'perm',
    {
      threshold: {
        label: 'Threshold:',
        value: 10,
        validator: viTrack.validators.float
      },
      minpop: {
        label: 'Minimum Population:',
        value: 1000000,
        validator: viTrack.validators.int
      }

    },
    function (chart, fields) {
      const [length, data] = viTrack.getRecent()
      const threshold = Number(fields.threshold.input.value)
      const minpop = Number(fields.minpop.input.value)
      const preppedData = data
        .filter(s => viTrack.scalars.population[s.id] > minpop)
        .map(s => s.divide(viTrack.scalars.population[s.id] / 1000000).round(2))
        .getPastThreshold(threshold)
        .filter(s => s.length > 1)
      const toColor = viTrack.getToColor(preppedData)
      chart.data.datasets = viTrack.getChartDatasets(preppedData, toColor)
      chart.options.legend.labels.filter = (item) => toColor.includes(item.text)
      viTrack.setLogTicks(chart)
      chart.options.scales.yAxes[0].scaleLabel.labelString = `Cases Confirmed in Last ${length} Days per Million People (Log Scale)`
      chart.options.scales.xAxes[0].scaleLabel.labelString = `Days Since Reaching ${threshold} Confirmed Cases per Million People`
    }
  )
}

viTrack.initChangeConfirmedChart = function () {
  viTrack.initChart(
    'virus-tracker-cases-delta',
    'Change in Confirmed Cases',
    'counts',
    {
      threshold: {
        label: 'Threshold:',
        value: 100,
        validator: viTrack.validators.int
      },
      periods: {
        label: 'Periods:',
        value: 3,
        validator: viTrack.validators.int
      }
    },
    function (chart, fields) {
      const periods = Number(fields.periods.input.value)
      const threshold = Number(fields.threshold.input.value)

      const data = viTrack.getCurrentData().confirmed
        .getPastThreshold(threshold)
        .change(periods)
        .filter(s => s.length > periods + 1)

      const toColor = viTrack.getToColor(data)
      chart.data.datasets = viTrack.getChartDatasets(data, toColor)
      chart.options.legend.labels.filter = (item) => toColor.includes(item.text)
      viTrack.setLogTicks(chart)
      chart.options.scales.yAxes[0].scaleLabel.labelString = `${periods}-day Change in Confirmed Cases`
      chart.options.scales.xAxes[0].ticks.min = periods
      chart.options.scales.xAxes[0].scaleLabel.labelString = `Days Since Reaching ${threshold} Cases`
    }
  )
}

viTrack.initChangeDeathsChart = function () {
  viTrack.initChart(
    'virus-tracker-deaths-delta',
    'Change in Known Deaths',
    'counts',
    {
      threshold: {
        label: 'Threshold:',
        value: 10,
        validator: viTrack.validators.int
      },
      periods: {
        label: 'Periods:',
        value: 3,
        validator: viTrack.validators.int
      }
    },
    function (chart, fields) {
      const periods = Number(fields.periods.input.value)
      const threshold = Number(fields.threshold.input.value)

      const data = viTrack.getCurrentData().deaths
        .getPastThreshold(threshold)
        .change(periods)
        .filter(s => s.length > periods + 1)

      const toColor = viTrack.getToColor(data)
      chart.data.datasets = viTrack.getChartDatasets(data, toColor)
      chart.options.legend.labels.filter = (item) => toColor.includes(item.text)
      viTrack.setLogTicks(chart)
      chart.options.scales.yAxes[0].scaleLabel.labelString = `${periods}-day Change in Known Deaths`
      chart.options.scales.xAxes[0].ticks.min = periods
      chart.options.scales.xAxes[0].scaleLabel.labelString = `Days Since Reaching ${threshold} Known Deaths`
    }
  )
}

viTrack.initChangeRecentChart = function () {
  viTrack.initChart(
    'virus-tracker-recent-delta',
    'Change in Recent Cases',
    'counts',
    {
      threshold: {
        label: 'Threshold:',
        value: 100,
        validator: viTrack.validators.int
      },
      periods: {
        label: 'Periods:',
        value: 3,
        validator: viTrack.validators.int
      }
    },
    function (chart, fields) {
      const periods = Number(fields.periods.input.value)
      const threshold = Number(fields.threshold.input.value)
      const [length, recent] = viTrack.getRecent()

      const data = recent
        .getPastThreshold(threshold)
        .change(periods)
        .filter(s => s.length > periods + 1)

      const toColor = viTrack.getToColor(data)
      chart.data.datasets = viTrack.getChartDatasets(data, toColor)
      chart.options.legend.labels.filter = (item) => toColor.includes(item.text)
      viTrack.setLogTicks(chart)
      chart.options.scales.yAxes[0].scaleLabel.labelString = `${periods}-day Change in Cases Confirmed in the Previous ${length} Days`
      chart.options.scales.xAxes[0].ticks.min = periods
      chart.options.scales.xAxes[0].scaleLabel.labelString = `Days Since Reaching ${threshold} Recent Cases`
    }
  )
}

viTrack.initGrowthRateConfirmedChart = function () {
  viTrack.initChart(
    'virus-tracker-cases-growth',
    'Growth Rate of Confirmed Cases',
    'counts',
    {
      threshold: {
        label: 'Threshold:',
        value: 100,
        validator: viTrack.validators.int
      },
      periods: {
        label: 'Periods:',
        value: 5,
        validator: viTrack.validators.int
      }
    },
    function (chart, fields) {
      const periods = Number(fields.periods.input.value)
      const threshold = Number(fields.threshold.input.value)

      const preppedData = viTrack.getCurrentData().confirmed
        .growthRate(periods, threshold)
        .filter(s => s.length > periods + 1)
        .mul(100)
        .round()

      const toColor = viTrack.getToColor(preppedData)
      chart.data.datasets = viTrack.getChartDatasets(preppedData, toColor)
      chart.options.legend.labels.filter = (item) => toColor.includes(item.text)
      chart.options.scales.yAxes[0].scaleLabel.labelString = `${periods}-day Compound Growth Rate of Confirmed Cases`
      chart.options.scales.xAxes[0].ticks.min = periods
      chart.options.scales.xAxes[0].scaleLabel.labelString = `Days Since Reaching ${threshold} Cases`
    }
  )
}

viTrack.initGrowthRateDeathsChart = function () {
  viTrack.initChart(
    'virus-tracker-deaths-growth',
    'Growth Rate of Known Deaths',
    'counts',
    {
      threshold: {
        label: 'Threshold:',
        value: 10,
        validator: viTrack.validators.int
      },
      periods: {
        label: 'Periods:',
        value: 5,
        validator: viTrack.validators.int
      }
    },
    function (chart, fields) {
      const periods = Number(fields.periods.input.value)
      const threshold = Number(fields.threshold.input.value)

      const preppedData = viTrack.getCurrentData().deaths
        .growthRate(periods, threshold)
        .filter(s => s.length > periods + 1)
        .mul(100)
        .round()

      const toColor = viTrack.getToColor(preppedData)
      chart.data.datasets = viTrack.getChartDatasets(preppedData, toColor)
      chart.options.legend.labels.filter = (item) => toColor.includes(item.text)
      chart.options.scales.yAxes[0].scaleLabel.labelString = `${periods}-day Compound Growth Rate of Known Deaths`
      chart.options.scales.xAxes[0].ticks.min = periods
      chart.options.scales.xAxes[0].scaleLabel.labelString = `Days Since Reaching ${threshold} Known Deaths`
    }
  )
}

viTrack.initGrowthRateRecentChart = function () {
  viTrack.initChart(
    'virus-tracker-recent-growth',
    'Growth Rate of Recent Cases',
    'counts',
    {
      threshold: {
        label: 'Threshold:',
        value: 100,
        validator: viTrack.validators.int
      },
      periods: {
        label: 'Periods:',
        value: 5,
        validator: viTrack.validators.int
      }
    },
    function (chart, fields) {
      const periods = Number(fields.periods.input.value)
      const threshold = Number(fields.threshold.input.value)
      const [length, data] = viTrack.getRecent()

      const preppedData = data
        .growthRate(periods, threshold)
        .filter(s => s.length > periods + 1)
        .mul(100)
        .round()

      const toColor = viTrack.getToColor(preppedData)
      chart.data.datasets = viTrack.getChartDatasets(preppedData, toColor)
      chart.options.legend.labels.filter = (item) => toColor.includes(item.text)
      chart.options.scales.yAxes[0].scaleLabel.labelString = `${periods}-day Compound Growth Rate of Cases Confirmed in Previous ${length} days`
      chart.options.scales.xAxes[0].ticks.min = periods
      chart.options.scales.xAxes[0].scaleLabel.labelString = `Days Since Reaching ${threshold} Recent Cases`
    }
  )
}

viTrack.loadCSV = async function (url, header) {
  if (header === undefined) { header = false }
  return new Promise((resolve) => {
    Papa.parse(url, {
      download: true,
      header: header,
      complete: results => resolve(results.data)
    })
  })
}

viTrack.loadJHDataset = async function (url) {
  const ds = new viTrack.Dataset()
  const results = await viTrack.loadCSV(url)
  for (let i = 1; i < results.length; i++) {
    const row = results[i]
    let country = row[1]
    if (country === undefined) { continue }
    country = (country === 'Georgia') ? 'Georgia (country)' : country
    country = (country === 'Korea, South') ? 'South Korea' : country
    let region = row[0]
    if (region === 'Hong Kong') {
      country = 'Hong Kong'
      region = ''
    }
    if (country.includes('China')) { continue }
    if (region.includes('Diamond Princess')) { continue }
    if (country.includes('Diamond Princess')) { continue }
    ds.addSeries(new viTrack.Series(`${country}----${region}`, row.slice(4).map(Number)))
  }
  return ds
}

viTrack.getJH = async function () {
  const [confirmed, deaths] = await Promise.all([
    viTrack.loadJHDataset(viTrack.urls.jh.confirmed),
    viTrack.loadJHDataset(viTrack.urls.jh.deaths)
  ])
  return { confirmed: confirmed, deaths: deaths }
}

viTrack.getNYTStates = async function () {
  const data = await viTrack.loadCSV(viTrack.urls.nytStates, true)
  const [confirmed, deaths] = [new viTrack.Dataset(), new viTrack.Dataset()]
  for (const obs of data) {
    const state = obs.state
    if (!confirmed.has(state)) {
      confirmed.addSeries(new viTrack.Series(state, []))
      deaths.addSeries(new viTrack.Series(state, []))
    }
    confirmed.get(state).data.push(Number(obs.cases))
    deaths.get(state).data.push(Number(obs.deaths))
  }
  return { confirmed: confirmed, deaths: deaths }
}

viTrack.getNYTCounties = async function () {
  const data = await viTrack.loadCSV(viTrack.urls.nytCounties, true)
  const [confirmed, deaths] = [new viTrack.Dataset(), new viTrack.Dataset()]
  for (const obs of data) {
    const id = `${obs.county}, ${obs.state}----${Number(obs.fips)}`
    if (!confirmed.has(id)) {
      confirmed.addSeries(new viTrack.Series(id, []))
      deaths.addSeries(new viTrack.Series(id, []))
    }
    confirmed.get(id).data.push(Number(obs.cases))
    deaths.get(id).data.push(Number(obs.deaths))
  }
  return { confirmed: confirmed, deaths: deaths }
}

viTrack.getData = async function () {
  const data = {
    byCountry: {},
    byRegionOrCountry: {},
    byCounty: {},
    byCBSA: {}
  }
  let jhData = viTrack.getJH()
  let nytStates = viTrack.getNYTStates()
  let nytCounties = viTrack.getNYTCounties()

  jhData = await jhData
  for (const variable in jhData) {
    const [byCountry, byRegionOrCountry] = [new viTrack.Dataset(), new viTrack.Dataset()]
    for (const series of jhData[variable]) {
      const [country, region] = series.id.split('----')
      byCountry.addSeries(new viTrack.Series(country, series.data))
      if (country !== 'US') {
        const regionOrCountry = region === '' ? country : region
        byRegionOrCountry.addSeries(new viTrack.Series(regionOrCountry, series.data))
      }
    }
    data.byCountry[variable] = byCountry
    data.byRegionOrCountry[variable] = byRegionOrCountry
  }

  nytStates = await nytStates
  for (const variable in nytStates) {
    for (const series of nytStates[variable]) {
      data.byRegionOrCountry[variable].addSeries(series)
    }
  }
  data.byState = nytStates

  nytCounties = await nytCounties
  for (const variable in nytCounties) {
    const [byCounty, byCBSA] = [new viTrack.Dataset(), new viTrack.Dataset()]
    for (const series of nytCounties[variable]) {
      const [county, fips] = series.id.split('----')
      byCounty.addSeries(new viTrack.Series(county, series.data))
      if (fips in viTrack.cbsamap) {
        const cbsa = viTrack.cbsamap[fips]
        const data = series.data
        if (byCBSA.has(cbsa)) {
          const extant = byCBSA.get(cbsa)
          while (data.length < extant.length) {
            data.unshift(0)
          }
          while (extant.length < data.length) {
            extant.data.unshift(0)
          }
        }
        byCBSA.addSeries(new viTrack.Series(viTrack.cbsamap[fips], data))
      }
    }
    data.byCounty[variable] = byCounty
    data.byCBSA[variable] = byCBSA
  }

  return data
}

viTrack.populateHighlightSelect = function () {
  viTrack.global.highlight = document.getElementById('virus-tracker-highlight-select')
  viTrack.global.highlight.innerHTML = `
    <option value="top-areas">Highest Observations</option>
 `
  const areas = Array.from(viTrack.getCurrentData().confirmed.data.keys())
  areas.sort()
  for (const area of areas) {
    viTrack.global.highlight.insertAdjacentHTML(
      'beforeEnd',
      `<option value="${area}">${area}</option>`
    )
  }
  viTrack.global.highlight.options[0].selected = true
}

viTrack.getCurrentData = function () {
  return viTrack.data[viTrack.getCurrentLevel()]
}

viTrack.getCurrentLevel = function () {
  return viTrack.global.dataSelect.options[viTrack.global.dataSelect.selectedIndex].value
}

viTrack.getShowUnhighlighted = function () {
  return viTrack.global.showUnhighlighted.checked
}

viTrack.initGlobalOptions = function () {
  viTrack.global = {}
  viTrack.global.dataSelect = document.getElementById('virus-tracker-data-select')
  viTrack.global.dataSelect.innerHTML = `
    <option value="byRegionOrCountry">Country or Region</option>
    <option value="byCountry">Country</option>
    <option value="byState">US States</option>
    <option value="byCounty">US County</option>
    <option value="byCBSA">US Cities</option>
  `
  viTrack.global.dataSelect.options[0].selected = true
  viTrack.global.dataSelect.addEventListener('change', viTrack.populateHighlightSelect)
  viTrack.global.showUnhighlighted = document.getElementById('virus-tracker-show-unhighlighted')
  viTrack.populateHighlightSelect()
}

viTrack.registerGlobalOptions = function (callback) {
  for (const i in viTrack.global) {
    viTrack.global[i].addEventListener('change', callback)
  }
}

viTrack.init = async function () {
  viTrack.data = await viTrack.getData()
  viTrack.states = Array.from(viTrack.data.byState.confirmed.data.keys())
  viTrack.initGlobalOptions()
  viTrack.initRecentPerBedChart()
  viTrack.initConfirmedChart()
  viTrack.initDeathsChart()
  viTrack.initRecentChart()
  viTrack.initConfirmedPerMChart()
  viTrack.initDeathsPerMChart()
  viTrack.initRecentPerMChart()
  viTrack.initChangeConfirmedChart()
  viTrack.initChangeDeathsChart()
  viTrack.initGrowthRateConfirmedChart()
  viTrack.initGrowthRateDeathsChart()
  viTrack.initGrowthRateRecentChart()
}

viTrack.meta = {
  byCountry: {
    counts: { source: 'JHU CSSE' },
    perm: { source: 'JHU CSSE, World Bank' },
    perbed: { source: 'JHU CSSE, World Bank' }
  },
  byRegionOrCountry: {
    counts: { source: 'JHU CSSE, New York Times' },
    perm: { source: 'JHU CSSE, New York Times, World Bank, Census' },
    perbed: { source: 'JHU CSSE, New York Times, World Bank, Census, Kaiser Family Foundation' }
  },
  byState: {
    counts: { source: 'New York Times' },
    perm: { source: 'New York Times, Census' },
    perbed: { source: 'New York Times, Census, Kaiser Family Foundation' }
  },
  byCounty: {
    counts: { source: 'New York Times' },
    perm: { source: 'New York Times, Census' },
    perbed: {
      source: 'New York Times, Census, Kaiser Family Foundation',
      message: 'Beds per thousand assumed to be the same at state and county level'
    }
  },
  byCBSA: {
    counts: { source: 'New York Times' },
    perm: { source: 'New York Times, Census' },
    perbed: {
      source: 'New York Times, Census, Kaiser Family Foundation',
      message: 'Beds per thousand assumed to be the same at state and county level.'
    }
  }
}

viTrack.colors = {
  neutral: 'rgba(0, 0, 0, 0, 0.2)',
  theme: [
    '#4E79A7', '#8CD17D', '#E15759', '#FABFD2', '#A0CBE8', '#B6992D', '#FF9D9A',
    '#B07AA1', '#F28E2B', '#F1CE63', '#79706E', '#D4A6C8', '#FFBE7D', '#499894',
    '#BAB0AC', '#9D7660', '#59A14F', '#86BCB6', '#D38295', '#D7B5A6'
  ]
}

viTrack.urls = {
  jh: {
    confirmed: 'https://raw.githubusercontent.com/CSSEGISandData/COVID-19/master/csse_covid_19_data/csse_covid_19_time_series/time_series_covid19_confirmed_global.csv',
    deaths: 'https://raw.githubusercontent.com/CSSEGISandData/COVID-19/master/csse_covid_19_data/csse_covid_19_time_series/time_series_covid19_deaths_global.csv'
  },
  nytStates: 'https://raw.githubusercontent.com/nytimes/covid-19-data/master/us-states.csv',
  nytCounties: 'https://raw.githubusercontent.com/nytimes/covid-19-data/master/us-counties.csv'
}

viTrack.scalars = {
  population: { Afghanistan: 37172386, Albania: 2866376, Algeria: 42228429, Andorra: 77006, Angola: 30809762, 'Antigua and Barbuda': 96286, Argentina: 44494502, Armenia: 2951776, Australia: 24992369, Austria: 8847037, Azerbaijan: 9942334, Bahamas: 385640, Bahrain: 1569439, Bangladesh: 161356039, Barbados: 286641, Belarus: 9485386, Belgium: 11422068, Belize: 383071, Benin: 11485048, Bhutan: 754394, Bolivia: 11353142, 'Bosnia and Herzegovina': 3323929, Brazil: 209469333, Brunei: 428962, Bulgaria: 7024216, 'Burkina Faso': 19751535, 'Cabo Verde': 543767, Cambodia: 16249798, Cameroon: 25216237, Canada: 37058856, 'Central African Republic': 4666377, Chad: 15477751, Chile: 18729160, China: 1392730000, Colombia: 49648685, 'Congo (Kinshasa)': 84068091, 'Congo (Brazzaville)': 5244363, 'Costa Rica': 4999441, "Cote d'Ivoire": 25069229, Croatia: 4089400, Cuba: 11338138, Cyprus: 1189265, Czechia: 10625695, Denmark: 5797446, Djibouti: 958920, Dominica: 71625, 'Dominican Republic': 10627165, Ecuador: 17084357, Egypt: 98423595, 'El Salvador': 6420744, 'Equatorial Guinea': 1308974, Eritrea: 3213972, Estonia: 1320884, Eswatini: 1136191, Ethiopia: 109224559, Fiji: 883483, Finland: 5518050, France: 66987244, Gabon: 2119275, Gambia: 2280102, 'Georgia (country)': 3731000, Germany: 82927922, Ghana: 29767108, Greece: 10727668, Grenada: 111454, Guatemala: 17247807, Guinea: 12414318, 'Guinea-Bissau': 1874309, Guyana: 779004, Haiti: 11123176, Honduras: 9587522, 'Hong Kong': 7451000, Hungary: 9768785, Iceland: 353574, India: 1352617328, Indonesia: 267663435, Iran: 81800269, Iraq: 38433600, Ireland: 4853506, Israel: 8883800, Italy: 60431283, Jamaica: 2934855, Japan: 126529100, Jordan: 9956011, Kazakhstan: 18276499, Kenya: 51393010, 'Korea, South': 51635256, Kosovo: 1845300, Kuwait: 4137309, Kyrgyzstan: 6315800, Laos: 7061507, Latvia: 1926542, Lebanon: 6848925, Liberia: 4818977, Libya: 6678567, Liechtenstein: 37910, Lithuania: 2789533, Luxembourg: 607728, Madagascar: 26262368, Malaysia: 31528585, Maldives: 515696, Mali: 19077690, Malta: 483530, Mauritania: 4403319, Mauritius: 1265303, Mexico: 126190788, Moldova: 3545883, Monaco: 38682, Mongolia: 3170208, Montenegro: 622345, Morocco: 36029138, Mozambique: 29495962, Burma: 53708395, Namibia: 2448255, Nepal: 28087871, Netherlands: 17231017, 'New Zealand': 4885500, Nicaragua: 6465513, Niger: 22442948, Nigeria: 195874740, 'North Macedonia': 2082958, Norway: 5314336, Oman: 4829483, Pakistan: 212215030, Panama: 4176873, 'Papua New Guinea': 8606316, Paraguay: 6956071, Peru: 31989256, Philippines: 106651922, Poland: 37978548, Portugal: 10281762, Qatar: 2781677, Romania: 19473936, Russia: 144478050, Rwanda: 12301939, 'San Marino': 33785, 'Saudi Arabia': 33699947, Senegal: 15854360, Serbia: 6982084, Seychelles: 96762, Singapore: 5638676, Slovakia: 5447011, Slovenia: 2067372, Somalia: 15008154, 'South Africa': 57779622, Spain: 46723749, 'Sri Lanka': 21670000, 'Saint Kitts and Nevis': 52441, 'Saint Lucia': 181889, 'Saint Vincent and the Grenadines': 110210, Sudan: 41801533, Suriname: 575991, Sweden: 10183175, Switzerland: 8516543, Syria: 16906283, Tanzania: 56318348, Thailand: 69428524, 'Timor-Leste': 1267972, Togo: 7889094, 'Trinidad and Tobago': 1389858, Tunisia: 11565204, Turkey: 82319724, Uganda: 42723139, Ukraine: 44622516, 'United Arab Emirates': 9630959, 'United Kingdom': 66488991, US: 327167434, Uruguay: 3449299, Uzbekistan: 32955400, Venezuela: 28870195, Vietnam: 95540395, 'West Bank and Gaza': 4569087, Zambia: 17351822, Zimbabwe: 14439018, Alabama: 4903185, Alaska: 731545, Arizona: 7278717, Arkansas: 3017804, California: 39512223, Colorado: 5758736, Connecticut: 3565287, Delaware: 973764, 'District of Columbia': 705749, Florida: 21477737, Georgia: 10617423, Hawaii: 1415872, Idaho: 1787065, Illinois: 12671821, Indiana: 6732219, Iowa: 3155070, Kansas: 2913314, Kentucky: 4467673, Louisiana: 4648794, Maine: 1344212, Maryland: 6045680, Massachusetts: 6892503, Michigan: 9986857, Minnesota: 5639632, Mississippi: 2976149, Missouri: 6137428, Montana: 1068778, Nebraska: 1934408, Nevada: 3080156, 'New Hampshire': 1359711, 'New Jersey': 8882190, 'New Mexico': 2096829, 'New York': 19453561, 'North Carolina': 10488084, 'North Dakota': 762062, Ohio: 11689100, Oklahoma: 3956971, Oregon: 4217737, Pennsylvania: 12801989, 'Rhode Island': 1059361, 'South Carolina': 5148714, 'South Dakota': 884659, Tennessee: 6829174, Texas: 28995881, Utah: 3205958, Vermont: 623989, Virginia: 8535519, Washington: 7614893, 'West Virginia': 1792147, Wisconsin: 5822434, Wyoming: 578759, 'Autauga, Alabama': 55869, 'Baldwin, Alabama': 223234, 'Blount, Alabama': 57826, 'Bullock, Alabama': 10101, 'Butler, Alabama': 19448, 'Calhoun, Alabama': 113605, 'Chambers, Alabama': 33254, 'Cherokee, Alabama': 26196, 'Chilton, Alabama': 44428, 'Choctaw, Alabama': 12589, 'Clay, Alabama': 13235, 'Cleburne, Alabama': 14910, 'Colbert, Alabama': 55241, 'Coosa, Alabama': 10663, 'Covington, Alabama': 37049, 'Crenshaw, Alabama': 13772, 'Cullman, Alabama': 83768, 'Dallas, Alabama': 37196, 'DeKalb, Alabama': 71513, 'Elmore, Alabama': 81209, 'Escambia, Alabama': 36633, 'Etowah, Alabama': 102268, 'Franklin, Alabama': 31362, 'Greene, Alabama': 8111, 'Houston, Alabama': 105882, 'Jackson, Alabama': 51626, 'Jefferson, Alabama': 658573, 'Lamar, Alabama': 13805, 'Lauderdale, Alabama': 92729, 'Lawrence, Alabama': 32924, 'Lee, Alabama': 164542, 'Limestone, Alabama': 98915, 'Lowndes, Alabama': 9726, 'Madison, Alabama': 372909, 'Marengo, Alabama': 18863, 'Marion, Alabama': 29709, 'Marshall, Alabama': 96774, 'Mobile, Alabama': 413210, 'Monroe, Alabama': 20733, 'Montgomery, Alabama': 226486, 'Morgan, Alabama': 119679, 'Pickens, Alabama': 19930, 'Pike, Alabama': 33114, 'Randolph, Alabama': 22722, 'Russell, Alabama': 57961, 'St. Clair, Alabama': 89512, 'Shelby, Alabama': 217702, 'Talladega, Alabama': 79978, 'Tallapoosa, Alabama': 40367, 'Tuscaloosa, Alabama': 209355, 'Walker, Alabama': 63521, 'Washington, Alabama': 16326, 'Wilcox, Alabama': 10373, 'Winston, Alabama': 23629, 'Anchorage, Alaska': 288000, 'Fairbanks North Star Borough, Alaska': 96849, 'Juneau City and Borough, Alaska': 31974, 'Kenai Peninsula Borough, Alaska': 58708, 'Ketchikan Gateway Borough, Alaska': 13901, 'Matanuska-Susitna Borough, Alaska': 108317, 'Apache, Arizona': 71887, 'Cochise, Arizona': 125922, 'Coconino, Arizona': 143476, 'Gila, Arizona': 54018, 'Graham, Arizona': 38837, 'La Paz, Arizona': 21108, 'Maricopa, Arizona': 4485414, 'Mohave, Arizona': 212181, 'Navajo, Arizona': 110924, 'Pima, Arizona': 1047279, 'Pinal, Arizona': 462789, 'Santa Cruz, Arizona': 46498, 'Yavapai, Arizona': 235099, 'Yuma, Arizona': 213787, 'Baxter, Arkansas': 41932, 'Benton, Arkansas': 279141, 'Boone, Arkansas': 37432, 'Bradley, Arkansas': 10763, 'Chicot, Arkansas': 10118, 'Clark, Arkansas': 22320, 'Cleburne, Arkansas': 24919, 'Cleveland, Arkansas': 7956, 'Columbia, Arkansas': 23457, 'Conway, Arkansas': 20846, 'Craighead, Arkansas': 110332, 'Crawford, Arkansas': 63257, 'Crittenden, Arkansas': 47955, 'Cross, Arkansas': 16419, 'Desha, Arkansas': 11361, 'Drew, Arkansas': 18219, 'Faulkner, Arkansas': 126007, 'Garland, Arkansas': 99386, 'Grant, Arkansas': 18265, 'Greene, Arkansas': 45325, 'Hempstead, Arkansas': 21532, 'Hot Spring, Arkansas': 33771, 'Howard, Arkansas': 13202, 'Independence, Arkansas': 37825, 'Jefferson, Arkansas': 66824, 'Johnson, Arkansas': 26578, 'Lawrence, Arkansas': 16406, 'Lincoln, Arkansas': 13024, 'Lonoke, Arkansas': 73309, 'Pike, Arkansas': 10718, 'Poinsett, Arkansas': 23528, 'Polk, Arkansas': 19964, 'Pope, Arkansas': 64072, 'Pulaski, Arkansas': 391911, 'Randolph, Arkansas': 17958, 'Saline, Arkansas': 122437, 'Searcy, Arkansas': 7881, 'Sebastian, Arkansas': 127827, 'Sevier, Arkansas': 17007, 'Stone, Arkansas': 12506, 'Union, Arkansas': 38682, 'Van Buren, Arkansas': 16545, 'Washington, Arkansas': 239187, 'White, Arkansas': 78753, 'Woodruff, Arkansas': 6320, 'Alameda, California': 1671329, 'Amador, California': 39752, 'Butte, California': 219186, 'Calaveras, California': 45905, 'Colusa, California': 21547, 'Contra Costa, California': 1153526, 'El Dorado, California': 192843, 'Fresno, California': 999101, 'Glenn, California': 28393, 'Humboldt, California': 135558, 'Imperial, California': 181215, 'Inyo, California': 18039, 'Kern, California': 900202, 'Kings, California': 152940, 'Los Angeles, California': 10039107, 'Madera, California': 157327, 'Marin, California': 258826, 'Mendocino, California': 86749, 'Merced, California': 277680, 'Mono, California': 14444, 'Monterey, California': 434061, 'Napa, California': 137744, 'Nevada, California': 99755, 'Orange, California': 3175692, 'Placer, California': 398329, 'Riverside, California': 2470546, 'Sacramento, California': 1552058, 'San Benito, California': 62808, 'San Bernardino, California': 2180085, 'San Diego, California': 3338330, 'San Francisco, California': 881549, 'San Joaquin, California': 762148, 'San Luis Obispo, California': 283111, 'San Mateo, California': 766573, 'Santa Barbara, California': 446499, 'Santa Clara, California': 1927852, 'Santa Cruz, California': 273213, 'Shasta, California': 180080, 'Siskiyou, California': 43539, 'Solano, California': 447643, 'Sonoma, California': 494336, 'Stanislaus, California': 550660, 'Sutter, California': 96971, 'Tulare, California': 466195, 'Ventura, California': 846006, 'Yolo, California': 220500, 'Yuba, California': 78668, 'Adams, Colorado': 517421, 'Alamosa, Colorado': 16233, 'Arapahoe, Colorado': 656590, 'Baca, Colorado': 3581, 'Boulder, Colorado': 326196, 'Broomfield, Colorado': 70465, 'Chaffee, Colorado': 20356, 'Clear Creek, Colorado': 9700, 'Costilla, Colorado': 3887, 'Crowley, Colorado': 6061, 'Delta, Colorado': 31162, 'Denver, Colorado': 727211, 'Douglas, Colorado': 351154, 'Eagle, Colorado': 55127, 'Elbert, Colorado': 26729, 'El Paso, Colorado': 720403, 'Fremont, Colorado': 47839, 'Garfield, Colorado': 60061, 'Grand, Colorado': 15734, 'Gunnison, Colorado': 17462, 'Hinsdale, Colorado': 820, 'Huerfano, Colorado': 6897, 'Jefferson, Colorado': 582881, 'Kit Carson, Colorado': 7097, 'La Plata, Colorado': 56221, 'Larimer, Colorado': 356899, 'Lincoln, Colorado': 5701, 'Logan, Colorado': 22409, 'Mesa, Colorado': 154210, 'Moffat, Colorado': 13283, 'Montrose, Colorado': 42758, 'Morgan, Colorado': 29068, 'Otero, Colorado': 18278, 'Park, Colorado': 18845, 'Pitkin, Colorado': 17767, 'Pueblo, Colorado': 168424, 'Rio Grande, Colorado': 11267, 'Routt, Colorado': 25638, 'San Miguel, Colorado': 8179, 'Summit, Colorado': 31011, 'Teller, Colorado': 25388, 'Washington, Colorado': 4908, 'Weld, Colorado': 324492, 'Yuma, Colorado': 10019, 'Fairfield, Connecticut': 943332, 'Hartford, Connecticut': 891720, 'Litchfield, Connecticut': 180333, 'Middlesex, Connecticut': 162436, 'New Haven, Connecticut': 854757, 'New London, Connecticut': 265206, 'Tolland, Connecticut': 150721, 'Windham, Connecticut': 116782, 'Kent, Delaware': 180786, 'New Castle, Delaware': 558753, 'Sussex, Delaware': 234225, 'District of Columbia, District of Columbia': 705749, 'Alachua, Florida': 269043, 'Baker, Florida': 29210, 'Bay, Florida': 174705, 'Bradford, Florida': 28201, 'Brevard, Florida': 601942, 'Broward, Florida': 1952778, 'Charlotte, Florida': 188910, 'Citrus, Florida': 149657, 'Clay, Florida': 219252, 'Collier, Florida': 384902, 'Columbia, Florida': 71686, 'DeSoto, Florida': 38001, 'Duval, Florida': 957755, 'Escambia, Florida': 318316, 'Flagler, Florida': 115081, 'Gadsden, Florida': 45660, 'Hendry, Florida': 42022, 'Hernando, Florida': 193920, 'Highlands, Florida': 106221, 'Hillsborough, Florida': 1471968, 'Indian River, Florida': 159923, 'Jackson, Florida': 46414, 'Lake, Florida': 367118, 'Lee, Florida': 770577, 'Leon, Florida': 293582, 'Levy, Florida': 41503, 'Manatee, Florida': 403253, 'Marion, Florida': 365579, 'Martin, Florida': 161000, 'Miami-Dade, Florida': 2716940, 'Monroe, Florida': 74228, 'Nassau, Florida': 88625, 'Okaloosa, Florida': 210738, 'Orange, Florida': 1393452, 'Osceola, Florida': 375751, 'Palm Beach, Florida': 1496770, 'Pasco, Florida': 553947, 'Pinellas, Florida': 974996, 'Polk, Florida': 724777, 'Putnam, Florida': 74521, 'St. Johns, Florida': 264672, 'St. Lucie, Florida': 328297, 'Santa Rosa, Florida': 184313, 'Sarasota, Florida': 433742, 'Seminole, Florida': 471826, 'Sumter, Florida': 132420, 'Suwannee, Florida': 44417, 'Volusia, Florida': 553284, 'Walton, Florida': 74071, 'Washington, Florida': 25473, 'Baker, Georgia': 3038, 'Baldwin, Georgia': 44890, 'Barrow, Georgia': 83240, 'Bartow, Georgia': 107738, 'Ben Hill, Georgia': 16700, 'Bibb, Georgia': 153159, 'Bryan, Georgia': 39627, 'Bulloch, Georgia': 79608, 'Burke, Georgia': 22383, 'Butts, Georgia': 24936, 'Calhoun, Georgia': 6189, 'Camden, Georgia': 54666, 'Carroll, Georgia': 119992, 'Catoosa, Georgia': 67580, 'Charlton, Georgia': 13392, 'Chatham, Georgia': 289430, 'Chattahoochee, Georgia': 10907, 'Chattooga, Georgia': 24789, 'Cherokee, Georgia': 258773, 'Clarke, Georgia': 128331, 'Clayton, Georgia': 292256, 'Clinch, Georgia': 6618, 'Cobb, Georgia': 760141, 'Coffee, Georgia': 43273, 'Colquitt, Georgia': 45600, 'Columbia, Georgia': 156714, 'Coweta, Georgia': 148509, 'Crisp, Georgia': 22372, 'Dawson, Georgia': 26108, 'Decatur, Georgia': 26404, 'DeKalb, Georgia': 759297, 'Dodge, Georgia': 20605, 'Dougherty, Georgia': 87956, 'Douglas, Georgia': 146343, 'Early, Georgia': 10190, 'Effingham, Georgia': 64296, 'Fannin, Georgia': 26188, 'Fayette, Georgia': 114421, 'Floyd, Georgia': 98498, 'Forsyth, Georgia': 244252, 'Franklin, Georgia': 23349, 'Fulton, Georgia': 1063937, 'Glynn, Georgia': 85292, 'Gordon, Georgia': 57963, 'Greene, Georgia': 18324, 'Gwinnett, Georgia': 936250, 'Habersham, Georgia': 45328, 'Hall, Georgia': 204441, 'Haralson, Georgia': 29792, 'Harris, Georgia': 35236, 'Hart, Georgia': 26205, 'Heard, Georgia': 11923, 'Henry, Georgia': 234561, 'Houston, Georgia': 157863, 'Irwin, Georgia': 9416, 'Jackson, Georgia': 72977, 'Jasper, Georgia': 14219, 'Jenkins, Georgia': 8676, 'Jones, Georgia': 28735, 'Lamar, Georgia': 19077, 'Laurens, Georgia': 47546, 'Lee, Georgia': 29992, 'Liberty, Georgia': 61435, 'Lincoln, Georgia': 7921, 'Long, Georgia': 19559, 'Lowndes, Georgia': 117406, 'Lumpkin, Georgia': 33610, 'McDuffie, Georgia': 21312, 'Macon, Georgia': 12947, 'Madison, Georgia': 29880, 'Meriwether, Georgia': 21167, 'Miller, Georgia': 5718, 'Mitchell, Georgia': 21863, 'Monroe, Georgia': 27578, 'Morgan, Georgia': 19276, 'Murray, Georgia': 40096, 'Muscogee, Georgia': 195769, 'Newton, Georgia': 111744, 'Oconee, Georgia': 40280, 'Paulding, Georgia': 168667, 'Peach, Georgia': 27546, 'Pickens, Georgia': 32591, 'Pierce, Georgia': 19465, 'Pike, Georgia': 18962, 'Polk, Georgia': 42613, 'Pulaski, Georgia': 11137, 'Randolph, Georgia': 6778, 'Richmond, Georgia': 202518, 'Rockdale, Georgia': 90896, 'Seminole, Georgia': 8090, 'Spalding, Georgia': 66703, 'Stephens, Georgia': 25925, 'Sumter, Georgia': 29524, 'Tattnall, Georgia': 25286, 'Taylor, Georgia': 8020, 'Telfair, Georgia': 15860, 'Terrell, Georgia': 8531, 'Thomas, Georgia': 44451, 'Tift, Georgia': 40644, 'Toombs, Georgia': 26830, 'Troup, Georgia': 69922, 'Turner, Georgia': 7985, 'Twiggs, Georgia': 8120, 'Upson, Georgia': 26320, 'Walton, Georgia': 94593, 'Ware, Georgia': 35734, 'Washington, Georgia': 20374, 'Wheeler, Georgia': 7855, 'White, Georgia': 30798, 'Whitfield, Georgia': 104628, 'Wilkes, Georgia': 9777, 'Worth, Georgia': 20247, 'Hawaii, Hawaii': 201513, 'Honolulu, Hawaii': 974563, 'Kauai, Hawaii': 72293, 'Maui, Hawaii': 167417, 'Ada, Idaho': 481587, 'Bannock, Idaho': 87808, 'Bingham, Idaho': 46811, 'Blaine, Idaho': 23021, 'Bonneville, Idaho': 119062, 'Canyon, Idaho': 229849, 'Cassia, Idaho': 24030, 'Custer, Idaho': 4315, 'Fremont, Idaho': 13099, 'Gem, Idaho': 18112, 'Idaho, Idaho': 16667, 'Jefferson, Idaho': 29871, 'Kootenai, Idaho': 165697, 'Lincoln, Idaho': 5366, 'Madison, Idaho': 39907, 'Nez Perce, Idaho': 40408, 'Payette, Idaho': 23951, 'Teton, Idaho': 12142, 'Twin Falls, Idaho': 86878, 'Valley, Idaho': 11392, 'Adams, Illinois': 65435, 'Bureau, Illinois': 32628, 'Carroll, Illinois': 14305, 'Champaign, Illinois': 209689, 'Christian, Illinois': 32304, 'Clinton, Illinois': 37562, 'Cook, Illinois': 5150233, 'Cumberland, Illinois': 10766, 'DeKalb, Illinois': 104897, 'Douglas, Illinois': 19465, 'DuPage, Illinois': 922921, 'Fayette, Illinois': 21336, 'Franklin, Illinois': 38469, 'Grundy, Illinois': 51054, 'Henry, Illinois': 48913, 'Iroquois, Illinois': 27114, 'Jackson, Illinois': 56750, 'Jo Daviess, Illinois': 21235, 'Kane, Illinois': 532403, 'Kankakee, Illinois': 109862, 'Kendall, Illinois': 128990, 'Lake, Illinois': 696535, 'LaSalle, Illinois': 108669, 'Livingston, Illinois': 35648, 'Logan, Illinois': 28618, 'McHenry, Illinois': 307774, 'McLean, Illinois': 171517, 'Macon, Illinois': 104009, 'Madison, Illinois': 262966, 'Marshall, Illinois': 11438, 'Monroe, Illinois': 34637, 'Morgan, Illinois': 33658, 'Peoria, Illinois': 179179, 'Rock Island, Illinois': 141879, 'St. Clair, Illinois': 259686, 'Sangamon, Illinois': 194672, 'Stephenson, Illinois': 44498, 'Tazewell, Illinois': 131803, 'Washington, Illinois': 13887, 'Whiteside, Illinois': 55175, 'Will, Illinois': 690743, 'Williamson, Illinois': 66597, 'Winnebago, Illinois': 282572, 'Woodford, Illinois': 38459, 'Adams, Indiana': 35777, 'Allen, Indiana': 379299, 'Bartholomew, Indiana': 83779, 'Boone, Indiana': 67843, 'Brown, Indiana': 15092, 'Carroll, Indiana': 20257, 'Clark, Indiana': 118302, 'Clinton, Indiana': 32399, 'Crawford, Indiana': 10577, 'Dearborn, Indiana': 49458, 'Decatur, Indiana': 26559, 'DeKalb, Indiana': 43475, 'Delaware, Indiana': 114135, 'Dubois, Indiana': 42736, 'Elkhart, Indiana': 206341, 'Fayette, Indiana': 23102, 'Floyd, Indiana': 78522, 'Fountain, Indiana': 16346, 'Franklin, Indiana': 22758, 'Fulton, Indiana': 19974, 'Gibson, Indiana': 33659, 'Grant, Indiana': 65769, 'Hamilton, Indiana': 338011, 'Hancock, Indiana': 78168, 'Harrison, Indiana': 40515, 'Hendricks, Indiana': 170311, 'Henry, Indiana': 47972, 'Howard, Indiana': 82544, 'Huntington, Indiana': 36520, 'Jackson, Indiana': 44231, 'Jasper, Indiana': 33562, 'Jennings, Indiana': 27735, 'Johnson, Indiana': 158167, 'Kosciusko, Indiana': 79456, 'LaGrange, Indiana': 39614, 'Lake, Indiana': 485493, 'LaPorte, Indiana': 109888, 'Lawrence, Indiana': 45370, 'Madison, Indiana': 129569, 'Marion, Indiana': 964582, 'Marshall, Indiana': 46258, 'Miami, Indiana': 35516, 'Monroe, Indiana': 148431, 'Montgomery, Indiana': 38338, 'Morgan, Indiana': 70489, 'Newton, Indiana': 13984, 'Noble, Indiana': 47744, 'Ohio, Indiana': 5875, 'Orange, Indiana': 19646, 'Owen, Indiana': 20799, 'Porter, Indiana': 170389, 'Posey, Indiana': 25427, 'Putnam, Indiana': 37576, 'Randolph, Indiana': 24665, 'Ripley, Indiana': 28324, 'Rush, Indiana': 16581, 'St. Joseph, Indiana': 271826, 'Scott, Indiana': 23873, 'Shelby, Indiana': 44729, 'Starke, Indiana': 22995, 'Sullivan, Indiana': 20669, 'Switzerland, Indiana': 10751, 'Tippecanoe, Indiana': 195732, 'Tipton, Indiana': 15148, 'Vanderburgh, Indiana': 181451, 'Vermillion, Indiana': 15498, 'Vigo, Indiana': 107038, 'Wabash, Indiana': 30996, 'Warren, Indiana': 8265, 'Warrick, Indiana': 62998, 'Washington, Indiana': 28036, 'Wayne, Indiana': 65884, 'Wells, Indiana': 28296, 'White, Indiana': 24102, 'Whitley, Indiana': 33964, 'Adair, Iowa': 7152, 'Allamakee, Iowa': 13687, 'Appanoose, Iowa': 12426, 'Benton, Iowa': 25645, 'Black Hawk, Iowa': 131228, 'Boone, Iowa': 26234, 'Buchanan, Iowa': 21175, 'Butler, Iowa': 14439, 'Carroll, Iowa': 20165, 'Cedar, Iowa': 18627, 'Cerro Gordo, Iowa': 42450, 'Clayton, Iowa': 17549, 'Clinton, Iowa': 46429, 'Dallas, Iowa': 93453, 'Des Moines, Iowa': 38967, 'Dickinson, Iowa': 17258, 'Dubuque, Iowa': 97311, 'Fayette, Iowa': 19650, 'Hancock, Iowa': 10630, 'Hardin, Iowa': 16846, 'Harrison, Iowa': 14049, 'Henry, Iowa': 19954, 'Iowa, Iowa': 16184, 'Jasper, Iowa': 37185, 'Johnson, Iowa': 151140, 'Keokuk, Iowa': 10246, 'Kossuth, Iowa': 14813, 'Linn, Iowa': 226706, 'Mahaska, Iowa': 22095, 'Marshall, Iowa': 39369, 'Monona, Iowa': 8615, 'Montgomery, Iowa': 9917, 'Muscatine, Iowa': 42664, 'Page, Iowa': 15107, 'Polk, Iowa': 490161, 'Pottawattamie, Iowa': 93206, 'Poweshiek, Iowa': 18504, 'Scott, Iowa': 172943, 'Shelby, Iowa': 11454, 'Sioux, Iowa': 34855, 'Story, Iowa': 97117, 'Tama, Iowa': 16854, 'Taylor, Iowa': 6121, 'Wapello, Iowa': 34969, 'Warren, Iowa': 51466, 'Washington, Iowa': 21965, 'Webster, Iowa': 35904, 'Winneshiek, Iowa': 19991, 'Woodbury, Iowa': 103107, 'Wright, Iowa': 12562, 'Bourbon, Kansas': 14534, 'Butler, Kansas': 66911, 'Cherokee, Kansas': 19939, 'Clay, Kansas': 8002, 'Coffey, Kansas': 8179, 'Crawford, Kansas': 38818, 'Doniphan, Kansas': 7600, 'Douglas, Kansas': 122259, 'Ford, Kansas': 33619, 'Franklin, Kansas': 25544, 'Gove, Kansas': 2636, 'Harvey, Kansas': 34429, 'Jackson, Kansas': 13171, 'Jefferson, Kansas': 19043, 'Johnson, Kansas': 602401, 'Leavenworth, Kansas': 81758, 'Linn, Kansas': 9703, 'Lyon, Kansas': 33195, 'McPherson, Kansas': 28542, 'Miami, Kansas': 34237, 'Mitchell, Kansas': 5979, 'Morris, Kansas': 5620, 'Neosho, Kansas': 16007, 'Osage, Kansas': 15949, 'Ottawa, Kansas': 5704, 'Pottawatomie, Kansas': 24383, 'Reno, Kansas': 61998, 'Riley, Kansas': 74232, 'Sedgwick, Kansas': 516042, 'Shawnee, Kansas': 176875, 'Sumner, Kansas': 22836, 'Woodson, Kansas': 3138, 'Wyandotte, Kansas': 165429, 'Allen, Kentucky': 21315, 'Anderson, Kentucky': 22747, 'Boone, Kentucky': 133581, 'Bourbon, Kentucky': 19788, 'Boyle, Kentucky': 30060, 'Bracken, Kentucky': 8303, 'Breathitt, Kentucky': 12630, 'Breckinridge, Kentucky': 20477, 'Bullitt, Kentucky': 81676, 'Butler, Kentucky': 12879, 'Calloway, Kentucky': 39001, 'Campbell, Kentucky': 93584, 'Carroll, Kentucky': 10631, 'Christian, Kentucky': 70461, 'Clark, Kentucky': 36263, 'Daviess, Kentucky': 101511, 'Fayette, Kentucky': 323152, 'Floyd, Kentucky': 35589, 'Franklin, Kentucky': 50991, 'Grant, Kentucky': 25069, 'Grayson, Kentucky': 26427, 'Hardin, Kentucky': 110958, 'Harrison, Kentucky': 18886, 'Henderson, Kentucky': 45210, 'Hopkins, Kentucky': 44686, 'Jefferson, Kentucky': 766757, 'Jessamine, Kentucky': 54115, 'Kenton, Kentucky': 166998, 'Larue, Kentucky': 14398, 'Laurel, Kentucky': 60813, 'Logan, Kentucky': 27102, 'Lyon, Kentucky': 8210, 'McCracken, Kentucky': 65418, 'McCreary, Kentucky': 17231, 'Madison, Kentucky': 92987, 'Martin, Kentucky': 11195, 'Mason, Kentucky': 17070, 'Menifee, Kentucky': 6489, 'Mercer, Kentucky': 21933, 'Montgomery, Kentucky': 28157, 'Muhlenberg, Kentucky': 30622, 'Nelson, Kentucky': 46233, 'Nicholas, Kentucky': 7269, 'Oldham, Kentucky': 66799, 'Pulaski, Kentucky': 64979, 'Scott, Kentucky': 57004, 'Shelby, Kentucky': 49024, 'Simpson, Kentucky': 18572, 'Spencer, Kentucky': 19351, 'Union, Kentucky': 14381, 'Warren, Kentucky': 132896, 'Washington, Kentucky': 12095, 'Wayne, Kentucky': 20333, 'Webster, Kentucky': 12942, 'Woodford, Kentucky': 26734, 'Acadia, Louisiana': 62045, 'Allen, Louisiana': 25627, 'Ascension, Louisiana': 126604, 'Assumption, Louisiana': 21891, 'Avoyelles, Louisiana': 40144, 'Beauregard, Louisiana': 37497, 'Bienville, Louisiana': 13241, 'Bossier, Louisiana': 127039, 'Caddo, Louisiana': 240204, 'Calcasieu, Louisiana': 203436, 'Catahoula, Louisiana': 9494, 'Claiborne, Louisiana': 15670, 'De Soto, Louisiana': 27463, 'East Baton Rouge, Louisiana': 440059, 'East Carroll, Louisiana': 6861, 'East Feliciana, Louisiana': 19135, 'Evangeline, Louisiana': 33395, 'Franklin, Louisiana': 20015, 'Grant, Louisiana': 22389, 'Iberia, Louisiana': 69830, 'Iberville, Louisiana': 32511, 'Jackson, Louisiana': 15744, 'Jefferson, Louisiana': 432493, 'Jefferson Davis, Louisiana': 31368, 'Lafayette, Louisiana': 244390, 'Lafourche, Louisiana': 97614, 'LaSalle, Louisiana': 14892, 'Lincoln, Louisiana': 46742, 'Livingston, Louisiana': 140789, 'Madison, Louisiana': 10951, 'Morehouse, Louisiana': 24874, 'Natchitoches, Louisiana': 38158, 'Orleans, Louisiana': 390144, 'Ouachita, Louisiana': 153279, 'Plaquemines, Louisiana': 23197, 'Pointe Coupee, Louisiana': 21730, 'Rapides, Louisiana': 129648, 'Richland, Louisiana': 20122, 'St. Bernard, Louisiana': 47244, 'St. Charles, Louisiana': 53100, 'St. James, Louisiana': 21096, 'St. John the Baptist, Louisiana': 42837, 'St. Landry, Louisiana': 82124, 'St. Martin, Louisiana': 53431, 'St. Mary, Louisiana': 49348, 'St. Tammany, Louisiana': 260419, 'Tangipahoa, Louisiana': 134758, 'Terrebonne, Louisiana': 110461, 'Union, Louisiana': 22108, 'Vermilion, Louisiana': 59511, 'Vernon, Louisiana': 47429, 'Washington, Louisiana': 46194, 'Webster, Louisiana': 38340, 'West Baton Rouge, Louisiana': 26465, 'West Feliciana, Louisiana': 15568, 'Winn, Louisiana': 13904, 'Androscoggin, Maine': 108277, 'Cumberland, Maine': 295003, 'Franklin, Maine': 30199, 'Kennebec, Maine': 122302, 'Knox, Maine': 39772, 'Lincoln, Maine': 34634, 'Oxford, Maine': 57975, 'Penobscot, Maine': 152148, 'Sagadahoc, Maine': 35856, 'Waldo, Maine': 39715, 'York, Maine': 207641, 'Anne Arundel, Maryland': 579234, 'Baltimore, Maryland': 827370, 'Calvert, Maryland': 92525, 'Caroline, Maryland': 33406, 'Carroll, Maryland': 168447, 'Cecil, Maryland': 102855, 'Charles, Maryland': 163257, 'Frederick, Maryland': 259547, 'Garrett, Maryland': 29014, 'Harford, Maryland': 255441, 'Howard, Maryland': 325690, 'Kent, Maryland': 19422, 'Montgomery, Maryland': 1050688, "Prince George's, Maryland": 909327, "Queen Anne's, Maryland": 50381, "St. Mary's, Maryland": 113510, 'Somerset, Maryland': 25616, 'Talbot, Maryland': 37181, 'Washington, Maryland': 151049, 'Wicomico, Maryland': 103609, 'Worcester, Maryland': 52276, 'Baltimore city, Maryland': 593490, 'Barnstable, Massachusetts': 212990, 'Berkshire, Massachusetts': 124944, 'Bristol, Massachusetts': 565217, 'Dukes, Massachusetts': 17332, 'Essex, Massachusetts': 789034, 'Franklin, Massachusetts': 70180, 'Hampden, Massachusetts': 466372, 'Hampshire, Massachusetts': 160830, 'Middlesex, Massachusetts': 1611699, 'Nantucket, Massachusetts': 11399, 'Norfolk, Massachusetts': 706775, 'Plymouth, Massachusetts': 521202, 'Suffolk, Massachusetts': 803907, 'Worcester, Massachusetts': 830622, 'Allegan, Michigan': 118081, 'Barry, Michigan': 61550, 'Bay, Michigan': 103126, 'Berrien, Michigan': 153401, 'Calhoun, Michigan': 134159, 'Cass, Michigan': 51787, 'Charlevoix, Michigan': 26143, 'Chippewa, Michigan': 37349, 'Clare, Michigan': 30950, 'Clinton, Michigan': 79595, 'Crawford, Michigan': 14029, 'Dickinson, Michigan': 25239, 'Eaton, Michigan': 110268, 'Emmet, Michigan': 33415, 'Genesee, Michigan': 405813, 'Gladwin, Michigan': 25449, 'Gogebic, Michigan': 13975, 'Grand Traverse, Michigan': 93088, 'Gratiot, Michigan': 40711, 'Hillsdale, Michigan': 45605, 'Huron, Michigan': 30981, 'Ingham, Michigan': 292406, 'Ionia, Michigan': 64697, 'Iosco, Michigan': 25127, 'Isabella, Michigan': 69872, 'Jackson, Michigan': 158510, 'Kalamazoo, Michigan': 265066, 'Kalkaska, Michigan': 18038, 'Kent, Michigan': 656955, 'Lapeer, Michigan': 87607, 'Leelanau, Michigan': 21761, 'Lenawee, Michigan': 98451, 'Livingston, Michigan': 191995, 'Luce, Michigan': 6229, 'Macomb, Michigan': 873972, 'Manistee, Michigan': 24558, 'Marquette, Michigan': 66699, 'Mecosta, Michigan': 43453, 'Midland, Michigan': 83156, 'Missaukee, Michigan': 15118, 'Monroe, Michigan': 150500, 'Montcalm, Michigan': 63888, 'Muskegon, Michigan': 173566, 'Newaygo, Michigan': 48980, 'Oakland, Michigan': 1257584, 'Oceana, Michigan': 26467, 'Ogemaw, Michigan': 20997, 'Osceola, Michigan': 23460, 'Otsego, Michigan': 24668, 'Ottawa, Michigan': 291830, 'Roscommon, Michigan': 24019, 'Saginaw, Michigan': 190539, 'St. Clair, Michigan': 159128, 'Sanilac, Michigan': 41170, 'Shiawassee, Michigan': 68122, 'Tuscola, Michigan': 52245, 'Van Buren, Michigan': 75677, 'Washtenaw, Michigan': 367601, 'Wayne, Michigan': 1749343, 'Wexford, Michigan': 33631, 'Anoka, Minnesota': 356921, 'Beltrami, Minnesota': 47188, 'Benton, Minnesota': 40889, 'Big Stone, Minnesota': 4991, 'Blue Earth, Minnesota': 67653, 'Carver, Minnesota': 105089, 'Cass, Minnesota': 29779, 'Chisago, Minnesota': 56579, 'Clay, Minnesota': 64222, 'Clearwater, Minnesota': 8818, 'Dakota, Minnesota': 429021, 'Dodge, Minnesota': 20934, 'Faribault, Minnesota': 13653, 'Fillmore, Minnesota': 21067, 'Goodhue, Minnesota': 46340, 'Hennepin, Minnesota': 1265843, 'Jackson, Minnesota': 9846, 'Kandiyohi, Minnesota': 43199, 'Lac qui Parle, Minnesota': 6623, 'Le Sueur, Minnesota': 28887, 'Lincoln, Minnesota': 5639, 'Lyon, Minnesota': 25474, 'Mahnomen, Minnesota': 5527, 'Martin, Minnesota': 19683, 'Mower, Minnesota': 40062, 'Nicollet, Minnesota': 34274, 'Olmsted, Minnesota': 158293, 'Ramsey, Minnesota': 550321, 'Renville, Minnesota': 14548, 'Rice, Minnesota': 66972, 'St. Louis, Minnesota': 199070, 'Scott, Minnesota': 149013, 'Sherburne, Minnesota': 97238, 'Sibley, Minnesota': 14865, 'Stearns, Minnesota': 161075, 'Steele, Minnesota': 36649, 'Wabasha, Minnesota': 21627, 'Waseca, Minnesota': 18612, 'Washington, Minnesota': 262440, 'Wilkin, Minnesota': 6207, 'Winona, Minnesota': 50484, 'Wright, Minnesota': 138377, 'Adams, Mississippi': 30693, 'Amite, Mississippi': 12297, 'Attala, Mississippi': 18174, 'Benton, Mississippi': 8259, 'Bolivar, Mississippi': 30628, 'Calhoun, Mississippi': 14361, 'Chickasaw, Mississippi': 17103, 'Choctaw, Mississippi': 8210, 'Clarke, Mississippi': 15541, 'Clay, Mississippi': 19316, 'Coahoma, Mississippi': 22124, 'Copiah, Mississippi': 28065, 'Covington, Mississippi': 18636, 'DeSoto, Mississippi': 184945, 'Forrest, Mississippi': 74897, 'Franklin, Mississippi': 7713, 'George, Mississippi': 24500, 'Grenada, Mississippi': 20758, 'Hancock, Mississippi': 47632, 'Harrison, Mississippi': 208080, 'Hinds, Mississippi': 231840, 'Holmes, Mississippi': 17010, 'Humphreys, Mississippi': 8064, 'Itawamba, Mississippi': 23390, 'Jackson, Mississippi': 143617, 'Jefferson, Mississippi': 6990, 'Jones, Mississippi': 68098, 'Kemper, Mississippi': 9742, 'Lafayette, Mississippi': 54019, 'Lamar, Mississippi': 63343, 'Lauderdale, Mississippi': 74125, 'Lawrence, Mississippi': 12586, 'Leake, Mississippi': 22786, 'Lee, Mississippi': 85436, 'Leflore, Mississippi': 28183, 'Lincoln, Mississippi': 34153, 'Lowndes, Mississippi': 58595, 'Madison, Mississippi': 106272, 'Marion, Mississippi': 24573, 'Marshall, Mississippi': 35294, 'Monroe, Mississippi': 35252, 'Montgomery, Mississippi': 9775, 'Neshoba, Mississippi': 29118, 'Newton, Mississippi': 21018, 'Noxubee, Mississippi': 10417, 'Oktibbeha, Mississippi': 49587, 'Panola, Mississippi': 34192, 'Pearl River, Mississippi': 55535, 'Perry, Mississippi': 11973, 'Pike, Mississippi': 39288, 'Pontotoc, Mississippi': 32174, 'Prentiss, Mississippi': 25126, 'Quitman, Mississippi': 6792, 'Rankin, Mississippi': 155271, 'Scott, Mississippi': 28124, 'Sharkey, Mississippi': 4321, 'Simpson, Mississippi': 26658, 'Smith, Mississippi': 15916, 'Sunflower, Mississippi': 25110, 'Tallahatchie, Mississippi': 13809, 'Tate, Mississippi': 28321, 'Tippah, Mississippi': 22015, 'Tunica, Mississippi': 9632, 'Union, Mississippi': 28815, 'Walthall, Mississippi': 14286, 'Washington, Mississippi': 43909, 'Webster, Mississippi': 9689, 'Wilkinson, Mississippi': 8630, 'Winston, Mississippi': 17955, 'Yalobusha, Mississippi': 12108, 'Yazoo, Mississippi': 29690, 'Adair, Missouri': 25343, 'Atchison, Missouri': 5143, 'Barry, Missouri': 35789, 'Bates, Missouri': 16172, 'Benton, Missouri': 19443, 'Bollinger, Missouri': 12133, 'Boone, Missouri': 180463, 'Buchanan, Missouri': 87364, 'Callaway, Missouri': 44743, 'Camden, Missouri': 46305, 'Cape Girardeau, Missouri': 78871, 'Carter, Missouri': 5982, 'Cass, Missouri': 105780, 'Chariton, Missouri': 7426, 'Christian, Missouri': 88595, 'Clay, Missouri': 249948, 'Clinton, Missouri': 20387, 'Cole, Missouri': 76745, 'Cooper, Missouri': 17709, 'Dunklin, Missouri': 29131, 'Franklin, Missouri': 103967, 'Greene, Missouri': 293086, 'Henry, Missouri': 21824, 'Jackson, Missouri': 703011, 'Jasper, Missouri': 121328, 'Jefferson, Missouri': 225081, 'Johnson, Missouri': 54062, 'Lafayette, Missouri': 32708, 'Lincoln, Missouri': 59013, 'McDonald, Missouri': 22837, 'Moniteau, Missouri': 16132, 'Montgomery, Missouri': 11551, 'Newton, Missouri': 58236, 'Pemiscot, Missouri': 15805, 'Perry, Missouri': 19136, 'Pettis, Missouri': 42339, 'Platte, Missouri': 104418, 'Pulaski, Missouri': 52607, 'Ralls, Missouri': 10309, 'Randolph, Missouri': 24748, 'Ray, Missouri': 23018, 'Ripley, Missouri': 13288, 'St. Charles, Missouri': 402022, 'St. Francois, Missouri': 67215, 'St. Louis, Missouri': 994205, 'Scott, Missouri': 38280, 'Shelby, Missouri': 5930, 'Stoddard, Missouri': 29025, 'Taney, Missouri': 55928, 'Texas, Missouri': 25398, 'Warren, Missouri': 35649, 'Wright, Missouri': 18289, 'St. Louis city, Missouri': 300576, 'Broadwater, Montana': 6237, 'Cascade, Montana': 81366, 'Flathead, Montana': 103806, 'Gallatin, Montana': 114434, 'Hill, Montana': 16484, 'Jefferson, Montana': 12221, 'Lake, Montana': 30458, 'Lewis and Clark, Montana': 69432, 'Lincoln, Montana': 19980, 'Madison, Montana': 8600, 'Meagher, Montana': 1862, 'Missoula, Montana': 119600, 'Park, Montana': 16606, 'Ravalli, Montana': 43806, 'Roosevelt, Montana': 11004, 'Silver Bow, Montana': 34915, 'Toole, Montana': 4736, 'Yellowstone, Montana': 161300, 'Adams, Nebraska': 31363, 'Buffalo, Nebraska': 49659, 'Cass, Nebraska': 26248, 'Dawson, Nebraska': 23595, 'Dodge, Nebraska': 36565, 'Douglas, Nebraska': 571327, 'Gosper, Nebraska': 1990, 'Hall, Nebraska': 61353, 'Hamilton, Nebraska': 9324, 'Kearney, Nebraska': 6495, 'Knox, Nebraska': 8332, 'Lancaster, Nebraska': 319090, 'Lincoln, Nebraska': 34914, 'Madison, Nebraska': 35099, 'Nemaha, Nebraska': 6972, 'Platte, Nebraska': 33470, 'Sarpy, Nebraska': 187196, 'Saunders, Nebraska': 21578, 'Washington, Nebraska': 20729, 'Clark, Nevada': 2266715, 'Douglas, Nevada': 48905, 'Elko, Nevada': 52778, 'Humboldt, Nevada': 16831, 'Lyon, Nevada': 57510, 'Nye, Nevada': 46523, 'Washoe, Nevada': 471519, 'Carson City, Nevada': 55916, 'Belknap, New Hampshire': 61303, 'Carroll, New Hampshire': 48910, 'Cheshire, New Hampshire': 76085, 'Grafton, New Hampshire': 89886, 'Hillsborough, New Hampshire': 417025, 'Merrimack, New Hampshire': 151391, 'Rockingham, New Hampshire': 309769, 'Strafford, New Hampshire': 130633, 'Sullivan, New Hampshire': 43146, 'Atlantic, New Jersey': 263670, 'Bergen, New Jersey': 932202, 'Burlington, New Jersey': 445349, 'Camden, New Jersey': 506471, 'Cape May, New Jersey': 92039, 'Cumberland, New Jersey': 149527, 'Essex, New Jersey': 798975, 'Gloucester, New Jersey': 291636, 'Hudson, New Jersey': 672391, 'Hunterdon, New Jersey': 124371, 'Mercer, New Jersey': 367430, 'Middlesex, New Jersey': 825062, 'Monmouth, New Jersey': 618795, 'Morris, New Jersey': 491845, 'Ocean, New Jersey': 607186, 'Passaic, New Jersey': 501826, 'Salem, New Jersey': 62385, 'Somerset, New Jersey': 328934, 'Sussex, New Jersey': 140488, 'Union, New Jersey': 556341, 'Warren, New Jersey': 105267, 'Bernalillo, New Mexico': 679121, 'Chaves, New Mexico': 64615, 'Cibola, New Mexico': 26675, 'Curry, New Mexico': 48954, 'Do\u00f1a Ana, New Mexico': 218195, 'Eddy, New Mexico': 58460, 'Lea, New Mexico': 71070, 'McKinley, New Mexico': 71367, 'Rio Arriba, New Mexico': 38921, 'Roosevelt, New Mexico': 18500, 'Sandoval, New Mexico': 146748, 'San Juan, New Mexico': 123958, 'San Miguel, New Mexico': 27277, 'Santa Fe, New Mexico': 150358, 'Socorro, New Mexico': 16637, 'Taos, New Mexico': 32723, 'Valencia, New Mexico': 76688, 'Albany, New York': 305506, 'Allegany, New York': 46091, 'Broome, New York': 190488, 'Cattaraugus, New York': 76117, 'Cayuga, New York': 76576, 'Chautauqua, New York': 126903, 'Chemung, New York': 83456, 'Chenango, New York': 47207, 'Clinton, New York': 80485, 'Columbia, New York': 59461, 'Cortland, New York': 47581, 'Delaware, New York': 44135, 'Dutchess, New York': 294218, 'Erie, New York': 918702, 'Essex, New York': 36885, 'Franklin, New York': 50022, 'Fulton, New York': 53383, 'Genesee, New York': 57280, 'Greene, New York': 47188, 'Hamilton, New York': 4416, 'Herkimer, New York': 61319, 'Jefferson, New York': 109834, 'Livingston, New York': 62914, 'Madison, New York': 70941, 'Monroe, New York': 741770, 'Montgomery, New York': 49221, 'Nassau, New York': 1356924, 'Niagara, New York': 209281, 'Oneida, New York': 228671, 'Onondaga, New York': 460528, 'Ontario, New York': 109777, 'Orange, New York': 384940, 'Orleans, New York': 40352, 'Oswego, New York': 117124, 'Otsego, New York': 59493, 'Putnam, New York': 98320, 'Rensselaer, New York': 158714, 'Rockland, New York': 325789, 'St. Lawrence, New York': 107740, 'Saratoga, New York': 229863, 'Schenectady, New York': 155299, 'Schoharie, New York': 30999, 'Schuyler, New York': 17807, 'Steuben, New York': 95379, 'Suffolk, New York': 1476601, 'Sullivan, New York': 75432, 'Tioga, New York': 48203, 'Tompkins, New York': 102180, 'Ulster, New York': 177573, 'Warren, New York': 63944, 'Washington, New York': 61204, 'Wayne, New York': 89918, 'Westchester, New York': 967506, 'Wyoming, New York': 39859, 'Alamance, North Carolina': 169509, 'Beaufort, North Carolina': 46994, 'Bertie, North Carolina': 18947, 'Brunswick, North Carolina': 142820, 'Buncombe, North Carolina': 261191, 'Burke, North Carolina': 90485, 'Cabarrus, North Carolina': 216453, 'Caldwell, North Carolina': 82178, 'Carteret, North Carolina': 69473, 'Catawba, North Carolina': 159551, 'Chatham, North Carolina': 74470, 'Cherokee, North Carolina': 28612, 'Cleveland, North Carolina': 97947, 'Craven, North Carolina': 102139, 'Cumberland, North Carolina': 335509, 'Davidson, North Carolina': 167609, 'Davie, North Carolina': 42846, 'Duplin, North Carolina': 58741, 'Durham, North Carolina': 321488, 'Edgecombe, North Carolina': 51472, 'Forsyth, North Carolina': 382295, 'Franklin, North Carolina': 69685, 'Gaston, North Carolina': 224529, 'Granville, North Carolina': 60443, 'Greene, North Carolina': 21069, 'Guilford, North Carolina': 537174, 'Harnett, North Carolina': 135976, 'Henderson, North Carolina': 117417, 'Hertford, North Carolina': 23677, 'Hoke, North Carolina': 55234, 'Iredell, North Carolina': 181806, 'Jackson, North Carolina': 43938, 'Johnston, North Carolina': 209339, 'Lee, North Carolina': 61779, 'Lenoir, North Carolina': 55949, 'Lincoln, North Carolina': 86111, 'McDowell, North Carolina': 45756, 'Mecklenburg, North Carolina': 1110356, 'Montgomery, North Carolina': 27173, 'Moore, North Carolina': 100880, 'Nash, North Carolina': 94298, 'New Hanover, North Carolina': 234473, 'Northampton, North Carolina': 19483, 'Onslow, North Carolina': 197938, 'Orange, North Carolina': 148476, 'Pasquotank, North Carolina': 39824, 'Perquimans, North Carolina': 13463, 'Person, North Carolina': 39490, 'Pitt, North Carolina': 180742, 'Polk, North Carolina': 20724, 'Randolph, North Carolina': 143667, 'Richmond, North Carolina': 44829, 'Robeson, North Carolina': 130625, 'Rowan, North Carolina': 142088, 'Sampson, North Carolina': 63531, 'Scotland, North Carolina': 34823, 'Stanly, North Carolina': 62806, 'Surry, North Carolina': 71783, 'Transylvania, North Carolina': 34385, 'Union, North Carolina': 239859, 'Vance, North Carolina': 44535, 'Wake, North Carolina': 1111761, 'Watauga, North Carolina': 56177, 'Wayne, North Carolina': 123131, 'Wilson, North Carolina': 81801, 'Barnes, North Dakota': 10415, 'Burleigh, North Dakota': 95626, 'Cass, North Dakota': 181923, 'Divide, North Dakota': 2264, 'Dunn, North Dakota': 4424, 'Foster, North Dakota': 3210, 'McHenry, North Dakota': 5745, 'McIntosh, North Dakota': 2497, 'McLean, North Dakota': 9450, 'Mercer, North Dakota': 8187, 'Morton, North Dakota': 31364, 'Mountrail, North Dakota': 10545, 'Pierce, North Dakota': 3975, 'Ramsey, North Dakota': 11519, 'Sioux, North Dakota': 4230, 'Stark, North Dakota': 31489, 'Walsh, North Dakota': 10641, 'Ward, North Dakota': 67641, 'Allen, Ohio': 102351, 'Ashland, Ohio': 53484, 'Ashtabula, Ohio': 97241, 'Athens, Ohio': 65327, 'Auglaize, Ohio': 45656, 'Belmont, Ohio': 67006, 'Butler, Ohio': 383134, 'Carroll, Ohio': 26914, 'Champaign, Ohio': 38885, 'Clark, Ohio': 134083, 'Clermont, Ohio': 206428, 'Clinton, Ohio': 41968, 'Columbiana, Ohio': 101883, 'Coshocton, Ohio': 36600, 'Crawford, Ohio': 41494, 'Cuyahoga, Ohio': 1235072, 'Darke, Ohio': 51113, 'Defiance, Ohio': 38087, 'Delaware, Ohio': 209177, 'Erie, Ohio': 74266, 'Fairfield, Ohio': 157574, 'Fayette, Ohio': 28525, 'Franklin, Ohio': 1316756, 'Fulton, Ohio': 42126, 'Gallia, Ohio': 29898, 'Geauga, Ohio': 93649, 'Greene, Ohio': 168937, 'Hamilton, Ohio': 817473, 'Hancock, Ohio': 75783, 'Highland, Ohio': 43161, 'Huron, Ohio': 58266, 'Jefferson, Ohio': 65325, 'Knox, Ohio': 62322, 'Lake, Ohio': 230149, 'Lawrence, Ohio': 59463, 'Licking, Ohio': 176862, 'Logan, Ohio': 45672, 'Lorain, Ohio': 309833, 'Lucas, Ohio': 428348, 'Madison, Ohio': 44731, 'Mahoning, Ohio': 228683, 'Marion, Ohio': 65093, 'Medina, Ohio': 179746, 'Mercer, Ohio': 41172, 'Miami, Ohio': 106987, 'Montgomery, Ohio': 531687, 'Muskingum, Ohio': 86215, 'Ottawa, Ohio': 40525, 'Pickaway, Ohio': 58457, 'Pike, Ohio': 27772, 'Portage, Ohio': 162466, 'Richland, Ohio': 121154, 'Sandusky, Ohio': 58518, 'Seneca, Ohio': 55178, 'Shelby, Ohio': 48590, 'Stark, Ohio': 370606, 'Summit, Ohio': 541013, 'Trumbull, Ohio': 197974, 'Tuscarawas, Ohio': 91987, 'Union, Ohio': 58988, 'Van Wert, Ohio': 28275, 'Warren, Ohio': 234602, 'Washington, Ohio': 59911, 'Wayne, Ohio': 115710, 'Wood, Ohio': 130817, 'Wyandot, Ohio': 21772, 'Adair, Oklahoma': 22194, 'Bryan, Oklahoma': 47995, 'Caddo, Oklahoma': 28762, 'Canadian, Oklahoma': 148306, 'Carter, Oklahoma': 48111, 'Cherokee, Oklahoma': 48657, 'Choctaw, Oklahoma': 14672, 'Cleveland, Oklahoma': 284014, 'Comanche, Oklahoma': 120749, 'Craig, Oklahoma': 14142, 'Creek, Oklahoma': 71522, 'Custer, Oklahoma': 29003, 'Delaware, Oklahoma': 43009, 'Garvin, Oklahoma': 27711, 'Grady, Oklahoma': 55834, 'Jackson, Oklahoma': 24530, 'Kay, Oklahoma': 43538, 'Latimer, Oklahoma': 10073, 'Le Flore, Oklahoma': 49853, 'Lincoln, Oklahoma': 34877, 'Logan, Oklahoma': 48011, 'McClain, Oklahoma': 40474, 'Mayes, Oklahoma': 41100, 'Muskogee, Oklahoma': 67997, 'Noble, Oklahoma': 11131, 'Nowata, Oklahoma': 10076, 'Oklahoma, Oklahoma': 797434, 'Okmulgee, Oklahoma': 38465, 'Osage, Oklahoma': 46963, 'Ottawa, Oklahoma': 31127, 'Pawnee, Oklahoma': 16376, 'Payne, Oklahoma': 81784, 'Pittsburg, Oklahoma': 43654, 'Pontotoc, Oklahoma': 38284, 'Pottawatomie, Oklahoma': 72592, 'Sequoyah, Oklahoma': 41569, 'Stephens, Oklahoma': 43143, 'Tulsa, Oklahoma': 651552, 'Wagoner, Oklahoma': 81289, 'Washington, Oklahoma': 51527, 'Benton, Oregon': 93053, 'Clackamas, Oregon': 418187, 'Clatsop, Oregon': 40224, 'Columbia, Oregon': 52354, 'Deschutes, Oregon': 197692, 'Douglas, Oregon': 110980, 'Grant, Oregon': 7199, 'Hood River, Oregon': 23382, 'Jackson, Oregon': 220944, 'Josephine, Oregon': 87487, 'Klamath, Oregon': 68238, 'Lane, Oregon': 382067, 'Lincoln, Oregon': 49962, 'Linn, Oregon': 129749, 'Marion, Oregon': 347818, 'Morrow, Oregon': 11603, 'Multnomah, Oregon': 812855, 'Polk, Oregon': 86085, 'Tillamook, Oregon': 27036, 'Umatilla, Oregon': 77950, 'Union, Oregon': 26835, 'Wasco, Oregon': 26682, 'Washington, Oregon': 601592, 'Yamhill, Oregon': 107100, 'Adams, Pennsylvania': 103009, 'Allegheny, Pennsylvania': 1216045, 'Armstrong, Pennsylvania': 64735, 'Beaver, Pennsylvania': 163929, 'Berks, Pennsylvania': 421164, 'Blair, Pennsylvania': 121829, 'Bradford, Pennsylvania': 60323, 'Bucks, Pennsylvania': 628270, 'Butler, Pennsylvania': 187853, 'Cambria, Pennsylvania': 130192, 'Cameron, Pennsylvania': 4447, 'Carbon, Pennsylvania': 64182, 'Centre, Pennsylvania': 162385, 'Chester, Pennsylvania': 524989, 'Clarion, Pennsylvania': 38438, 'Clearfield, Pennsylvania': 79255, 'Columbia, Pennsylvania': 64964, 'Crawford, Pennsylvania': 84629, 'Cumberland, Pennsylvania': 253370, 'Dauphin, Pennsylvania': 278299, 'Delaware, Pennsylvania': 566747, 'Erie, Pennsylvania': 269728, 'Fayette, Pennsylvania': 129274, 'Franklin, Pennsylvania': 155027, 'Greene, Pennsylvania': 36233, 'Huntingdon, Pennsylvania': 45144, 'Indiana, Pennsylvania': 84073, 'Juniata, Pennsylvania': 24763, 'Lackawanna, Pennsylvania': 209674, 'Lancaster, Pennsylvania': 545724, 'Lawrence, Pennsylvania': 85512, 'Lebanon, Pennsylvania': 141793, 'Lehigh, Pennsylvania': 369318, 'Luzerne, Pennsylvania': 317417, 'Lycoming, Pennsylvania': 113299, 'McKean, Pennsylvania': 40625, 'Mercer, Pennsylvania': 109424, 'Monroe, Pennsylvania': 170271, 'Montgomery, Pennsylvania': 830915, 'Montour, Pennsylvania': 18230, 'Northampton, Pennsylvania': 305285, 'Northumberland, Pennsylvania': 90843, 'Perry, Pennsylvania': 46272, 'Philadelphia, Pennsylvania': 1584064, 'Pike, Pennsylvania': 55809, 'Potter, Pennsylvania': 16526, 'Schuylkill, Pennsylvania': 141359, 'Snyder, Pennsylvania': 40372, 'Somerset, Pennsylvania': 73447, 'Susquehanna, Pennsylvania': 40328, 'Tioga, Pennsylvania': 40591, 'Union, Pennsylvania': 44923, 'Warren, Pennsylvania': 39191, 'Washington, Pennsylvania': 206865, 'Wayne, Pennsylvania': 51361, 'Westmoreland, Pennsylvania': 348899, 'York, Pennsylvania': 449058, 'Bristol, Rhode Island': 48479, 'Kent, Rhode Island': 164292, 'Newport, Rhode Island': 82082, 'Providence, Rhode Island': 638931, 'Washington, Rhode Island': 125577, 'Abbeville, South Carolina': 24527, 'Aiken, South Carolina': 170872, 'Anderson, South Carolina': 202558, 'Beaufort, South Carolina': 192122, 'Berkeley, South Carolina': 227907, 'Calhoun, South Carolina': 14553, 'Charleston, South Carolina': 411406, 'Chester, South Carolina': 32244, 'Chesterfield, South Carolina': 45650, 'Clarendon, South Carolina': 33745, 'Colleton, South Carolina': 37677, 'Darlington, South Carolina': 66618, 'Dillon, South Carolina': 30479, 'Dorchester, South Carolina': 162809, 'Edgefield, South Carolina': 27260, 'Fairfield, South Carolina': 22347, 'Florence, South Carolina': 138293, 'Georgetown, South Carolina': 62680, 'Greenville, South Carolina': 523542, 'Greenwood, South Carolina': 70811, 'Horry, South Carolina': 354081, 'Jasper, South Carolina': 30073, 'Kershaw, South Carolina': 66551, 'Lancaster, South Carolina': 98012, 'Laurens, South Carolina': 67493, 'Lee, South Carolina': 16828, 'Lexington, South Carolina': 298750, 'Marion, South Carolina': 30657, 'Marlboro, South Carolina': 26118, 'Newberry, South Carolina': 38440, 'Oconee, South Carolina': 79546, 'Orangeburg, South Carolina': 86175, 'Pickens, South Carolina': 126884, 'Richland, South Carolina': 415759, 'Saluda, South Carolina': 20473, 'Spartanburg, South Carolina': 319785, 'Sumter, South Carolina': 106721, 'Union, South Carolina': 27316, 'Williamsburg, South Carolina': 30368, 'York, South Carolina': 280979, 'Aurora, South Dakota': 2751, 'Beadle, South Dakota': 18453, 'Bon Homme, South Dakota': 6901, 'Brookings, South Dakota': 35077, 'Brown, South Dakota': 38839, 'Charles Mix, South Dakota': 9292, 'Codington, South Dakota': 28009, 'Davison, South Dakota': 19775, 'Deuel, South Dakota': 4351, 'Faulk, South Dakota': 2299, 'Hamlin, South Dakota': 6164, 'Hughes, South Dakota': 17526, 'Hutchinson, South Dakota': 7291, 'Lawrence, South Dakota': 25844, 'Lincoln, South Dakota': 61128, 'Lyman, South Dakota': 3781, 'McCook, South Dakota': 5586, 'Meade, South Dakota': 28332, 'Minnehaha, South Dakota': 193134, 'Pennington, South Dakota': 113775, 'Todd, South Dakota': 10177, 'Union, South Dakota': 15932, 'Yankton, South Dakota': 22814, 'Anderson, Tennessee': 76978, 'Bedford, Tennessee': 49713, 'Benton, Tennessee': 16160, 'Bledsoe, Tennessee': 15064, 'Blount, Tennessee': 133088, 'Bradley, Tennessee': 108110, 'Campbell, Tennessee': 39842, 'Cannon, Tennessee': 14678, 'Carroll, Tennessee': 27767, 'Carter, Tennessee': 56391, 'Cheatham, Tennessee': 40667, 'Chester, Tennessee': 17297, 'Claiborne, Tennessee': 31959, 'Cocke, Tennessee': 36004, 'Cumberland, Tennessee': 60520, 'Davidson, Tennessee': 694144, 'Decatur, Tennessee': 11663, 'DeKalb, Tennessee': 20490, 'Dickson, Tennessee': 53948, 'Dyer, Tennessee': 37159, 'Fayette, Tennessee': 41133, 'Franklin, Tennessee': 42208, 'Gibson, Tennessee': 49133, 'Greene, Tennessee': 69069, 'Grundy, Tennessee': 13427, 'Hamblen, Tennessee': 64934, 'Hamilton, Tennessee': 367804, 'Hardeman, Tennessee': 25050, 'Hardin, Tennessee': 25652, 'Hawkins, Tennessee': 56786, 'Houston, Tennessee': 8201, 'Jefferson, Tennessee': 54495, 'Johnson, Tennessee': 17788, 'Knox, Tennessee': 470313, 'Lewis, Tennessee': 12268, 'Lincoln, Tennessee': 34366, 'Loudon, Tennessee': 54068, 'McMinn, Tennessee': 53794, 'Macon, Tennessee': 24602, 'Madison, Tennessee': 97984, 'Marion, Tennessee': 28907, 'Maury, Tennessee': 96387, 'Meigs, Tennessee': 12422, 'Monroe, Tennessee': 46545, 'Montgomery, Tennessee': 208993, 'Morgan, Tennessee': 21403, 'Overton, Tennessee': 22241, 'Perry, Tennessee': 8076, 'Putnam, Tennessee': 80245, 'Roane, Tennessee': 53382, 'Robertson, Tennessee': 71813, 'Rutherford, Tennessee': 332285, 'Scott, Tennessee': 22068, 'Sevier, Tennessee': 98250, 'Shelby, Tennessee': 937166, 'Smith, Tennessee': 20157, 'Sullivan, Tennessee': 158348, 'Sumner, Tennessee': 191283, 'Tipton, Tennessee': 61599, 'Trousdale, Tennessee': 11284, 'Unicoi, Tennessee': 17883, 'Union, Tennessee': 19972, 'Washington, Tennessee': 129375, 'Weakley, Tennessee': 33328, 'White, Tennessee': 27345, 'Williamson, Tennessee': 238412, 'Wilson, Tennessee': 144657, 'Andrews, Texas': 18705, 'Angelina, Texas': 86715, 'Atascosa, Texas': 51153, 'Austin, Texas': 30032, 'Bastrop, Texas': 88723, 'Bell, Texas': 362924, 'Bexar, Texas': 2003554, 'Blanco, Texas': 11931, 'Bowie, Texas': 93245, 'Brazoria, Texas': 374264, 'Brazos, Texas': 229211, 'Brown, Texas': 37864, 'Burleson, Texas': 18443, 'Burnet, Texas': 48155, 'Caldwell, Texas': 43664, 'Calhoun, Texas': 21290, 'Cameron, Texas': 423163, 'Cass, Texas': 30026, 'Castro, Texas': 7530, 'Chambers, Texas': 43837, 'Cherokee, Texas': 52646, 'Collin, Texas': 1034730, 'Comal, Texas': 156209, 'Cooke, Texas': 41257, 'Coryell, Texas': 75951, 'Crane, Texas': 4797, 'Dallas, Texas': 2635516, 'Deaf Smith, Texas': 18546, 'Denton, Texas': 887207, 'DeWitt, Texas': 20160, 'Eastland, Texas': 18360, 'Ellis, Texas': 184826, 'El Paso, Texas': 839238, 'Erath, Texas': 42698, 'Falls, Texas': 17297, 'Fannin, Texas': 35514, 'Fayette, Texas': 25346, 'Fort Bend, Texas': 811688, 'Gaines, Texas': 21492, 'Galveston, Texas': 342139, 'Grayson, Texas': 136212, 'Gregg, Texas': 123945, 'Grimes, Texas': 28880, 'Guadalupe, Texas': 166847, 'Hale, Texas': 33406, 'Hardin, Texas': 57602, 'Harris, Texas': 4713325, 'Harrison, Texas': 66553, 'Hays, Texas': 230191, 'Hidalgo, Texas': 868707, 'Hockley, Texas': 23021, 'Hood, Texas': 61643, 'Hopkins, Texas': 37084, 'Hunt, Texas': 98594, 'Jackson, Texas': 14760, 'Jefferson, Texas': 251565, 'Johnson, Texas': 175817, 'Karnes, Texas': 15601, 'Kaufman, Texas': 136154, 'Kendall, Texas': 47431, 'Lamar, Texas': 49859, 'Lamb, Texas': 12893, 'Lavaca, Texas': 20154, 'Liberty, Texas': 88219, 'Limestone, Texas': 23437, 'Llano, Texas': 21795, 'Lubbock, Texas': 310569, 'Lynn, Texas': 5951, 'McLennan, Texas': 256623, 'Martin, Texas': 5771, 'Matagorda, Texas': 36643, 'Maverick, Texas': 58722, 'Medina, Texas': 51584, 'Midland, Texas': 176832, 'Milam, Texas': 24823, 'Montague, Texas': 19818, 'Montgomery, Texas': 607391, 'Morris, Texas': 12388, 'Nacogdoches, Texas': 65204, 'Navarro, Texas': 50113, 'Nueces, Texas': 362294, 'Oldham, Texas': 2112, 'Orange, Texas': 83396, 'Parker, Texas': 142878, 'Potter, Texas': 117415, 'Randall, Texas': 137713, 'Robertson, Texas': 17074, 'Rockwall, Texas': 104915, 'Rusk, Texas': 54406, 'San Patricio, Texas': 66730, 'Shelby, Texas': 25274, 'Smith, Texas': 232751, 'Starr, Texas': 64633, 'Tarrant, Texas': 2102515, 'Taylor, Texas': 138034, 'Terry, Texas': 12337, 'Tom Green, Texas': 119200, 'Travis, Texas': 1273954, 'Upshur, Texas': 41753, 'Uvalde, Texas': 26741, 'Val Verde, Texas': 49025, 'Van Zandt, Texas': 56590, 'Victoria, Texas': 92084, 'Walker, Texas': 72971, 'Washington, Texas': 35882, 'Webb, Texas': 276652, 'Wharton, Texas': 41556, 'Wichita, Texas': 132230, 'Willacy, Texas': 21358, 'Williamson, Texas': 590551, 'Wilson, Texas': 51070, 'Yoakum, Texas': 8713, 'Young, Texas': 18010, 'Box Elder, Utah': 56046, 'Cache, Utah': 128289, 'Davis, Utah': 355481, 'Garfield, Utah': 5051, 'Iron, Utah': 54839, 'Morgan, Utah': 12124, 'Salt Lake, Utah': 1160437, 'San Juan, Utah': 15308, 'Summit, Utah': 42145, 'Tooele, Utah': 72259, 'Uintah, Utah': 35734, 'Utah, Utah': 636235, 'Wasatch, Utah': 34091, 'Washington, Utah': 177556, 'Weber, Utah': 260213, 'Addison, Vermont': 36777, 'Bennington, Vermont': 35470, 'Caledonia, Vermont': 29993, 'Chittenden, Vermont': 163774, 'Franklin, Vermont': 49402, 'Lamoille, Vermont': 25362, 'Orange, Vermont': 28892, 'Orleans, Vermont': 27037, 'Rutland, Vermont': 58191, 'Washington, Vermont': 58409, 'Windham, Vermont': 42222, 'Windsor, Vermont': 55062, 'Accomack, Virginia': 32316, 'Albemarle, Virginia': 109330, 'Amelia, Virginia': 13145, 'Amherst, Virginia': 31605, 'Arlington, Virginia': 236842, 'Bedford, Virginia': 78997, 'Botetourt, Virginia': 33419, 'Charles City, Virginia': 6963, 'Chesterfield, Virginia': 352802, 'Culpeper, Virginia': 52605, 'Fairfax, Virginia': 1147532, 'Fauquier, Virginia': 71222, 'Fluvanna, Virginia': 27270, 'Franklin, Virginia': 56042, 'Frederick, Virginia': 89313, 'Gloucester, Virginia': 37348, 'Goochland, Virginia': 23753, 'Greene, Virginia': 19819, 'Halifax, Virginia': 33911, 'Hanover, Virginia': 107766, 'Henrico, Virginia': 330818, 'Isle of Wight, Virginia': 37109, 'James City, Virginia': 76523, 'King George, Virginia': 26836, 'Lancaster, Virginia': 10603, 'Lee, Virginia': 23423, 'Loudoun, Virginia': 413538, 'Louisa, Virginia': 37591, 'Madison, Virginia': 13261, 'Mathews, Virginia': 8834, 'Mecklenburg, Virginia': 30587, 'Montgomery, Virginia': 98535, 'Nelson, Virginia': 14930, 'New Kent, Virginia': 23091, 'Northampton, Virginia': 11710, 'Northumberland, Virginia': 12095, 'Nottoway, Virginia': 15232, 'Orange, Virginia': 37051, 'Pittsylvania, Virginia': 60354, 'Powhatan, Virginia': 29652, 'Prince Edward, Virginia': 22802, 'Prince George, Virginia': 38353, 'Prince William, Virginia': 470335, 'Roanoke, Virginia': 94186, 'Rockbridge, Virginia': 22573, 'Rockingham, Virginia': 81948, 'Shenandoah, Virginia': 43616, 'Southampton, Virginia': 17631, 'Spotsylvania, Virginia': 136215, 'Stafford, Virginia': 152882, 'Warren, Virginia': 40164, 'Washington, Virginia': 53740, 'York, Virginia': 68280, 'Alexandria city, Virginia': 159428, 'Bristol city, Virginia': 16762, 'Charlottesville city, Virginia': 47266, 'Chesapeake city, Virginia': 244835, 'Danville city, Virginia': 40044, 'Fairfax city, Virginia': 24019, 'Fredericksburg city, Virginia': 29036, 'Galax city, Virginia': 6347, 'Hampton city, Virginia': 134510, 'Harrisonburg city, Virginia': 53016, 'Hopewell city, Virginia': 22529, 'Lynchburg city, Virginia': 82168, 'Manassas city, Virginia': 41085, 'Newport News city, Virginia': 179225, 'Norfolk city, Virginia': 242742, 'Poquoson city, Virginia': 12271, 'Portsmouth city, Virginia': 94398, 'Radford city, Virginia': 18249, 'Richmond city, Virginia': 230436, 'Roanoke city, Virginia': 99143, 'Suffolk city, Virginia': 92108, 'Virginia Beach city, Virginia': 449974, 'Williamsburg city, Virginia': 14954, 'Adams, Washington': 19983, 'Benton, Washington': 204390, 'Chelan, Washington': 77200, 'Clallam, Washington': 77331, 'Clark, Washington': 488241, 'Columbia, Washington': 3985, 'Cowlitz, Washington': 110593, 'Douglas, Washington': 43429, 'Ferry, Washington': 7627, 'Franklin, Washington': 95222, 'Grant, Washington': 97733, 'Grays Harbor, Washington': 75061, 'Island, Washington': 85141, 'Jefferson, Washington': 32221, 'King, Washington': 2252782, 'Kitsap, Washington': 271473, 'Kittitas, Washington': 47935, 'Klickitat, Washington': 22425, 'Lewis, Washington': 80707, 'Lincoln, Washington': 10939, 'Mason, Washington': 66768, 'Okanogan, Washington': 42243, 'Pierce, Washington': 904980, 'San Juan, Washington': 17582, 'Skagit, Washington': 129205, 'Skamania, Washington': 12083, 'Snohomish, Washington': 822083, 'Spokane, Washington': 522798, 'Stevens, Washington': 45723, 'Thurston, Washington': 290536, 'Walla Walla, Washington': 60760, 'Whatcom, Washington': 229247, 'Whitman, Washington': 50104, 'Yakima, Washington': 250873, 'Berkeley, West Virginia': 119171, 'Greenbrier, West Virginia': 34662, 'Hancock, West Virginia': 28810, 'Harrison, West Virginia': 67256, 'Jackson, West Virginia': 28576, 'Jefferson, West Virginia': 57146, 'Kanawha, West Virginia': 178124, 'Logan, West Virginia': 32019, 'Marion, West Virginia': 56072, 'Marshall, West Virginia': 30531, 'Mason, West Virginia': 26516, 'Mercer, West Virginia': 58758, 'Monongalia, West Virginia': 105612, 'Ohio, West Virginia': 41411, 'Pleasants, West Virginia': 7460, 'Preston, West Virginia': 33432, 'Putnam, West Virginia': 56450, 'Raleigh, West Virginia': 73361, 'Tucker, West Virginia': 6839, 'Upshur, West Virginia': 24176, 'Wood, West Virginia': 83518, 'Bayfield, Wisconsin': 15036, 'Brown, Wisconsin': 264542, 'Calumet, Wisconsin': 50089, 'Chippewa, Wisconsin': 64658, 'Clark, Wisconsin': 34774, 'Columbia, Wisconsin': 57532, 'Dane, Wisconsin': 546695, 'Dodge, Wisconsin': 87839, 'Douglas, Wisconsin': 43150, 'Dunn, Wisconsin': 45368, 'Eau Claire, Wisconsin': 104646, 'Fond du Lac, Wisconsin': 103403, 'Grant, Wisconsin': 51439, 'Green, Wisconsin': 36960, 'Iowa, Wisconsin': 23678, 'Iron, Wisconsin': 5687, 'Jefferson, Wisconsin': 84769, 'Juneau, Wisconsin': 26687, 'Kenosha, Wisconsin': 169561, 'La Crosse, Wisconsin': 118016, 'Marathon, Wisconsin': 135692, 'Marinette, Wisconsin': 40350, 'Milwaukee, Wisconsin': 945726, 'Monroe, Wisconsin': 46253, 'Oneida, Wisconsin': 35595, 'Outagamie, Wisconsin': 187885, 'Ozaukee, Wisconsin': 89221, 'Pierce, Wisconsin': 42754, 'Portage, Wisconsin': 70772, 'Racine, Wisconsin': 196311, 'Richland, Wisconsin': 17252, 'Rock, Wisconsin': 163354, 'St. Croix, Wisconsin': 90687, 'Sauk, Wisconsin': 64442, 'Sheboygan, Wisconsin': 115340, 'Vilas, Wisconsin': 22195, 'Walworth, Wisconsin': 103868, 'Washington, Wisconsin': 136034, 'Waukesha, Wisconsin': 404198, 'Waupaca, Wisconsin': 50990, 'Winnebago, Wisconsin': 171907, 'Wood, Wisconsin': 72999, 'Albany, Wyoming': 38880, 'Campbell, Wyoming': 46341, 'Carbon, Wyoming': 14800, 'Converse, Wyoming': 13822, 'Fremont, Wyoming': 39261, 'Goshen, Wyoming': 13211, 'Hot Springs, Wyoming': 4413, 'Johnson, Wyoming': 8445, 'Laramie, Wyoming': 99500, 'Natrona, Wyoming': 79858, 'Park, Wyoming': 29194, 'Sheridan, Wyoming': 30485, 'Sublette, Wyoming': 9831, 'Sweetwater, Wyoming': 42343, 'Teton, Wyoming': 23464, 'Washakie, Wyoming': 7805, 'Aberdeen, SD': 38839, 'Aberdeen, WA': 75061, 'Abilene, TX': 138034, 'Ada, OK': 38284, 'Adrian, MI': 98451, 'Akron, OH': 703479, 'Albany, GA': 146726, 'Albany, NY': 880381, 'Albany, OR': 129749, 'Albemarle, NC': 62806, 'Albertville, AL': 96774, 'Albuquerque, NM': 902557, 'Alexander City, AL': 51030, 'Alexandria, LA': 152037, 'Allentown, PA': 844052, 'Alma, MI': 40711, 'Altoona, PA': 121829, 'Altus, OK': 24530, 'Amarillo, TX': 257240, 'Americus, GA': 29524, 'Ames, IA': 123351, 'Amsterdam, NY': 49221, 'Anchorage, AK': 396317, 'Andrews, TX': 18705, 'Ann Arbor, MI': 367601, 'Anniston, AL': 113605, 'Appleton, WI': 237974, 'Arcadia, FL': 38001, 'Ardmore, OK': 48111, 'Arkadelphia, AR': 22320, 'Asheville, NC': 378608, 'Ashland, OH': 53484, 'Ashtabula, OH': 97241, 'Astoria, OR': 40224, 'Athens, GA': 198491, 'Athens, OH': 65327, 'Athens, TN': 53794, 'Atlanta, GA': 6020364, 'Atlantic City, NJ': 263670, 'Atmore, AL': 36633, 'Auburn, AL': 164542, 'Auburn, IN': 43475, 'Auburn, NY': 76576, 'Augusta, GA': 608980, 'Augusta, ME': 122302, 'Austin, MN': 40062, 'Austin, TX': 2227083, 'Bainbridge, GA': 26404, 'Bakersfield, CA': 900202, 'Baltimore, MD': 2800053, 'Bangor, ME': 152148, 'Baraboo, WI': 64442, 'Bardstown, KY': 46233, 'Barnstable Town, MA': 212990, 'Barre, VT': 58409, 'Bartlesville, OK': 51527, 'Batavia, NY': 57280, 'Batesville, AR': 37825, 'Baton Rouge, LA': 844752, 'Battle Creek, MI': 134159, 'Bay City, MI': 103126, 'Bay City, TX': 36643, 'Beaumont, TX': 392563, 'Beaver Dam, WI': 87839, 'Beckley, WV': 73361, 'Bedford, IN': 45370, 'Bellefontaine, OH': 45672, 'Bellingham, WA': 229247, 'Bemidji, MN': 47188, 'Bend, OR': 197692, 'Bennettsville, SC': 26118, 'Bennington, VT': 35470, 'Big Rapids, MI': 43453, 'Billings, MT': 161300, 'Binghamton, NY': 238691, 'Birmingham, AL': 1068041, 'Bismarck, ND': 126990, 'Blackfoot, ID': 46811, 'Blacksburg, VA': 116784, 'Bloomington, IL': 171517, 'Bloomington, IN': 169230, 'Bloomsburg, PA': 83194, 'Bluefield, WV': 58758, 'Bogalusa, LA': 46194, 'Boise City, ID': 729548, 'Bonham, TX': 35514, 'Boone, NC': 56177, 'Boston, MA': 4873019, 'Boulder, CO': 326196, 'Bowling Green, KY': 167090, 'Bozeman, MT': 114434, 'Bradford, PA': 40625, 'Brainerd, MN': 29779, 'Branson, MO': 55928, 'Breckenridge, CO': 31011, 'Bremerton, WA': 271473, 'Brenham, TX': 35882, 'Brevard, NC': 34385, 'Bridgeport, CT': 943332, 'Brookhaven, MS': 34153, 'Brookings, SD': 35077, 'Brownsville, TX': 423163, 'Brownwood, TX': 37864, 'Brunswick, GA': 85292, 'Bucyrus, OH': 41494, 'Buffalo, NY': 1127983, 'Burley, ID': 24030, 'Burlington, IA': 38967, 'Burlington, NC': 169509, 'Burlington, VT': 213176, 'Butte, MT': 34915, 'Cadillac, MI': 48749, 'Calhoun, GA': 57963, 'California, MD': 113510, 'Canton, OH': 397520, 'Cape Coral, FL': 770577, 'Cape Girardeau, MO': 91004, 'Carbondale, IL': 123347, 'Carlsbad, NM': 58460, 'Carroll, IA': 20165, 'Carson City, NV': 55916, 'Casper, WY': 79858, 'Ca\u00f1on City, CO': 47839, 'Cedar City, UT': 54839, 'Cedar Rapids, IA': 252351, 'Cedartown, GA': 42613, 'Celina, OH': 41172, 'Central City, KY': 30622, 'Centralia, WA': 80707, 'Chambersburg, PA': 155027, 'Champaign, IL': 209689, 'Charleston, IL': 10766, 'Charleston, SC': 802122, 'Charleston, WV': 206700, 'Charlotte, NC': 2612437, 'Charlottesville, VA': 218615, 'Chattanooga, TN': 464291, 'Cheyenne, WY': 99500, 'Chicago, IL': 9458539, 'Chico, CA': 219186, 'Cincinnati, OH': 2147263, 'Clarksburg, WV': 67256, 'Clarksdale, MS': 22124, 'Clarksville, TN': 279454, 'Cleveland, MS': 30628, 'Cleveland, OH': 2048449, 'Cleveland, TN': 108110, 'Clewiston, FL': 42022, 'Clinton, IA': 46429, 'Clovis, NM': 48954, "Coeur d'Alene, ID": 165697, 'College Station, TX': 264728, 'Colorado Springs, CO': 745791, 'Columbia, MO': 198172, 'Columbia, SC': 838433, 'Columbus, GA': 299873, 'Columbus, IN': 83779, 'Columbus, MS': 58595, 'Columbus, NE': 33470, 'Columbus, OH': 2022545, 'Concord, NH': 151391, 'Connersville, IN': 23102, 'Cookeville, TN': 102486, 'Cordele, GA': 22372, 'Cornelia, GA': 45328, 'Corning, NY': 95379, 'Corpus Christi, TX': 429024, 'Corsicana, TX': 50113, 'Cortland, NY': 47581, 'Corvallis, OR': 93053, 'Coshocton, OH': 36600, 'Craig, CO': 13283, 'Crawfordsville, IN': 38338, 'Crestview, FL': 284809, 'Crossville, TN': 60520, 'Cullman, AL': 83768, 'Cullowhee, NC': 43938, 'Dallas, TX': 7503152, 'Dalton, GA': 144724, 'Danville, KY': 30060, 'Danville, VA': 100398, 'Daphne, AL': 223234, 'Davenport, IA': 363735, 'Dayton, OH': 807611, 'DeRidder, LA': 37497, 'Decatur, AL': 152603, 'Decatur, IL': 104009, 'Decatur, IN': 35777, 'Defiance, OH': 38087, 'Del Rio, TX': 49025, 'Deltona, FL': 668365, 'Denver, CO': 2960996, 'Des Moines, IA': 672265, 'Detroit, MI': 4319629, 'Dickinson, ND': 31489, 'Dodge City, KS': 33619, 'Dothan, AL': 105882, 'Douglas, GA': 43273, 'Dover, DE': 180786, 'DuBois, PA': 79255, 'Dublin, GA': 47546, 'Dubuque, IA': 97311, 'Duluth, MN': 242220, 'Duncan, OK': 43143, 'Durango, CO': 56221, 'Durant, OK': 47995, 'Durham, NC': 644367, 'Dyersburg, TN': 37159, 'Eagle Pass, TX': 58722, 'East Stroudsburg, PA': 170271, 'Easton, MD': 37181, 'Eau Claire, WI': 169304, 'Edwards, CO': 55127, 'El Campo, TX': 41556, 'El Centro, CA': 181215, 'El Dorado, AR': 38682, 'El Paso, TX': 839238, 'Elizabeth City, NC': 53287, 'Elizabethtown, KY': 125356, 'Elkhart, IN': 206341, 'Elko, NV': 52778, 'Ellensburg, WA': 47935, 'Elmira, NY': 83456, 'Emporia, KS': 33195, 'Erie, PA': 269728, 'Espa\u00f1ola, NM': 38921, 'Eugene, OR': 382067, 'Eureka, CA': 135558, 'Evansville, IN': 315086, 'Fairbanks, AK': 96849, 'Fairmont, MN': 19683, 'Fairmont, WV': 56072, 'Fargo, ND': 246145, 'Faribault, MN': 66972, 'Farmington, MO': 67215, 'Farmington, NM': 123958, 'Fayetteville, AR': 518328, 'Fayetteville, NC': 526719, 'Fernley, NV': 57510, 'Findlay, OH': 75783, 'Fitzgerald, GA': 16700, 'Flagstaff, AZ': 143476, 'Flint, MI': 405813, 'Florence, AL': 147970, 'Florence, SC': 204911, 'Fond du Lac, WI': 103403, 'Fort Collins, CO': 356899, 'Fort Dodge, IA': 35904, 'Fort Leonard Wood, MO': 52607, 'Fort Morgan, CO': 29068, 'Fort Payne, AL': 71513, 'Fort Polk South, LA': 47429, 'Fort Smith, AR': 232653, 'Fort Wayne, IN': 413263, 'Frankfort, IN': 32399, 'Frankfort, KY': 73738, 'Freeport, IL': 44498, 'Fremont, NE': 36565, 'Fremont, OH': 58518, 'Fresno, CA': 999101, 'Gadsden, AL': 102268, 'Gainesville, FL': 310546, 'Gainesville, GA': 204441, 'Gainesville, TX': 41257, 'Gallup, NM': 71367, 'Gardnerville Ranchos, NV': 48905, 'Georgetown, SC': 62680, 'Gettysburg, PA': 103009, 'Gillette, WY': 46341, 'Glens Falls, NY': 125148, 'Glenwood Springs, CO': 77828, 'Gloversville, NY': 53383, 'Goldsboro, NC': 123131, 'Granbury, TX': 61643, 'Grand Island, NE': 61353, 'Grand Junction, CO': 154210, 'Grand Rapids, MI': 1077370, 'Grants Pass, OR': 87487, 'Grants, NM': 26675, 'Great Falls, MT': 81366, 'Greeley, CO': 324492, 'Green Bay, WI': 264542, 'Greeneville, TN': 69069, 'Greensboro, NC': 680841, 'Greensburg, IN': 26559, 'Greenville, MS': 43909, 'Greenville, NC': 180742, 'Greenville, OH': 51113, 'Greenville, SC': 920477, 'Greenwood, MS': 28183, 'Greenwood, SC': 70811, 'Grenada, MS': 20758, 'Gulfport, MS': 399329, 'Hagerstown, MD': 270220, 'Hailey, ID': 23021, 'Hammond, LA': 134758, 'Hanford, CA': 152940, 'Hannibal, MO': 10309, 'Harrisburg, PA': 577941, 'Harrison, AR': 37432, 'Harrisonburg, VA': 134964, 'Hartford, CT': 1204877, 'Hastings, NE': 31363, 'Hattiesburg, MS': 168849, 'Heber, UT': 76236, 'Helena, MT': 81653, 'Henderson, NC': 44535, 'Hereford, TX': 18546, 'Hermiston, OR': 89553, 'Hickory, NC': 332214, 'Hillsdale, MI': 45605, 'Hilo, HI': 201513, 'Hilton Head Island, SC': 222195, 'Hinesville, GA': 80994, 'Hobbs, NM': 71070, 'Holland, MI': 118081, 'Homosassa Springs, FL': 149657, 'Hood River, OR': 23382, 'Hope, AR': 21532, 'Hot Springs, AR': 99386, 'Houma, LA': 208075, 'Houston, TX': 7010895, 'Hudson, NY': 59461, 'Huntingdon, PA': 45144, 'Huntington, IN': 36520, 'Huntington, WV': 115913, 'Huntsville, AL': 471824, 'Huntsville, TX': 72971, 'Huron, SD': 18453, 'Hutchinson, KS': 61998, 'Idaho Falls, ID': 148933, 'Indiana, PA': 84073, 'Indianapolis, IN': 2074537, 'Indianola, MS': 25110, 'Iowa City, IA': 173105, 'Iron Mountain, MI': 25239, 'Ithaca, NY': 102180, 'Jackson, MI': 158510, 'Jackson, MS': 594806, 'Jackson, TN': 164414, 'Jackson, WY': 35606, 'Jacksonville, FL': 1559514, 'Jacksonville, IL': 33658, 'Jacksonville, NC': 197938, 'Jacksonville, TX': 52646, 'Jamestown, NY': 126903, 'Janesville, WI': 163354, 'Jasper, AL': 63521, 'Jasper, IN': 42736, 'Jefferson City, MO': 137620, 'Jefferson, GA': 72977, 'Jennings, LA': 31368, 'Johnson City, TN': 203649, 'Johnstown, PA': 130192, 'Jonesboro, AR': 133860, 'Joplin, MO': 179564, 'Juneau, AK': 31974, 'Kahului, HI': 167417, 'Kalamazoo, MI': 265066, 'Kalispell, MT': 103806, 'Kankakee, IL': 109862, 'Kansas City, MO': 2148970, 'Kapaa, HI': 72293, 'Kearney, NE': 56154, 'Keene, NH': 76085, 'Kendallville, IN': 47744, 'Kennett, MO': 29131, 'Kennewick, WA': 299612, 'Ketchikan, AK': 13901, 'Key West, FL': 74228, 'Killeen, TX': 438875, 'Kingsport, TN': 285636, 'Kingston, NY': 177573, 'Kinston, NC': 55949, 'Kirksville, MO': 25343, 'Klamath Falls, OR': 68238, 'Knoxville, TN': 869046, 'Kokomo, IN': 82544, 'La Crosse, WI': 118016, 'La Grande, OR': 26835, 'LaGrange, GA': 103176, 'Laconia, NH': 61303, 'Lafayette, IN': 224254, 'Lafayette, LA': 489207, 'Lake Charles, LA': 203436, 'Lake City, FL': 71686, 'Lake Havasu City, AZ': 212181, 'Lakeland, FL': 724777, 'Lancaster, PA': 545724, 'Lansing, MI': 550391, 'Laramie, WY': 38880, 'Laredo, TX': 276652, 'Las Cruces, NM': 218195, 'Las Vegas, NM': 27277, 'Las Vegas, NV': 2266715, 'Laurel, MS': 68098, 'Laurinburg, NC': 34823, 'Lawrence, KS': 122259, 'Lawton, OK': 120749, 'Lebanon, NH': 216986, 'Lebanon, PA': 141793, 'Levelland, TX': 23021, 'Lewisburg, PA': 44923, 'Lewiston, ID': 40408, 'Lewiston, ME': 108277, 'Lexington, KY': 517056, 'Lexington, NE': 25585, 'Lima, OH': 102351, 'Lincoln, IL': 28618, 'Lincoln, NE': 319090, 'Little Rock, AR': 731929, 'Logan, UT': 128289, 'London, KY': 60813, 'Longview, TX': 286657, 'Longview, WA': 110593, 'Los Angeles, CA': 13214799, 'Louisville/Jefferson County, KY': 1248982, 'Lubbock, TX': 316520, 'Lufkin, TX': 86715, 'Lumberton, NC': 130625, 'Lynchburg, VA': 192770, 'Macon, GA': 217592, 'Madera, CA': 157327, 'Madison, WI': 664865, 'Madisonville, KY': 44686, 'Magnolia, AR': 23457, 'Malone, NY': 50022, 'Malvern, AR': 33771, 'Manchester, NH': 417025, 'Manhattan, KS': 98615, 'Mankato, MN': 101927, 'Mansfield, OH': 121154, 'Marietta, OH': 59911, 'Marinette, WI': 40350, 'Marion, IN': 65769, 'Marion, NC': 45756, 'Marion, OH': 65093, 'Marquette, MI': 66699, 'Marshall, MN': 25474, 'Marshalltown, IA': 39369, 'Martin, TN': 33328, 'Mason City, IA': 42450, 'Maysville, KY': 17070, 'McAlester, OK': 43654, 'McAllen, TX': 868707, 'McComb, MS': 39288, 'McPherson, KS': 28542, 'Meadville, PA': 84629, 'Medford, OR': 220944, 'Memphis, TN': 1346045, 'Menomonie, WI': 45368, 'Merced, CA': 277680, 'Meridian, MS': 99408, 'Miami, FL': 6166488, 'Miami, OK': 31127, 'Michigan City, IN': 109888, 'Midland, MI': 83156, 'Midland, TX': 182603, 'Milledgeville, GA': 44890, 'Milwaukee, WI': 1575179, 'Minden, LA': 38340, 'Minneapolis, MN': 3573170, 'Minot, ND': 73386, 'Missoula, MT': 119600, 'Mitchell, SD': 19775, 'Moberly, MO': 24748, 'Mobile, AL': 429536, 'Modesto, CA': 550660, 'Monroe, LA': 200261, 'Monroe, MI': 150500, 'Montgomery, AL': 373290, 'Montrose, CO': 42758, 'Morehead City, NC': 69473, 'Morgan City, LA': 49348, 'Morgantown, WV': 139044, 'Morristown, TN': 119429, 'Moses Lake, WA': 97733, 'Moultrie, GA': 45600, 'Mount Airy, NC': 71783, 'Mount Gay, WV': 32019, 'Mount Pleasant, MI': 69872, 'Mount Sterling, KY': 34646, 'Mount Vernon, OH': 62322, 'Mount Vernon, WA': 129205, 'Mountain Home, AR': 41932, 'Muncie, IN': 114135, 'Murray, KY': 39001, 'Muscatine, IA': 42664, 'Muskegon, MI': 173566, 'Muskogee, OK': 67997, 'Myrtle Beach, SC': 496901, 'Nacogdoches, TX': 65204, 'Napa, CA': 137744, 'Naples, FL': 384902, 'Nashville, TN': 1934317, 'Natchez, MS': 30693, 'Natchitoches, LA': 38158, 'New Bern, NC': 102139, 'New Castle, IN': 47972, 'New Castle, PA': 85512, 'New Haven, CT': 854757, 'New Orleans, LA': 1270530, 'New Philadelphia, OH': 91987, 'New York, NY': 10879365, 'Newberry, SC': 38440, 'Newport, OR': 49962, 'Newport, TN': 36004, 'Niles, MI': 153401, 'Nogales, AZ': 46498, 'Norfolk, NE': 35099, 'North Platte, NE': 34914, 'North Port, FL': 836995, 'North Vernon, IN': 27735, 'Norwalk, OH': 58266, 'Norwich, CT': 265206, 'Oak Harbor, WA': 85141, 'Ocala, FL': 365579, 'Ocean City, NJ': 92039, 'Ogden, UT': 683864, 'Ogdensburg, NY': 107740, 'Oklahoma City, OK': 1408950, 'Olean, NY': 76117, 'Olympia, WA': 290536, 'Omaha, NE': 934333, 'Oneonta, NY': 59493, 'Ontario, OR': 23951, 'Opelousas, LA': 82124, 'Orangeburg, SC': 86175, 'Orlando, FL': 2608147, 'Oshkosh, WI': 171907, 'Oskaloosa, IA': 22095, 'Othello, WA': 19983, 'Ottawa, IL': 141297, 'Ottawa, KS': 25544, 'Ottumwa, IA': 34969, 'Owatonna, MN': 36649, 'Owensboro, KY': 101511, 'Oxford, MS': 54019, 'Oxnard, CA': 846006, 'Paducah, KY': 65418, 'Pahrump, NV': 46523, 'Palatka, FL': 74521, 'Palm Bay, FL': 601942, 'Panama City, FL': 174705, 'Paragould, AR': 45325, 'Paris, TX': 49859, 'Parkersburg, WV': 83518, 'Payson, AZ': 54018, 'Pensacola, FL': 502629, 'Peoria, IL': 360879, 'Peru, IN': 35516, 'Philadelphia, PA': 6102434, 'Phoenix, AZ': 4948203, 'Picayune, MS': 55535, 'Pierre, SD': 17526, 'Pine Bluff, AR': 87804, 'Pinehurst, NC': 100880, 'Pittsburg, KS': 38818, 'Pittsburgh, PA': 2317600, 'Pittsfield, MA': 124944, 'Plainview, TX': 33406, 'Platteville, WI': 51439, 'Plattsburgh, NY': 80485, 'Plymouth, IN': 46258, 'Pocatello, ID': 87808, 'Point Pleasant, WV': 56414, 'Ponca City, OK': 43538, 'Pontiac, IL': 35648, 'Poplar Bluff, MO': 13288, 'Port Angeles, WA': 77331, 'Port Lavaca, TX': 21290, 'Port St. Lucie, FL': 489297, 'Portales, NM': 18500, 'Portland, ME': 538500, 'Portland, OR': 2492412, 'Pottsville, PA': 141359, 'Poughkeepsie, NY': 679158, 'Prescott Valley, AZ': 235099, 'Providence, RI': 1624578, 'Provo, UT': 636235, 'Pueblo, CO': 168424, 'Pullman, WA': 50104, 'Punta Gorda, FL': 188910, 'Quincy, IL': 65435, 'Racine, WI': 196311, 'Raleigh, NC': 1390785, 'Rapid City, SD': 142107, 'Raymondville, TX': 21358, 'Reading, PA': 421164, 'Red Wing, MN': 46340, 'Redding, CA': 180080, 'Reno, NV': 471519, 'Rexburg, ID': 53006, 'Richmond, IN': 65884, 'Richmond, KY': 92987, 'Richmond, VA': 1179308, 'Rio Grande City, TX': 64633, 'Riverside, CA': 4650631, 'Riverton, WY': 39261, 'Roanoke Rapids, NC': 19483, 'Roanoke, VA': 282790, 'Rochester, MN': 221921, 'Rochester, NY': 1044731, 'Rock Springs, WY': 42343, 'Rockford, IL': 282572, 'Rockingham, NC': 44829, 'Rocky Mount, NC': 145770, 'Rome, GA': 98498, 'Roseburg, OR': 110980, 'Roswell, NM': 64615, 'Russellville, AR': 64072, 'Ruston, LA': 46742, 'Rutland, VT': 58191, 'Sacramento, CA': 2363730, 'Safford, AZ': 38837, 'Saginaw, MI': 190539, 'Salem, OH': 101883, 'Salem, OR': 433903, 'Salina, KS': 5704, 'Salinas, CA': 434061, 'Salisbury, MD': 415726, 'Salt Lake City, UT': 1232696, 'San Angelo, TX': 119200, 'San Antonio, TX': 2527848, 'San Diego, CA': 3338330, 'San Francisco, CA': 4731803, 'San Jose, CA': 1990660, 'San Luis Obispo, CA': 283111, 'Sandusky, OH': 74266, 'Sanford, NC': 61779, 'Santa Cruz, CA': 273213, 'Santa Fe, NM': 150358, 'Santa Maria, CA': 446499, 'Santa Rosa, CA': 494336, 'Sault Ste. Marie, MI': 37349, 'Savannah, GA': 393353, 'Sayre, PA': 60323, 'Scottsboro, AL': 51626, 'Scottsburg, IN': 23873, 'Scranton, PA': 527091, 'Searcy, AR': 78753, 'Seattle, WA': 3979845, 'Sebastian, FL': 159923, 'Sebring, FL': 106221, 'Sedalia, MO': 42339, 'Selinsgrove, PA': 40372, 'Selma, AL': 37196, 'Seneca, SC': 79546, 'Sevierville, TN': 98250, 'Seymour, IN': 44231, 'Shawnee, OK': 72592, 'Sheboygan, WI': 115340, 'Shelby, NC': 97947, 'Shelbyville, TN': 49713, 'Shelton, WA': 66768, 'Sheridan, WY': 30485, 'Sherman, TX': 136212, 'Show Low, AZ': 110924, 'Shreveport, LA': 394706, 'Sidney, OH': 48590, 'Sierra Vista, AZ': 125922, 'Sikeston, MO': 38280, 'Sioux City, IA': 119039, 'Sioux Falls, SD': 259848, 'Somerset, KY': 64979, 'Somerset, PA': 73447, 'South Bend, IN': 323613, 'Spartanburg, SC': 319785, 'Spearfish, SD': 25844, 'Spirit Lake, IA': 17258, 'Spokane, WA': 568521, 'Springfield, IL': 194672, 'Springfield, MA': 697382, 'Springfield, MO': 381681, 'Springfield, OH': 134083, 'St. Cloud, MN': 201964, 'St. George, UT': 177556, 'St. Joseph, MO': 94964, 'St. Louis, MO': 2715364, 'St. Marys, GA': 54666, 'Starkville, MS': 59276, 'State College, PA': 162385, 'Statesboro, GA': 79608, 'Steamboat Springs, CO': 25638, 'Stephenville, TX': 42698, 'Sterling, CO': 22409, 'Sterling, IL': 55175, 'Stevens Point, WI': 70772, 'Stillwater, OK': 81784, 'Stockton, CA': 762148, 'Sulphur Springs, TX': 37084, 'Summerville, GA': 24789, 'Sumter, SC': 140466, 'Sunbury, PA': 90843, 'Syracuse, NY': 648593, 'Tahlequah, OK': 48657, 'Talladega, AL': 79978, 'Tallahassee, FL': 339242, 'Tampa, FL': 3194831, 'Taos, NM': 32723, 'Taylorville, IL': 32304, 'Terre Haute, IN': 143205, 'Texarkana, TX': 93245, 'The Dalles, OR': 26682, 'The Villages, FL': 132420, 'Thomaston, GA': 26320, 'Thomasville, GA': 44451, 'Tiffin, OH': 55178, 'Tifton, GA': 40644, 'Toccoa, GA': 25925, 'Toledo, OH': 641816, 'Topeka, KS': 225038, 'Torrington, CT': 180333, 'Traverse City, MI': 132887, 'Trenton, NJ': 367430, 'Troy, AL': 33114, 'Truckee, CA': 99755, 'Tucson, AZ': 1047279, 'Tullahoma, TN': 42208, 'Tulsa, OK': 906167, 'Tupelo, MS': 166126, 'Tuscaloosa, AL': 237396, 'Twin Falls, ID': 86878, 'Tyler, TX': 232751, 'Ukiah, CA': 86749, 'Union, SC': 27316, 'Urban Honolulu, HI': 974563, 'Urbana, OH': 38885, 'Utica, NY': 289990, 'Uvalde, TX': 26741, 'Valdosta, GA': 117406, 'Vallejo, CA': 447643, 'Van Wert, OH': 28275, 'Vernal, UT': 35734, 'Victoria, TX': 92084, 'Vidalia, GA': 26830, 'Vineland, NJ': 149527, 'Vineyard Haven, MA': 17332, 'Virginia Beach, VA': 1710742, 'Visalia, CA': 466195, 'Wabash, IN': 30996, 'Waco, TX': 273920, 'Wahpeton, ND': 6207, 'Walla Walla, WA': 60760, 'Wapakoneta, OH': 45656, 'Warner Robins, GA': 185409, 'Warren, PA': 39191, 'Warrensburg, MO': 54062, 'Warsaw, IN': 79456, 'Washington Court House, OH': 28525, 'Washington, DC': 6226403, 'Washington, NC': 46994, 'Waterloo, IA': 131228, 'Watertown, NY': 109834, 'Watertown, SD': 34173, 'Watertown, WI': 84769, 'Wausau, WI': 135692, 'Waycross, GA': 55199, 'Weatherford, OK': 29003, 'Weirton, WV': 94135, 'Wenatchee, WA': 120629, 'West Point, MS': 19316, 'Wheeling, WV': 138948, 'Whitewater, WI': 103868, 'Wichita Falls, TX': 132230, 'Wichita, KS': 640218, 'Williamsport, PA': 113299, 'Willmar, MN': 43199, 'Wilmington, NC': 234473, 'Wilmington, OH': 41968, 'Wilson, NC': 81801, 'Winchester, VA': 89313, 'Winnemucca, NV': 16831, 'Winona, MN': 50484, 'Winston, NC': 592750, 'Wisconsin Rapids, WI': 72999, 'Wooster, OH': 115710, 'Worcester, MA': 947404, 'Yakima, WA': 250873, 'Yankton, SD': 22814, 'York, PA': 449058, 'Youngstown, OH': 536081, 'Yuba City, CA': 175639, 'Yuma, AZ': 213787, 'Zanesville, OH': 86215 },
  beds: { Afghanistan: 18586, Albania: 8312, Algeria: 80234, Andorra: 193, Angola: 24648, 'Antigua and Barbuda': 366, Argentina: 222473, Armenia: 12397, Australia: 94971, Austria: 67237, Azerbaijan: 46729, Bahamas: 1118, Bahrain: 3139, Bangladesh: 129085, Barbados: 1663, Belarus: 104339, Belgium: 70817, Belize: 498, Benin: 5743, Bhutan: 1282, Bolivia: 12488, 'Bosnia and Herzegovina': 11634, Brazil: 460833, Brunei: 1158, Bulgaria: 47765, 'Burkina Faso': 7901, 'Cabo Verde': 1142, Cambodia: 13000, Cameroon: 32781, Canada: 100059, 'Central African Republic': 4666, Chad: 6191, Chile: 41204, China: 5849466, Colombia: 74473, 'Congo (Kinshasa)': 67254, 'Congo (Brazzaville)': 8391, 'Costa Rica': 5999, "Cote d'Ivoire": 10028, Croatia: 22901, Cuba: 58958, Cyprus: 4044, Czechia: 69067, Denmark: 14494, Djibouti: 1342, Dominica: 272, 'Dominican Republic': 17003, Ecuador: 25627, Egypt: 157478, 'El Salvador': 8347, 'Equatorial Guinea': 2749, Eritrea: 2250, Estonia: 6604, Eswatini: 2386, Ethiopia: 32767, Fiji: 2032, Finland: 24279, France: 435417, Gabon: 13351, Gambia: 2508, 'Georgia (country)': 9701, Germany: 688302, Ghana: 26790, Greece: 46129, Grenada: 412, Guatemala: 10349, Guinea: 3724, 'Guinea-Bissau': 1874, Guyana: 1246, Haiti: 7786, Honduras: 6711, 'Hong Kong': 36442, Hungary: 68381, Iceland: 1131, India: 946832, Indonesia: 321196, Iran: 122700, Iraq: 53807, Ireland: 13590, Israel: 27540, Italy: 205466, Jamaica: 4989, Japan: 1695490, Jordan: 13938, Kazakhstan: 122453, Kenya: 71950, 'Korea, South': 593805, Kuwait: 8275, Kyrgyzstan: 28421, Laos: 10592, Latvia: 11174, Lebanon: 19862, Liberia: 3855, Libya: 24711, Lithuania: 20364, Luxembourg: 2917, Madagascar: 5252, Malaysia: 59904, Maldives: 2217, Mali: 1908, Malta: 2273, Mauritania: 1761, Mauritius: 4302, Mexico: 189286, Moldova: 20566, Monaco: 534, Mongolia: 22191, Montenegro: 2489, Morocco: 39632, Mozambique: 20647, Burma: 48338, Namibia: 6610, Nepal: 8426, Netherlands: 80986, 'New Zealand': 13679, Nicaragua: 5819, Niger: 6733, Nigeria: 97937, 'North Macedonia': 9165, Norway: 20726, Oman: 7727, Pakistan: 127329, Panama: 9607, 'Papua New Guinea': 34634, Paraguay: 9043, Peru: 51183, Philippines: 106652, Poland: 246861, Portugal: 34958, Qatar: 3338, Romania: 122686, Russia: 1184720, Rwanda: 19683, 'San Marino': 128, 'Saudi Arabia': 90990, Senegal: 4756, Serbia: 39798, Seychelles: 348, Singapore: 13533, Slovakia: 31593, Slovenia: 9510, Somalia: 13507, 'South Africa': 161783, Spain: 140171, 'Sri Lanka': 78012, 'Saint Kitts and Nevis': 121, 'Saint Lucia': 236, 'Saint Vincent and the Grenadines': 287, Sudan: 33441, Suriname: 1786, Sweden: 26476, Switzerland: 40028, Syria: 25359, Tanzania: 39423, Thailand: 145800, 'Timor-Leste': 7481, Togo: 5522, 'Trinidad and Tobago': 4170, Tunisia: 26600, Turkey: 222263, Uganda: 21362, Ukraine: 392678, 'United Arab Emirates': 11557, 'United Kingdom': 186169, US: 948786, Uruguay: 9658, Uzbekistan: 131822, Venezuela: 23096, Vietnam: 248405, 'West Bank and Gaza': 5483, Zambia: 34704, Zimbabwe: 24546, Alabama: 15199, Alaska: 1609, Arizona: 13829, Arkansas: 9656, California: 71122, Colorado: 10941, Connecticut: 7130, Delaware: 2142, 'District of Columbia': 3105, Florida: 55842, Georgia: 25481, Hawaii: 2690, Idaho: 3395, Illinois: 31679, Indiana: 18176, Iowa: 9465, Kansas: 9613, Kentucky: 14296, Louisiana: 15341, Maine: 3360, Maryland: 11486, Massachusetts: 15852, Michigan: 24967, Minnesota: 14099, Mississippi: 11904, Missouri: 19026, Montana: 3526, Nebraska: 6963, Nevada: 6468, 'New Hampshire': 2855, 'New Jersey': 21317, 'New Mexico': 3774, 'New York': 52524, 'North Carolina': 22024, 'North Dakota': 3276, Ohio: 32729, Oklahoma: 11079, Oregon: 6748, Pennsylvania: 37125, 'Rhode Island': 2224, 'South Carolina': 12356, 'South Dakota': 4246, Tennessee: 19804, Texas: 66690, Utah: 5770, Vermont: 1310, Virginia: 17924, Washington: 12945, 'West Virginia': 6810, Wisconsin: 12227, Wyoming: 2025, 'Autauga, Alabama': 173, 'Baldwin, Alabama': 692, 'Blount, Alabama': 179, 'Bullock, Alabama': 31, 'Butler, Alabama': 60, 'Calhoun, Alabama': 352, 'Chambers, Alabama': 103, 'Cherokee, Alabama': 81, 'Chilton, Alabama': 137, 'Choctaw, Alabama': 39, 'Clay, Alabama': 41, 'Cleburne, Alabama': 46, 'Colbert, Alabama': 171, 'Coosa, Alabama': 33, 'Covington, Alabama': 114, 'Crenshaw, Alabama': 42, 'Cullman, Alabama': 259, 'Dallas, Alabama': 115, 'DeKalb, Alabama': 221, 'Elmore, Alabama': 251, 'Escambia, Alabama': 113, 'Etowah, Alabama': 317, 'Franklin, Alabama': 97, 'Greene, Alabama': 25, 'Houston, Alabama': 328, 'Jackson, Alabama': 160, 'Jefferson, Alabama': 2041, 'Lamar, Alabama': 42, 'Lauderdale, Alabama': 287, 'Lawrence, Alabama': 102, 'Lee, Alabama': 510, 'Limestone, Alabama': 306, 'Lowndes, Alabama': 30, 'Madison, Alabama': 1156, 'Marengo, Alabama': 58, 'Marion, Alabama': 92, 'Marshall, Alabama': 299, 'Mobile, Alabama': 1280, 'Monroe, Alabama': 64, 'Montgomery, Alabama': 702, 'Morgan, Alabama': 371, 'Pickens, Alabama': 61, 'Pike, Alabama': 102, 'Randolph, Alabama': 70, 'Russell, Alabama': 179, 'St. Clair, Alabama': 277, 'Shelby, Alabama': 674, 'Talladega, Alabama': 247, 'Tallapoosa, Alabama': 125, 'Tuscaloosa, Alabama': 649, 'Walker, Alabama': 196, 'Washington, Alabama': 50, 'Wilcox, Alabama': 32, 'Winston, Alabama': 73, 'Anchorage, Alaska': 633, 'Fairbanks North Star Borough, Alaska': 213, 'Juneau City and Borough, Alaska': 70, 'Kenai Peninsula Borough, Alaska': 129, 'Ketchikan Gateway Borough, Alaska': 30, 'Matanuska-Susitna Borough, Alaska': 238, 'Apache, Arizona': 136, 'Cochise, Arizona': 239, 'Coconino, Arizona': 272, 'Gila, Arizona': 102, 'Graham, Arizona': 73, 'La Paz, Arizona': 40, 'Maricopa, Arizona': 8522, 'Mohave, Arizona': 403, 'Navajo, Arizona': 210, 'Pima, Arizona': 1989, 'Pinal, Arizona': 879, 'Santa Cruz, Arizona': 88, 'Yavapai, Arizona': 446, 'Yuma, Arizona': 406, 'Baxter, Arkansas': 134, 'Benton, Arkansas': 893, 'Boone, Arkansas': 119, 'Bradley, Arkansas': 34, 'Chicot, Arkansas': 32, 'Clark, Arkansas': 71, 'Cleburne, Arkansas': 79, 'Cleveland, Arkansas': 25, 'Columbia, Arkansas': 75, 'Conway, Arkansas': 66, 'Craighead, Arkansas': 353, 'Crawford, Arkansas': 202, 'Crittenden, Arkansas': 153, 'Cross, Arkansas': 52, 'Desha, Arkansas': 36, 'Drew, Arkansas': 58, 'Faulkner, Arkansas': 403, 'Garland, Arkansas': 318, 'Grant, Arkansas': 58, 'Greene, Arkansas': 145, 'Hempstead, Arkansas': 68, 'Hot Spring, Arkansas': 108, 'Howard, Arkansas': 42, 'Independence, Arkansas': 121, 'Jefferson, Arkansas': 213, 'Johnson, Arkansas': 85, 'Lawrence, Arkansas': 52, 'Lincoln, Arkansas': 41, 'Lonoke, Arkansas': 234, 'Pike, Arkansas': 34, 'Poinsett, Arkansas': 75, 'Polk, Arkansas': 63, 'Pope, Arkansas': 205, 'Pulaski, Arkansas': 1254, 'Randolph, Arkansas': 57, 'Saline, Arkansas': 391, 'Searcy, Arkansas': 25, 'Sebastian, Arkansas': 409, 'Sevier, Arkansas': 54, 'Stone, Arkansas': 40, 'Union, Arkansas': 123, 'Van Buren, Arkansas': 52, 'Washington, Arkansas': 765, 'White, Arkansas': 252, 'Woodruff, Arkansas': 20, 'Alameda, California': 3008, 'Amador, California': 71, 'Butte, California': 394, 'Calaveras, California': 82, 'Colusa, California': 38, 'Contra Costa, California': 2076, 'El Dorado, California': 347, 'Fresno, California': 1798, 'Glenn, California': 51, 'Humboldt, California': 244, 'Imperial, California': 326, 'Inyo, California': 32, 'Kern, California': 1620, 'Kings, California': 275, 'Los Angeles, California': 18070, 'Madera, California': 283, 'Marin, California': 465, 'Mendocino, California': 156, 'Merced, California': 499, 'Mono, California': 25, 'Monterey, California': 781, 'Napa, California': 247, 'Nevada, California': 179, 'Orange, California': 5716, 'Placer, California': 716, 'Riverside, California': 4446, 'Sacramento, California': 2793, 'San Benito, California': 113, 'San Bernardino, California': 3924, 'San Diego, California': 6008, 'San Francisco, California': 1586, 'San Joaquin, California': 1371, 'San Luis Obispo, California': 509, 'San Mateo, California': 1379, 'Santa Barbara, California': 803, 'Santa Clara, California': 3470, 'Santa Cruz, California': 491, 'Shasta, California': 324, 'Siskiyou, California': 78, 'Solano, California': 805, 'Sonoma, California': 889, 'Stanislaus, California': 991, 'Sutter, California': 174, 'Tulare, California': 839, 'Ventura, California': 1522, 'Yolo, California': 396, 'Yuba, California': 141, 'Adams, Colorado': 983, 'Alamosa, Colorado': 30, 'Arapahoe, Colorado': 1247, 'Baca, Colorado': 6, 'Boulder, Colorado': 619, 'Broomfield, Colorado': 133, 'Chaffee, Colorado': 38, 'Clear Creek, Colorado': 18, 'Costilla, Colorado': 7, 'Crowley, Colorado': 11, 'Delta, Colorado': 59, 'Denver, Colorado': 1381, 'Douglas, Colorado': 667, 'Eagle, Colorado': 104, 'Elbert, Colorado': 50, 'El Paso, Colorado': 1368, 'Fremont, Colorado': 90, 'Garfield, Colorado': 114, 'Grand, Colorado': 29, 'Gunnison, Colorado': 33, 'Hinsdale, Colorado': 1, 'Huerfano, Colorado': 13, 'Jefferson, Colorado': 1107, 'Kit Carson, Colorado': 13, 'La Plata, Colorado': 106, 'Larimer, Colorado': 678, 'Lincoln, Colorado': 10, 'Logan, Colorado': 42, 'Mesa, Colorado': 292, 'Moffat, Colorado': 25, 'Montrose, Colorado': 81, 'Morgan, Colorado': 55, 'Otero, Colorado': 34, 'Park, Colorado': 35, 'Pitkin, Colorado': 33, 'Pueblo, Colorado': 320, 'Rio Grande, Colorado': 21, 'Routt, Colorado': 48, 'San Miguel, Colorado': 15, 'Summit, Colorado': 58, 'Teller, Colorado': 48, 'Washington, Colorado': 9, 'Weld, Colorado': 616, 'Yuma, Colorado': 19, 'Fairfield, Connecticut': 1886, 'Hartford, Connecticut': 1783, 'Litchfield, Connecticut': 360, 'Middlesex, Connecticut': 324, 'New Haven, Connecticut': 1709, 'New London, Connecticut': 530, 'Tolland, Connecticut': 301, 'Windham, Connecticut': 233, 'Kent, Delaware': 397, 'New Castle, Delaware': 1229, 'Sussex, Delaware': 515, 'District of Columbia, District of Columbia': 3105, 'Alachua, Florida': 699, 'Baker, Florida': 75, 'Bay, Florida': 454, 'Bradford, Florida': 73, 'Brevard, Florida': 1565, 'Broward, Florida': 5077, 'Charlotte, Florida': 491, 'Citrus, Florida': 389, 'Clay, Florida': 570, 'Collier, Florida': 1000, 'Columbia, Florida': 186, 'DeSoto, Florida': 98, 'Duval, Florida': 2490, 'Escambia, Florida': 827, 'Flagler, Florida': 299, 'Gadsden, Florida': 118, 'Hendry, Florida': 109, 'Hernando, Florida': 504, 'Highlands, Florida': 276, 'Hillsborough, Florida': 3827, 'Indian River, Florida': 415, 'Jackson, Florida': 120, 'Lake, Florida': 954, 'Lee, Florida': 2003, 'Leon, Florida': 763, 'Levy, Florida': 107, 'Manatee, Florida': 1048, 'Marion, Florida': 950, 'Martin, Florida': 418, 'Miami-Dade, Florida': 7064, 'Monroe, Florida': 192, 'Nassau, Florida': 230, 'Okaloosa, Florida': 547, 'Orange, Florida': 3622, 'Osceola, Florida': 976, 'Palm Beach, Florida': 3891, 'Pasco, Florida': 1440, 'Pinellas, Florida': 2534, 'Polk, Florida': 1884, 'Putnam, Florida': 193, 'St. Johns, Florida': 688, 'St. Lucie, Florida': 853, 'Santa Rosa, Florida': 479, 'Sarasota, Florida': 1127, 'Seminole, Florida': 1226, 'Sumter, Florida': 344, 'Suwannee, Florida': 115, 'Volusia, Florida': 1438, 'Walton, Florida': 192, 'Washington, Florida': 66, 'Baker, Georgia': 7, 'Baldwin, Georgia': 107, 'Barrow, Georgia': 199, 'Bartow, Georgia': 258, 'Ben Hill, Georgia': 40, 'Bibb, Georgia': 367, 'Bryan, Georgia': 95, 'Bulloch, Georgia': 191, 'Burke, Georgia': 53, 'Butts, Georgia': 59, 'Calhoun, Georgia': 14, 'Camden, Georgia': 131, 'Carroll, Georgia': 287, 'Catoosa, Georgia': 162, 'Charlton, Georgia': 32, 'Chatham, Georgia': 694, 'Chattahoochee, Georgia': 26, 'Chattooga, Georgia': 59, 'Cherokee, Georgia': 621, 'Clarke, Georgia': 307, 'Clayton, Georgia': 701, 'Clinch, Georgia': 15, 'Cobb, Georgia': 1824, 'Coffee, Georgia': 103, 'Colquitt, Georgia': 109, 'Columbia, Georgia': 376, 'Coweta, Georgia': 356, 'Crisp, Georgia': 53, 'Dawson, Georgia': 62, 'Decatur, Georgia': 63, 'DeKalb, Georgia': 1822, 'Dodge, Georgia': 49, 'Dougherty, Georgia': 211, 'Douglas, Georgia': 351, 'Early, Georgia': 24, 'Effingham, Georgia': 154, 'Fannin, Georgia': 62, 'Fayette, Georgia': 274, 'Floyd, Georgia': 236, 'Forsyth, Georgia': 586, 'Franklin, Georgia': 56, 'Fulton, Georgia': 2553, 'Glynn, Georgia': 204, 'Gordon, Georgia': 139, 'Greene, Georgia': 43, 'Gwinnett, Georgia': 2247, 'Habersham, Georgia': 108, 'Hall, Georgia': 490, 'Haralson, Georgia': 71, 'Harris, Georgia': 84, 'Hart, Georgia': 62, 'Heard, Georgia': 28, 'Henry, Georgia': 562, 'Houston, Georgia': 378, 'Irwin, Georgia': 22, 'Jackson, Georgia': 175, 'Jasper, Georgia': 34, 'Jenkins, Georgia': 20, 'Jones, Georgia': 68, 'Lamar, Georgia': 45, 'Laurens, Georgia': 114, 'Lee, Georgia': 71, 'Liberty, Georgia': 147, 'Lincoln, Georgia': 19, 'Long, Georgia': 46, 'Lowndes, Georgia': 281, 'Lumpkin, Georgia': 80, 'McDuffie, Georgia': 51, 'Macon, Georgia': 31, 'Madison, Georgia': 71, 'Meriwether, Georgia': 50, 'Miller, Georgia': 13, 'Mitchell, Georgia': 52, 'Monroe, Georgia': 66, 'Morgan, Georgia': 46, 'Murray, Georgia': 96, 'Muscogee, Georgia': 469, 'Newton, Georgia': 268, 'Oconee, Georgia': 96, 'Paulding, Georgia': 404, 'Peach, Georgia': 66, 'Pickens, Georgia': 78, 'Pierce, Georgia': 46, 'Pike, Georgia': 45, 'Polk, Georgia': 102, 'Pulaski, Georgia': 26, 'Randolph, Georgia': 16, 'Richmond, Georgia': 486, 'Rockdale, Georgia': 218, 'Seminole, Georgia': 19, 'Spalding, Georgia': 160, 'Stephens, Georgia': 62, 'Sumter, Georgia': 70, 'Tattnall, Georgia': 60, 'Taylor, Georgia': 19, 'Telfair, Georgia': 38, 'Terrell, Georgia': 20, 'Thomas, Georgia': 106, 'Tift, Georgia': 97, 'Toombs, Georgia': 64, 'Troup, Georgia': 167, 'Turner, Georgia': 19, 'Twiggs, Georgia': 19, 'Upson, Georgia': 63, 'Walton, Georgia': 227, 'Ware, Georgia': 85, 'Washington, Georgia': 48, 'Wheeler, Georgia': 18, 'White, Georgia': 73, 'Whitfield, Georgia': 251, 'Wilkes, Georgia': 23, 'Worth, Georgia': 48, 'Hawaii, Hawaii': 382, 'Honolulu, Hawaii': 1851, 'Kauai, Hawaii': 137, 'Maui, Hawaii': 318, 'Ada, Idaho': 915, 'Bannock, Idaho': 166, 'Bingham, Idaho': 88, 'Blaine, Idaho': 43, 'Bonneville, Idaho': 226, 'Canyon, Idaho': 436, 'Cassia, Idaho': 45, 'Custer, Idaho': 8, 'Fremont, Idaho': 24, 'Gem, Idaho': 34, 'Idaho, Idaho': 31, 'Jefferson, Idaho': 56, 'Kootenai, Idaho': 314, 'Lincoln, Idaho': 10, 'Madison, Idaho': 75, 'Nez Perce, Idaho': 76, 'Payette, Idaho': 45, 'Teton, Idaho': 23, 'Twin Falls, Idaho': 165, 'Valley, Idaho': 21, 'Adams, Illinois': 163, 'Bureau, Illinois': 81, 'Carroll, Illinois': 35, 'Champaign, Illinois': 524, 'Christian, Illinois': 80, 'Clinton, Illinois': 93, 'Cook, Illinois': 12875, 'Cumberland, Illinois': 26, 'DeKalb, Illinois': 262, 'Douglas, Illinois': 48, 'DuPage, Illinois': 2307, 'Fayette, Illinois': 53, 'Franklin, Illinois': 96, 'Grundy, Illinois': 127, 'Henry, Illinois': 122, 'Iroquois, Illinois': 67, 'Jackson, Illinois': 141, 'Jo Daviess, Illinois': 53, 'Kane, Illinois': 1331, 'Kankakee, Illinois': 274, 'Kendall, Illinois': 322, 'Lake, Illinois': 1741, 'LaSalle, Illinois': 271, 'Livingston, Illinois': 89, 'Logan, Illinois': 71, 'McHenry, Illinois': 769, 'McLean, Illinois': 428, 'Macon, Illinois': 260, 'Madison, Illinois': 657, 'Marshall, Illinois': 28, 'Monroe, Illinois': 86, 'Morgan, Illinois': 84, 'Peoria, Illinois': 447, 'Rock Island, Illinois': 354, 'St. Clair, Illinois': 649, 'Sangamon, Illinois': 486, 'Stephenson, Illinois': 111, 'Tazewell, Illinois': 329, 'Washington, Illinois': 34, 'Whiteside, Illinois': 137, 'Will, Illinois': 1726, 'Williamson, Illinois': 166, 'Winnebago, Illinois': 706, 'Woodford, Illinois': 96, 'Adams, Indiana': 96, 'Allen, Indiana': 1024, 'Bartholomew, Indiana': 226, 'Boone, Indiana': 183, 'Brown, Indiana': 40, 'Carroll, Indiana': 54, 'Clark, Indiana': 319, 'Clinton, Indiana': 87, 'Crawford, Indiana': 28, 'Dearborn, Indiana': 133, 'Decatur, Indiana': 71, 'DeKalb, Indiana': 117, 'Delaware, Indiana': 308, 'Dubois, Indiana': 115, 'Elkhart, Indiana': 557, 'Fayette, Indiana': 62, 'Floyd, Indiana': 212, 'Fountain, Indiana': 44, 'Franklin, Indiana': 61, 'Fulton, Indiana': 53, 'Gibson, Indiana': 90, 'Grant, Indiana': 177, 'Hamilton, Indiana': 912, 'Hancock, Indiana': 211, 'Harrison, Indiana': 109, 'Hendricks, Indiana': 459, 'Henry, Indiana': 129, 'Howard, Indiana': 222, 'Huntington, Indiana': 98, 'Jackson, Indiana': 119, 'Jasper, Indiana': 90, 'Jennings, Indiana': 74, 'Johnson, Indiana': 427, 'Kosciusko, Indiana': 214, 'LaGrange, Indiana': 106, 'Lake, Indiana': 1310, 'LaPorte, Indiana': 296, 'Lawrence, Indiana': 122, 'Madison, Indiana': 349, 'Marion, Indiana': 2604, 'Marshall, Indiana': 124, 'Miami, Indiana': 95, 'Monroe, Indiana': 400, 'Montgomery, Indiana': 103, 'Morgan, Indiana': 190, 'Newton, Indiana': 37, 'Noble, Indiana': 128, 'Ohio, Indiana': 15, 'Orange, Indiana': 53, 'Owen, Indiana': 56, 'Porter, Indiana': 460, 'Posey, Indiana': 68, 'Putnam, Indiana': 101, 'Randolph, Indiana': 66, 'Ripley, Indiana': 76, 'Rush, Indiana': 44, 'St. Joseph, Indiana': 733, 'Scott, Indiana': 64, 'Shelby, Indiana': 120, 'Starke, Indiana': 62, 'Sullivan, Indiana': 55, 'Switzerland, Indiana': 29, 'Tippecanoe, Indiana': 528, 'Tipton, Indiana': 40, 'Vanderburgh, Indiana': 489, 'Vermillion, Indiana': 41, 'Vigo, Indiana': 289, 'Wabash, Indiana': 83, 'Warren, Indiana': 22, 'Warrick, Indiana': 170, 'Washington, Indiana': 75, 'Wayne, Indiana': 177, 'Wells, Indiana': 76, 'White, Indiana': 65, 'Whitley, Indiana': 91, 'Adair, Iowa': 21, 'Allamakee, Iowa': 41, 'Appanoose, Iowa': 37, 'Benton, Iowa': 76, 'Black Hawk, Iowa': 393, 'Boone, Iowa': 78, 'Buchanan, Iowa': 63, 'Butler, Iowa': 43, 'Carroll, Iowa': 60, 'Cedar, Iowa': 55, 'Cerro Gordo, Iowa': 127, 'Clayton, Iowa': 52, 'Clinton, Iowa': 139, 'Dallas, Iowa': 280, 'Des Moines, Iowa': 116, 'Dickinson, Iowa': 51, 'Dubuque, Iowa': 291, 'Fayette, Iowa': 58, 'Hancock, Iowa': 31, 'Hardin, Iowa': 50, 'Harrison, Iowa': 42, 'Henry, Iowa': 59, 'Iowa, Iowa': 48, 'Jasper, Iowa': 111, 'Johnson, Iowa': 453, 'Keokuk, Iowa': 30, 'Kossuth, Iowa': 44, 'Linn, Iowa': 680, 'Mahaska, Iowa': 66, 'Marshall, Iowa': 118, 'Monona, Iowa': 25, 'Montgomery, Iowa': 29, 'Muscatine, Iowa': 127, 'Page, Iowa': 45, 'Polk, Iowa': 1470, 'Pottawattamie, Iowa': 279, 'Poweshiek, Iowa': 55, 'Scott, Iowa': 518, 'Shelby, Iowa': 34, 'Sioux, Iowa': 104, 'Story, Iowa': 291, 'Tama, Iowa': 50, 'Taylor, Iowa': 18, 'Wapello, Iowa': 104, 'Warren, Iowa': 154, 'Washington, Iowa': 65, 'Webster, Iowa': 107, 'Winneshiek, Iowa': 59, 'Woodbury, Iowa': 309, 'Wright, Iowa': 37, 'Bourbon, Kansas': 47, 'Butler, Kansas': 220, 'Cherokee, Kansas': 65, 'Clay, Kansas': 26, 'Coffey, Kansas': 26, 'Crawford, Kansas': 128, 'Doniphan, Kansas': 25, 'Douglas, Kansas': 403, 'Ford, Kansas': 110, 'Franklin, Kansas': 84, 'Gove, Kansas': 8, 'Harvey, Kansas': 113, 'Jackson, Kansas': 43, 'Jefferson, Kansas': 62, 'Johnson, Kansas': 1987, 'Leavenworth, Kansas': 269, 'Linn, Kansas': 32, 'Lyon, Kansas': 109, 'McPherson, Kansas': 94, 'Miami, Kansas': 112, 'Mitchell, Kansas': 19, 'Morris, Kansas': 18, 'Neosho, Kansas': 52, 'Osage, Kansas': 52, 'Ottawa, Kansas': 18, 'Pottawatomie, Kansas': 80, 'Reno, Kansas': 204, 'Riley, Kansas': 244, 'Sedgwick, Kansas': 1702, 'Shawnee, Kansas': 583, 'Sumner, Kansas': 75, 'Woodson, Kansas': 10, 'Wyandotte, Kansas': 545, 'Allen, Kentucky': 68, 'Anderson, Kentucky': 72, 'Boone, Kentucky': 427, 'Bourbon, Kentucky': 63, 'Boyle, Kentucky': 96, 'Bracken, Kentucky': 26, 'Breathitt, Kentucky': 40, 'Breckinridge, Kentucky': 65, 'Bullitt, Kentucky': 261, 'Butler, Kentucky': 41, 'Calloway, Kentucky': 124, 'Campbell, Kentucky': 299, 'Carroll, Kentucky': 34, 'Christian, Kentucky': 225, 'Clark, Kentucky': 116, 'Daviess, Kentucky': 324, 'Fayette, Kentucky': 1034, 'Floyd, Kentucky': 113, 'Franklin, Kentucky': 163, 'Grant, Kentucky': 80, 'Grayson, Kentucky': 84, 'Hardin, Kentucky': 355, 'Harrison, Kentucky': 60, 'Henderson, Kentucky': 144, 'Hopkins, Kentucky': 142, 'Jefferson, Kentucky': 2453, 'Jessamine, Kentucky': 173, 'Kenton, Kentucky': 534, 'Larue, Kentucky': 46, 'Laurel, Kentucky': 194, 'Logan, Kentucky': 86, 'Lyon, Kentucky': 26, 'McCracken, Kentucky': 209, 'McCreary, Kentucky': 55, 'Madison, Kentucky': 297, 'Martin, Kentucky': 35, 'Mason, Kentucky': 54, 'Menifee, Kentucky': 20, 'Mercer, Kentucky': 70, 'Montgomery, Kentucky': 90, 'Muhlenberg, Kentucky': 97, 'Nelson, Kentucky': 147, 'Nicholas, Kentucky': 23, 'Oldham, Kentucky': 213, 'Pulaski, Kentucky': 207, 'Scott, Kentucky': 182, 'Shelby, Kentucky': 156, 'Simpson, Kentucky': 59, 'Spencer, Kentucky': 61, 'Union, Kentucky': 46, 'Warren, Kentucky': 425, 'Washington, Kentucky': 38, 'Wayne, Kentucky': 65, 'Webster, Kentucky': 41, 'Woodford, Kentucky': 85, 'Acadia, Louisiana': 204, 'Allen, Louisiana': 84, 'Ascension, Louisiana': 417, 'Assumption, Louisiana': 72, 'Avoyelles, Louisiana': 132, 'Beauregard, Louisiana': 123, 'Bienville, Louisiana': 43, 'Bossier, Louisiana': 419, 'Caddo, Louisiana': 792, 'Calcasieu, Louisiana': 671, 'Catahoula, Louisiana': 31, 'Claiborne, Louisiana': 51, 'De Soto, Louisiana': 90, 'East Baton Rouge, Louisiana': 1452, 'East Carroll, Louisiana': 22, 'East Feliciana, Louisiana': 63, 'Evangeline, Louisiana': 110, 'Franklin, Louisiana': 66, 'Grant, Louisiana': 73, 'Iberia, Louisiana': 230, 'Iberville, Louisiana': 107, 'Jackson, Louisiana': 51, 'Jefferson, Louisiana': 1427, 'Jefferson Davis, Louisiana': 103, 'Lafayette, Louisiana': 806, 'Lafourche, Louisiana': 322, 'LaSalle, Louisiana': 49, 'Lincoln, Louisiana': 154, 'Livingston, Louisiana': 464, 'Madison, Louisiana': 36, 'Morehouse, Louisiana': 82, 'Natchitoches, Louisiana': 125, 'Orleans, Louisiana': 1287, 'Ouachita, Louisiana': 505, 'Plaquemines, Louisiana': 76, 'Pointe Coupee, Louisiana': 71, 'Rapides, Louisiana': 427, 'Richland, Louisiana': 66, 'St. Bernard, Louisiana': 155, 'St. Charles, Louisiana': 175, 'St. James, Louisiana': 69, 'St. John the Baptist, Louisiana': 141, 'St. Landry, Louisiana': 271, 'St. Martin, Louisiana': 176, 'St. Mary, Louisiana': 162, 'St. Tammany, Louisiana': 859, 'Tangipahoa, Louisiana': 444, 'Terrebonne, Louisiana': 364, 'Union, Louisiana': 72, 'Vermilion, Louisiana': 196, 'Vernon, Louisiana': 156, 'Washington, Louisiana': 152, 'Webster, Louisiana': 126, 'West Baton Rouge, Louisiana': 87, 'West Feliciana, Louisiana': 51, 'Winn, Louisiana': 45, 'Androscoggin, Maine': 270, 'Cumberland, Maine': 737, 'Franklin, Maine': 75, 'Kennebec, Maine': 305, 'Knox, Maine': 99, 'Lincoln, Maine': 86, 'Oxford, Maine': 144, 'Penobscot, Maine': 380, 'Sagadahoc, Maine': 89, 'Waldo, Maine': 99, 'York, Maine': 519, 'Anne Arundel, Maryland': 1100, 'Baltimore, Maryland': 1572, 'Calvert, Maryland': 175, 'Caroline, Maryland': 63, 'Carroll, Maryland': 320, 'Cecil, Maryland': 195, 'Charles, Maryland': 310, 'Frederick, Maryland': 493, 'Garrett, Maryland': 55, 'Harford, Maryland': 485, 'Howard, Maryland': 618, 'Kent, Maryland': 36, 'Montgomery, Maryland': 1996, "Prince George's, Maryland": 1727, "Queen Anne's, Maryland": 95, "St. Mary's, Maryland": 215, 'Somerset, Maryland': 48, 'Talbot, Maryland': 70, 'Washington, Maryland': 286, 'Wicomico, Maryland': 196, 'Worcester, Maryland': 99, 'Baltimore city, Maryland': 1127, 'Barnstable, Massachusetts': 489, 'Berkshire, Massachusetts': 287, 'Bristol, Massachusetts': 1299, 'Dukes, Massachusetts': 39, 'Essex, Massachusetts': 1814, 'Franklin, Massachusetts': 161, 'Hampden, Massachusetts': 1072, 'Hampshire, Massachusetts': 369, 'Middlesex, Massachusetts': 3706, 'Nantucket, Massachusetts': 26, 'Norfolk, Massachusetts': 1625, 'Plymouth, Massachusetts': 1198, 'Suffolk, Massachusetts': 1848, 'Worcester, Massachusetts': 1910, 'Allegan, Michigan': 295, 'Barry, Michigan': 153, 'Bay, Michigan': 257, 'Berrien, Michigan': 383, 'Calhoun, Michigan': 335, 'Cass, Michigan': 129, 'Charlevoix, Michigan': 65, 'Chippewa, Michigan': 93, 'Clare, Michigan': 77, 'Clinton, Michigan': 198, 'Crawford, Michigan': 35, 'Dickinson, Michigan': 63, 'Eaton, Michigan': 275, 'Emmet, Michigan': 83, 'Genesee, Michigan': 1014, 'Gladwin, Michigan': 63, 'Gogebic, Michigan': 34, 'Grand Traverse, Michigan': 232, 'Gratiot, Michigan': 101, 'Hillsdale, Michigan': 114, 'Huron, Michigan': 77, 'Ingham, Michigan': 731, 'Ionia, Michigan': 161, 'Iosco, Michigan': 62, 'Isabella, Michigan': 174, 'Jackson, Michigan': 396, 'Kalamazoo, Michigan': 662, 'Kalkaska, Michigan': 45, 'Kent, Michigan': 1642, 'Lapeer, Michigan': 219, 'Leelanau, Michigan': 54, 'Lenawee, Michigan': 246, 'Livingston, Michigan': 479, 'Luce, Michigan': 15, 'Macomb, Michigan': 2184, 'Manistee, Michigan': 61, 'Marquette, Michigan': 166, 'Mecosta, Michigan': 108, 'Midland, Michigan': 207, 'Missaukee, Michigan': 37, 'Monroe, Michigan': 376, 'Montcalm, Michigan': 159, 'Muskegon, Michigan': 433, 'Newaygo, Michigan': 122, 'Oakland, Michigan': 3143, 'Oceana, Michigan': 66, 'Ogemaw, Michigan': 52, 'Osceola, Michigan': 58, 'Otsego, Michigan': 61, 'Ottawa, Michigan': 729, 'Roscommon, Michigan': 60, 'Saginaw, Michigan': 476, 'St. Clair, Michigan': 397, 'Sanilac, Michigan': 102, 'Shiawassee, Michigan': 170, 'Tuscola, Michigan': 130, 'Van Buren, Michigan': 189, 'Washtenaw, Michigan': 919, 'Wayne, Michigan': 4373, 'Wexford, Michigan': 84, 'Anoka, Minnesota': 892, 'Beltrami, Minnesota': 117, 'Benton, Minnesota': 102, 'Big Stone, Minnesota': 12, 'Blue Earth, Minnesota': 169, 'Carver, Minnesota': 262, 'Cass, Minnesota': 74, 'Chisago, Minnesota': 141, 'Clay, Minnesota': 160, 'Clearwater, Minnesota': 22, 'Dakota, Minnesota': 1072, 'Dodge, Minnesota': 52, 'Faribault, Minnesota': 34, 'Fillmore, Minnesota': 52, 'Goodhue, Minnesota': 115, 'Hennepin, Minnesota': 3164, 'Jackson, Minnesota': 24, 'Kandiyohi, Minnesota': 107, 'Lac qui Parle, Minnesota': 16, 'Le Sueur, Minnesota': 72, 'Lincoln, Minnesota': 14, 'Lyon, Minnesota': 63, 'Mahnomen, Minnesota': 13, 'Martin, Minnesota': 49, 'Mower, Minnesota': 100, 'Nicollet, Minnesota': 85, 'Olmsted, Minnesota': 395, 'Ramsey, Minnesota': 1375, 'Renville, Minnesota': 36, 'Rice, Minnesota': 167, 'St. Louis, Minnesota': 497, 'Scott, Minnesota': 372, 'Sherburne, Minnesota': 243, 'Sibley, Minnesota': 37, 'Stearns, Minnesota': 402, 'Steele, Minnesota': 91, 'Wabasha, Minnesota': 54, 'Waseca, Minnesota': 46, 'Washington, Minnesota': 656, 'Wilkin, Minnesota': 15, 'Winona, Minnesota': 126, 'Wright, Minnesota': 345, 'Adams, Mississippi': 122, 'Amite, Mississippi': 49, 'Attala, Mississippi': 72, 'Benton, Mississippi': 33, 'Bolivar, Mississippi': 122, 'Calhoun, Mississippi': 57, 'Chickasaw, Mississippi': 68, 'Choctaw, Mississippi': 32, 'Clarke, Mississippi': 62, 'Clay, Mississippi': 77, 'Coahoma, Mississippi': 88, 'Copiah, Mississippi': 112, 'Covington, Mississippi': 74, 'DeSoto, Mississippi': 739, 'Forrest, Mississippi': 299, 'Franklin, Mississippi': 30, 'George, Mississippi': 98, 'Grenada, Mississippi': 83, 'Hancock, Mississippi': 190, 'Harrison, Mississippi': 832, 'Hinds, Mississippi': 927, 'Holmes, Mississippi': 68, 'Humphreys, Mississippi': 32, 'Itawamba, Mississippi': 93, 'Jackson, Mississippi': 574, 'Jefferson, Mississippi': 27, 'Jones, Mississippi': 272, 'Kemper, Mississippi': 38, 'Lafayette, Mississippi': 216, 'Lamar, Mississippi': 253, 'Lauderdale, Mississippi': 296, 'Lawrence, Mississippi': 50, 'Leake, Mississippi': 91, 'Lee, Mississippi': 341, 'Leflore, Mississippi': 112, 'Lincoln, Mississippi': 136, 'Lowndes, Mississippi': 234, 'Madison, Mississippi': 425, 'Marion, Mississippi': 98, 'Marshall, Mississippi': 141, 'Monroe, Mississippi': 141, 'Montgomery, Mississippi': 39, 'Neshoba, Mississippi': 116, 'Newton, Mississippi': 84, 'Noxubee, Mississippi': 41, 'Oktibbeha, Mississippi': 198, 'Panola, Mississippi': 136, 'Pearl River, Mississippi': 222, 'Perry, Mississippi': 47, 'Pike, Mississippi': 157, 'Pontotoc, Mississippi': 128, 'Prentiss, Mississippi': 100, 'Quitman, Mississippi': 27, 'Rankin, Mississippi': 621, 'Scott, Mississippi': 112, 'Sharkey, Mississippi': 17, 'Simpson, Mississippi': 106, 'Smith, Mississippi': 63, 'Sunflower, Mississippi': 100, 'Tallahatchie, Mississippi': 55, 'Tate, Mississippi': 113, 'Tippah, Mississippi': 88, 'Tunica, Mississippi': 38, 'Union, Mississippi': 115, 'Walthall, Mississippi': 57, 'Washington, Mississippi': 175, 'Webster, Mississippi': 38, 'Wilkinson, Mississippi': 34, 'Winston, Mississippi': 71, 'Yalobusha, Mississippi': 48, 'Yazoo, Mississippi': 118, 'Adair, Missouri': 78, 'Atchison, Missouri': 15, 'Barry, Missouri': 110, 'Bates, Missouri': 50, 'Benton, Missouri': 60, 'Bollinger, Missouri': 37, 'Boone, Missouri': 559, 'Buchanan, Missouri': 270, 'Callaway, Missouri': 138, 'Camden, Missouri': 143, 'Cape Girardeau, Missouri': 244, 'Carter, Missouri': 18, 'Cass, Missouri': 327, 'Chariton, Missouri': 23, 'Christian, Missouri': 274, 'Clay, Missouri': 774, 'Clinton, Missouri': 63, 'Cole, Missouri': 237, 'Cooper, Missouri': 54, 'Dunklin, Missouri': 90, 'Franklin, Missouri': 322, 'Greene, Missouri': 908, 'Henry, Missouri': 67, 'Jackson, Missouri': 2179, 'Jasper, Missouri': 376, 'Jefferson, Missouri': 697, 'Johnson, Missouri': 167, 'Lafayette, Missouri': 101, 'Lincoln, Missouri': 182, 'McDonald, Missouri': 70, 'Moniteau, Missouri': 50, 'Montgomery, Missouri': 35, 'Newton, Missouri': 180, 'Pemiscot, Missouri': 48, 'Perry, Missouri': 59, 'Pettis, Missouri': 131, 'Platte, Missouri': 323, 'Pulaski, Missouri': 163, 'Ralls, Missouri': 31, 'Randolph, Missouri': 76, 'Ray, Missouri': 71, 'Ripley, Missouri': 41, 'St. Charles, Missouri': 1246, 'St. Francois, Missouri': 208, 'St. Louis, Missouri': 3082, 'Scott, Missouri': 118, 'Shelby, Missouri': 18, 'Stoddard, Missouri': 89, 'Taney, Missouri': 173, 'Texas, Missouri': 78, 'Warren, Missouri': 110, 'Wright, Missouri': 56, 'St. Louis city, Missouri': 931, 'Broadwater, Montana': 20, 'Cascade, Montana': 268, 'Flathead, Montana': 342, 'Gallatin, Montana': 377, 'Hill, Montana': 54, 'Jefferson, Montana': 40, 'Lake, Montana': 100, 'Lewis and Clark, Montana': 229, 'Lincoln, Montana': 65, 'Madison, Montana': 28, 'Meagher, Montana': 6, 'Missoula, Montana': 394, 'Park, Montana': 54, 'Ravalli, Montana': 144, 'Roosevelt, Montana': 36, 'Silver Bow, Montana': 115, 'Toole, Montana': 15, 'Yellowstone, Montana': 532, 'Adams, Nebraska': 112, 'Buffalo, Nebraska': 178, 'Cass, Nebraska': 94, 'Dawson, Nebraska': 84, 'Dodge, Nebraska': 131, 'Douglas, Nebraska': 2056, 'Gosper, Nebraska': 7, 'Hall, Nebraska': 220, 'Hamilton, Nebraska': 33, 'Kearney, Nebraska': 23, 'Knox, Nebraska': 29, 'Lancaster, Nebraska': 1148, 'Lincoln, Nebraska': 125, 'Madison, Nebraska': 126, 'Nemaha, Nebraska': 25, 'Platte, Nebraska': 120, 'Sarpy, Nebraska': 673, 'Saunders, Nebraska': 77, 'Washington, Nebraska': 74, 'Clark, Nevada': 4760, 'Douglas, Nevada': 102, 'Elko, Nevada': 110, 'Humboldt, Nevada': 35, 'Lyon, Nevada': 120, 'Nye, Nevada': 97, 'Washoe, Nevada': 990, 'Carson City, Nevada': 117, 'Belknap, New Hampshire': 128, 'Carroll, New Hampshire': 102, 'Cheshire, New Hampshire': 159, 'Grafton, New Hampshire': 188, 'Hillsborough, New Hampshire': 875, 'Merrimack, New Hampshire': 317, 'Rockingham, New Hampshire': 650, 'Strafford, New Hampshire': 274, 'Sullivan, New Hampshire': 90, 'Atlantic, New Jersey': 632, 'Bergen, New Jersey': 2237, 'Burlington, New Jersey': 1068, 'Camden, New Jersey': 1215, 'Cape May, New Jersey': 220, 'Cumberland, New Jersey': 358, 'Essex, New Jersey': 1917, 'Gloucester, New Jersey': 699, 'Hudson, New Jersey': 1613, 'Hunterdon, New Jersey': 298, 'Mercer, New Jersey': 881, 'Middlesex, New Jersey': 1980, 'Monmouth, New Jersey': 1485, 'Morris, New Jersey': 1180, 'Ocean, New Jersey': 1457, 'Passaic, New Jersey': 1204, 'Salem, New Jersey': 149, 'Somerset, New Jersey': 789, 'Sussex, New Jersey': 337, 'Union, New Jersey': 1335, 'Warren, New Jersey': 252, 'Bernalillo, New Mexico': 1222, 'Chaves, New Mexico': 116, 'Cibola, New Mexico': 48, 'Curry, New Mexico': 88, 'Do\u00f1a Ana, New Mexico': 392, 'Eddy, New Mexico': 105, 'Lea, New Mexico': 127, 'McKinley, New Mexico': 128, 'Rio Arriba, New Mexico': 70, 'Roosevelt, New Mexico': 33, 'Sandoval, New Mexico': 264, 'San Juan, New Mexico': 223, 'San Miguel, New Mexico': 49, 'Santa Fe, New Mexico': 270, 'Socorro, New Mexico': 29, 'Taos, New Mexico': 58, 'Valencia, New Mexico': 138, 'Albany, New York': 824, 'Allegany, New York': 124, 'Broome, New York': 514, 'Cattaraugus, New York': 205, 'Cayuga, New York': 206, 'Chautauqua, New York': 342, 'Chemung, New York': 225, 'Chenango, New York': 127, 'Clinton, New York': 217, 'Columbia, New York': 160, 'Cortland, New York': 128, 'Delaware, New York': 119, 'Dutchess, New York': 794, 'Erie, New York': 2480, 'Essex, New York': 99, 'Franklin, New York': 135, 'Fulton, New York': 144, 'Genesee, New York': 154, 'Greene, New York': 127, 'Hamilton, New York': 11, 'Herkimer, New York': 165, 'Jefferson, New York': 296, 'Livingston, New York': 169, 'Madison, New York': 191, 'Monroe, New York': 2002, 'Montgomery, New York': 132, 'Nassau, New York': 3663, 'Niagara, New York': 565, 'Oneida, New York': 617, 'Onondaga, New York': 1243, 'Ontario, New York': 296, 'Orange, New York': 1039, 'Orleans, New York': 108, 'Oswego, New York': 316, 'Otsego, New York': 160, 'Putnam, New York': 265, 'Rensselaer, New York': 428, 'Rockland, New York': 879, 'St. Lawrence, New York': 290, 'Saratoga, New York': 620, 'Schenectady, New York': 419, 'Schoharie, New York': 83, 'Schuyler, New York': 48, 'Steuben, New York': 257, 'Suffolk, New York': 3986, 'Sullivan, New York': 203, 'Tioga, New York': 130, 'Tompkins, New York': 275, 'Ulster, New York': 479, 'Warren, New York': 172, 'Washington, New York': 165, 'Wayne, New York': 242, 'Westchester, New York': 2612, 'Wyoming, New York': 107, 'Alamance, North Carolina': 355, 'Beaufort, North Carolina': 98, 'Bertie, North Carolina': 39, 'Brunswick, North Carolina': 299, 'Buncombe, North Carolina': 548, 'Burke, North Carolina': 190, 'Cabarrus, North Carolina': 454, 'Caldwell, North Carolina': 172, 'Carteret, North Carolina': 145, 'Catawba, North Carolina': 335, 'Chatham, North Carolina': 156, 'Cherokee, North Carolina': 60, 'Cleveland, North Carolina': 205, 'Craven, North Carolina': 214, 'Cumberland, North Carolina': 704, 'Davidson, North Carolina': 351, 'Davie, North Carolina': 89, 'Duplin, North Carolina': 123, 'Durham, North Carolina': 675, 'Edgecombe, North Carolina': 108, 'Forsyth, North Carolina': 802, 'Franklin, North Carolina': 146, 'Gaston, North Carolina': 471, 'Granville, North Carolina': 126, 'Greene, North Carolina': 44, 'Guilford, North Carolina': 1128, 'Harnett, North Carolina': 285, 'Henderson, North Carolina': 246, 'Hertford, North Carolina': 49, 'Hoke, North Carolina': 115, 'Iredell, North Carolina': 381, 'Jackson, North Carolina': 92, 'Johnston, North Carolina': 439, 'Lee, North Carolina': 129, 'Lenoir, North Carolina': 117, 'Lincoln, North Carolina': 180, 'McDowell, North Carolina': 96, 'Mecklenburg, North Carolina': 2331, 'Montgomery, North Carolina': 57, 'Moore, North Carolina': 211, 'Nash, North Carolina': 198, 'New Hanover, North Carolina': 492, 'Northampton, North Carolina': 40, 'Onslow, North Carolina': 415, 'Orange, North Carolina': 311, 'Pasquotank, North Carolina': 83, 'Perquimans, North Carolina': 28, 'Person, North Carolina': 82, 'Pitt, North Carolina': 379, 'Polk, North Carolina': 43, 'Randolph, North Carolina': 301, 'Richmond, North Carolina': 94, 'Robeson, North Carolina': 274, 'Rowan, North Carolina': 298, 'Sampson, North Carolina': 133, 'Scotland, North Carolina': 73, 'Stanly, North Carolina': 131, 'Surry, North Carolina': 150, 'Transylvania, North Carolina': 72, 'Union, North Carolina': 503, 'Vance, North Carolina': 93, 'Wake, North Carolina': 2334, 'Watauga, North Carolina': 117, 'Wayne, North Carolina': 258, 'Wilson, North Carolina': 171, 'Barnes, North Dakota': 44, 'Burleigh, North Dakota': 411, 'Cass, North Dakota': 782, 'Divide, North Dakota': 9, 'Dunn, North Dakota': 19, 'Foster, North Dakota': 13, 'McHenry, North Dakota': 24, 'McIntosh, North Dakota': 10, 'McLean, North Dakota': 40, 'Mercer, North Dakota': 35, 'Morton, North Dakota': 134, 'Mountrail, North Dakota': 45, 'Pierce, North Dakota': 17, 'Ramsey, North Dakota': 49, 'Sioux, North Dakota': 18, 'Stark, North Dakota': 135, 'Walsh, North Dakota': 45, 'Ward, North Dakota': 290, 'Allen, Ohio': 286, 'Ashland, Ohio': 149, 'Ashtabula, Ohio': 272, 'Athens, Ohio': 182, 'Auglaize, Ohio': 127, 'Belmont, Ohio': 187, 'Butler, Ohio': 1072, 'Carroll, Ohio': 75, 'Champaign, Ohio': 108, 'Clark, Ohio': 375, 'Clermont, Ohio': 577, 'Clinton, Ohio': 117, 'Columbiana, Ohio': 285, 'Coshocton, Ohio': 102, 'Crawford, Ohio': 116, 'Cuyahoga, Ohio': 3458, 'Darke, Ohio': 143, 'Defiance, Ohio': 106, 'Delaware, Ohio': 585, 'Erie, Ohio': 207, 'Fairfield, Ohio': 441, 'Fayette, Ohio': 79, 'Franklin, Ohio': 3686, 'Fulton, Ohio': 117, 'Gallia, Ohio': 83, 'Geauga, Ohio': 262, 'Greene, Ohio': 473, 'Hamilton, Ohio': 2288, 'Hancock, Ohio': 212, 'Highland, Ohio': 120, 'Huron, Ohio': 163, 'Jefferson, Ohio': 182, 'Knox, Ohio': 174, 'Lake, Ohio': 644, 'Lawrence, Ohio': 166, 'Licking, Ohio': 495, 'Logan, Ohio': 127, 'Lorain, Ohio': 867, 'Lucas, Ohio': 1199, 'Madison, Ohio': 125, 'Mahoning, Ohio': 640, 'Marion, Ohio': 182, 'Medina, Ohio': 503, 'Mercer, Ohio': 115, 'Miami, Ohio': 299, 'Montgomery, Ohio': 1488, 'Muskingum, Ohio': 241, 'Ottawa, Ohio': 113, 'Pickaway, Ohio': 163, 'Pike, Ohio': 77, 'Portage, Ohio': 454, 'Richland, Ohio': 339, 'Sandusky, Ohio': 163, 'Seneca, Ohio': 154, 'Shelby, Ohio': 136, 'Stark, Ohio': 1037, 'Summit, Ohio': 1514, 'Trumbull, Ohio': 554, 'Tuscarawas, Ohio': 257, 'Union, Ohio': 165, 'Van Wert, Ohio': 79, 'Warren, Ohio': 656, 'Washington, Ohio': 167, 'Wayne, Ohio': 323, 'Wood, Ohio': 366, 'Wyandot, Ohio': 60, 'Adair, Oklahoma': 62, 'Bryan, Oklahoma': 134, 'Caddo, Oklahoma': 80, 'Canadian, Oklahoma': 415, 'Carter, Oklahoma': 134, 'Cherokee, Oklahoma': 136, 'Choctaw, Oklahoma': 41, 'Cleveland, Oklahoma': 795, 'Comanche, Oklahoma': 338, 'Craig, Oklahoma': 39, 'Creek, Oklahoma': 200, 'Custer, Oklahoma': 81, 'Delaware, Oklahoma': 120, 'Garvin, Oklahoma': 77, 'Grady, Oklahoma': 156, 'Jackson, Oklahoma': 68, 'Kay, Oklahoma': 121, 'Latimer, Oklahoma': 28, 'Le Flore, Oklahoma': 139, 'Lincoln, Oklahoma': 97, 'Logan, Oklahoma': 134, 'McClain, Oklahoma': 113, 'Mayes, Oklahoma': 115, 'Muskogee, Oklahoma': 190, 'Noble, Oklahoma': 31, 'Nowata, Oklahoma': 28, 'Oklahoma, Oklahoma': 2232, 'Okmulgee, Oklahoma': 107, 'Osage, Oklahoma': 131, 'Ottawa, Oklahoma': 87, 'Pawnee, Oklahoma': 45, 'Payne, Oklahoma': 228, 'Pittsburg, Oklahoma': 122, 'Pontotoc, Oklahoma': 107, 'Pottawatomie, Oklahoma': 203, 'Sequoyah, Oklahoma': 116, 'Stephens, Oklahoma': 120, 'Tulsa, Oklahoma': 1824, 'Wagoner, Oklahoma': 227, 'Washington, Oklahoma': 144, 'Benton, Oregon': 148, 'Clackamas, Oregon': 669, 'Clatsop, Oregon': 64, 'Columbia, Oregon': 83, 'Deschutes, Oregon': 316, 'Douglas, Oregon': 177, 'Grant, Oregon': 11, 'Hood River, Oregon': 37, 'Jackson, Oregon': 353, 'Josephine, Oregon': 139, 'Klamath, Oregon': 109, 'Lane, Oregon': 611, 'Lincoln, Oregon': 79, 'Linn, Oregon': 207, 'Marion, Oregon': 556, 'Morrow, Oregon': 18, 'Multnomah, Oregon': 1300, 'Polk, Oregon': 137, 'Tillamook, Oregon': 43, 'Umatilla, Oregon': 124, 'Union, Oregon': 42, 'Wasco, Oregon': 42, 'Washington, Oregon': 962, 'Yamhill, Oregon': 171, 'Adams, Pennsylvania': 298, 'Allegheny, Pennsylvania': 3526, 'Armstrong, Pennsylvania': 187, 'Beaver, Pennsylvania': 475, 'Berks, Pennsylvania': 1221, 'Blair, Pennsylvania': 353, 'Bradford, Pennsylvania': 174, 'Bucks, Pennsylvania': 1821, 'Butler, Pennsylvania': 544, 'Cambria, Pennsylvania': 377, 'Cameron, Pennsylvania': 12, 'Carbon, Pennsylvania': 186, 'Centre, Pennsylvania': 470, 'Chester, Pennsylvania': 1522, 'Clarion, Pennsylvania': 111, 'Clearfield, Pennsylvania': 229, 'Columbia, Pennsylvania': 188, 'Crawford, Pennsylvania': 245, 'Cumberland, Pennsylvania': 734, 'Dauphin, Pennsylvania': 807, 'Delaware, Pennsylvania': 1643, 'Erie, Pennsylvania': 782, 'Fayette, Pennsylvania': 374, 'Franklin, Pennsylvania': 449, 'Greene, Pennsylvania': 105, 'Huntingdon, Pennsylvania': 130, 'Indiana, Pennsylvania': 243, 'Juniata, Pennsylvania': 71, 'Lackawanna, Pennsylvania': 608, 'Lancaster, Pennsylvania': 1582, 'Lawrence, Pennsylvania': 247, 'Lebanon, Pennsylvania': 411, 'Lehigh, Pennsylvania': 1071, 'Luzerne, Pennsylvania': 920, 'Lycoming, Pennsylvania': 328, 'McKean, Pennsylvania': 117, 'Mercer, Pennsylvania': 317, 'Monroe, Pennsylvania': 493, 'Montgomery, Pennsylvania': 2409, 'Montour, Pennsylvania': 52, 'Northampton, Pennsylvania': 885, 'Northumberland, Pennsylvania': 263, 'Perry, Pennsylvania': 134, 'Philadelphia, Pennsylvania': 4593, 'Pike, Pennsylvania': 161, 'Potter, Pennsylvania': 47, 'Schuylkill, Pennsylvania': 409, 'Snyder, Pennsylvania': 117, 'Somerset, Pennsylvania': 212, 'Susquehanna, Pennsylvania': 116, 'Tioga, Pennsylvania': 117, 'Union, Pennsylvania': 130, 'Warren, Pennsylvania': 113, 'Washington, Pennsylvania': 599, 'Wayne, Pennsylvania': 148, 'Westmoreland, Pennsylvania': 1011, 'York, Pennsylvania': 1302, 'Bristol, Rhode Island': 101, 'Kent, Rhode Island': 345, 'Newport, Rhode Island': 172, 'Providence, Rhode Island': 1341, 'Washington, Rhode Island': 263, 'Abbeville, South Carolina': 58, 'Aiken, South Carolina': 410, 'Anderson, South Carolina': 486, 'Beaufort, South Carolina': 461, 'Berkeley, South Carolina': 546, 'Calhoun, South Carolina': 34, 'Charleston, South Carolina': 987, 'Chester, South Carolina': 77, 'Chesterfield, South Carolina': 109, 'Clarendon, South Carolina': 80, 'Colleton, South Carolina': 90, 'Darlington, South Carolina': 159, 'Dillon, South Carolina': 73, 'Dorchester, South Carolina': 390, 'Edgefield, South Carolina': 65, 'Fairfield, South Carolina': 53, 'Florence, South Carolina': 331, 'Georgetown, South Carolina': 150, 'Greenville, South Carolina': 1256, 'Greenwood, South Carolina': 169, 'Horry, South Carolina': 849, 'Jasper, South Carolina': 72, 'Kershaw, South Carolina': 159, 'Lancaster, South Carolina': 235, 'Laurens, South Carolina': 161, 'Lee, South Carolina': 40, 'Lexington, South Carolina': 717, 'Marion, South Carolina': 73, 'Marlboro, South Carolina': 62, 'Newberry, South Carolina': 92, 'Oconee, South Carolina': 190, 'Orangeburg, South Carolina': 206, 'Pickens, South Carolina': 304, 'Richland, South Carolina': 997, 'Saluda, South Carolina': 49, 'Spartanburg, South Carolina': 767, 'Sumter, South Carolina': 256, 'Union, South Carolina': 65, 'Williamsburg, South Carolina': 72, 'York, South Carolina': 674, 'Aurora, South Dakota': 13, 'Beadle, South Dakota': 88, 'Bon Homme, South Dakota': 33, 'Brookings, South Dakota': 168, 'Brown, South Dakota': 186, 'Charles Mix, South Dakota': 44, 'Codington, South Dakota': 134, 'Davison, South Dakota': 94, 'Deuel, South Dakota': 20, 'Faulk, South Dakota': 11, 'Hamlin, South Dakota': 29, 'Hughes, South Dakota': 84, 'Hutchinson, South Dakota': 34, 'Lawrence, South Dakota': 124, 'Lincoln, South Dakota': 293, 'Lyman, South Dakota': 18, 'McCook, South Dakota': 26, 'Meade, South Dakota': 135, 'Minnehaha, South Dakota': 927, 'Pennington, South Dakota': 546, 'Todd, South Dakota': 48, 'Union, South Dakota': 76, 'Yankton, South Dakota': 109, 'Anderson, Tennessee': 223, 'Bedford, Tennessee': 144, 'Benton, Tennessee': 46, 'Bledsoe, Tennessee': 43, 'Blount, Tennessee': 385, 'Bradley, Tennessee': 313, 'Campbell, Tennessee': 115, 'Cannon, Tennessee': 42, 'Carroll, Tennessee': 80, 'Carter, Tennessee': 163, 'Cheatham, Tennessee': 117, 'Chester, Tennessee': 50, 'Claiborne, Tennessee': 92, 'Cocke, Tennessee': 104, 'Cumberland, Tennessee': 175, 'Davidson, Tennessee': 2013, 'Decatur, Tennessee': 33, 'DeKalb, Tennessee': 59, 'Dickson, Tennessee': 156, 'Dyer, Tennessee': 107, 'Fayette, Tennessee': 119, 'Franklin, Tennessee': 122, 'Gibson, Tennessee': 142, 'Greene, Tennessee': 200, 'Grundy, Tennessee': 38, 'Hamblen, Tennessee': 188, 'Hamilton, Tennessee': 1066, 'Hardeman, Tennessee': 72, 'Hardin, Tennessee': 74, 'Hawkins, Tennessee': 164, 'Houston, Tennessee': 23, 'Jefferson, Tennessee': 158, 'Johnson, Tennessee': 51, 'Knox, Tennessee': 1363, 'Lewis, Tennessee': 35, 'Lincoln, Tennessee': 99, 'Loudon, Tennessee': 156, 'McMinn, Tennessee': 156, 'Macon, Tennessee': 71, 'Madison, Tennessee': 284, 'Marion, Tennessee': 83, 'Maury, Tennessee': 279, 'Meigs, Tennessee': 36, 'Monroe, Tennessee': 134, 'Montgomery, Tennessee': 606, 'Morgan, Tennessee': 62, 'Overton, Tennessee': 64, 'Perry, Tennessee': 23, 'Putnam, Tennessee': 232, 'Roane, Tennessee': 154, 'Robertson, Tennessee': 208, 'Rutherford, Tennessee': 963, 'Scott, Tennessee': 63, 'Sevier, Tennessee': 284, 'Shelby, Tennessee': 2717, 'Smith, Tennessee': 58, 'Sullivan, Tennessee': 459, 'Sumner, Tennessee': 554, 'Tipton, Tennessee': 178, 'Trousdale, Tennessee': 32, 'Unicoi, Tennessee': 51, 'Union, Tennessee': 57, 'Washington, Tennessee': 375, 'Weakley, Tennessee': 96, 'White, Tennessee': 79, 'Williamson, Tennessee': 691, 'Wilson, Tennessee': 419, 'Andrews, Texas': 43, 'Angelina, Texas': 199, 'Atascosa, Texas': 117, 'Austin, Texas': 69, 'Bastrop, Texas': 204, 'Bell, Texas': 834, 'Bexar, Texas': 4608, 'Blanco, Texas': 27, 'Bowie, Texas': 214, 'Brazoria, Texas': 860, 'Brazos, Texas': 527, 'Brown, Texas': 87, 'Burleson, Texas': 42, 'Burnet, Texas': 110, 'Caldwell, Texas': 100, 'Calhoun, Texas': 48, 'Cameron, Texas': 973, 'Cass, Texas': 69, 'Castro, Texas': 17, 'Chambers, Texas': 100, 'Cherokee, Texas': 121, 'Collin, Texas': 2379, 'Comal, Texas': 359, 'Cooke, Texas': 94, 'Coryell, Texas': 174, 'Crane, Texas': 11, 'Dallas, Texas': 6061, 'Deaf Smith, Texas': 42, 'Denton, Texas': 2040, 'DeWitt, Texas': 46, 'Eastland, Texas': 42, 'Ellis, Texas': 425, 'El Paso, Texas': 1930, 'Erath, Texas': 98, 'Falls, Texas': 39, 'Fannin, Texas': 81, 'Fayette, Texas': 58, 'Fort Bend, Texas': 1866, 'Gaines, Texas': 49, 'Galveston, Texas': 786, 'Grayson, Texas': 313, 'Gregg, Texas': 285, 'Grimes, Texas': 66, 'Guadalupe, Texas': 383, 'Hale, Texas': 76, 'Hardin, Texas': 132, 'Harris, Texas': 10840, 'Harrison, Texas': 153, 'Hays, Texas': 529, 'Hidalgo, Texas': 1998, 'Hockley, Texas': 52, 'Hood, Texas': 141, 'Hopkins, Texas': 85, 'Hunt, Texas': 226, 'Jackson, Texas': 33, 'Jefferson, Texas': 578, 'Johnson, Texas': 404, 'Karnes, Texas': 35, 'Kaufman, Texas': 313, 'Kendall, Texas': 109, 'Lamar, Texas': 114, 'Lamb, Texas': 29, 'Lavaca, Texas': 46, 'Liberty, Texas': 202, 'Limestone, Texas': 53, 'Llano, Texas': 50, 'Lubbock, Texas': 714, 'Lynn, Texas': 13, 'McLennan, Texas': 590, 'Martin, Texas': 13, 'Matagorda, Texas': 84, 'Maverick, Texas': 135, 'Medina, Texas': 118, 'Midland, Texas': 406, 'Milam, Texas': 57, 'Montague, Texas': 45, 'Montgomery, Texas': 1396, 'Morris, Texas': 28, 'Nacogdoches, Texas': 149, 'Navarro, Texas': 115, 'Nueces, Texas': 833, 'Oldham, Texas': 4, 'Orange, Texas': 191, 'Parker, Texas': 328, 'Potter, Texas': 270, 'Randall, Texas': 316, 'Robertson, Texas': 39, 'Rockwall, Texas': 241, 'Rusk, Texas': 125, 'San Patricio, Texas': 153, 'Shelby, Texas': 58, 'Smith, Texas': 535, 'Starr, Texas': 148, 'Tarrant, Texas': 4835, 'Taylor, Texas': 317, 'Terry, Texas': 28, 'Tom Green, Texas': 274, 'Travis, Texas': 2930, 'Upshur, Texas': 96, 'Uvalde, Texas': 61, 'Val Verde, Texas': 112, 'Van Zandt, Texas': 130, 'Victoria, Texas': 211, 'Walker, Texas': 167, 'Washington, Texas': 82, 'Webb, Texas': 636, 'Wharton, Texas': 95, 'Wichita, Texas': 304, 'Willacy, Texas': 49, 'Williamson, Texas': 1358, 'Wilson, Texas': 117, 'Yoakum, Texas': 20, 'Young, Texas': 41, 'Box Elder, Utah': 100, 'Cache, Utah': 230, 'Davis, Utah': 639, 'Garfield, Utah': 9, 'Iron, Utah': 98, 'Morgan, Utah': 21, 'Salt Lake, Utah': 2088, 'San Juan, Utah': 27, 'Summit, Utah': 75, 'Tooele, Utah': 130, 'Uintah, Utah': 64, 'Utah, Utah': 1145, 'Wasatch, Utah': 61, 'Washington, Utah': 319, 'Weber, Utah': 468, 'Addison, Vermont': 77, 'Bennington, Vermont': 74, 'Caledonia, Vermont': 62, 'Chittenden, Vermont': 343, 'Franklin, Vermont': 103, 'Lamoille, Vermont': 53, 'Orange, Vermont': 60, 'Orleans, Vermont': 56, 'Rutland, Vermont': 122, 'Washington, Vermont': 122, 'Windham, Vermont': 88, 'Windsor, Vermont': 115, 'Accomack, Virginia': 67, 'Albemarle, Virginia': 229, 'Amelia, Virginia': 27, 'Amherst, Virginia': 66, 'Arlington, Virginia': 497, 'Bedford, Virginia': 165, 'Botetourt, Virginia': 70, 'Charles City, Virginia': 14, 'Chesterfield, Virginia': 740, 'Culpeper, Virginia': 110, 'Fairfax, Virginia': 2409, 'Fauquier, Virginia': 149, 'Fluvanna, Virginia': 57, 'Franklin, Virginia': 117, 'Frederick, Virginia': 187, 'Gloucester, Virginia': 78, 'Goochland, Virginia': 49, 'Greene, Virginia': 41, 'Halifax, Virginia': 71, 'Hanover, Virginia': 226, 'Henrico, Virginia': 694, 'Isle of Wight, Virginia': 77, 'James City, Virginia': 160, 'King George, Virginia': 56, 'Lancaster, Virginia': 22, 'Lee, Virginia': 49, 'Loudoun, Virginia': 868, 'Louisa, Virginia': 78, 'Madison, Virginia': 27, 'Mathews, Virginia': 18, 'Mecklenburg, Virginia': 64, 'Montgomery, Virginia': 206, 'Nelson, Virginia': 31, 'New Kent, Virginia': 48, 'Northampton, Virginia': 24, 'Northumberland, Virginia': 25, 'Nottoway, Virginia': 31, 'Orange, Virginia': 77, 'Pittsylvania, Virginia': 126, 'Powhatan, Virginia': 62, 'Prince Edward, Virginia': 47, 'Prince George, Virginia': 80, 'Prince William, Virginia': 987, 'Roanoke, Virginia': 197, 'Rockbridge, Virginia': 47, 'Rockingham, Virginia': 172, 'Shenandoah, Virginia': 91, 'Southampton, Virginia': 37, 'Spotsylvania, Virginia': 286, 'Stafford, Virginia': 321, 'Warren, Virginia': 84, 'Washington, Virginia': 112, 'York, Virginia': 143, 'Alexandria city, Virginia': 334, 'Bristol city, Virginia': 35, 'Charlottesville city, Virginia': 99, 'Chesapeake city, Virginia': 514, 'Danville city, Virginia': 84, 'Fairfax city, Virginia': 50, 'Fredericksburg city, Virginia': 60, 'Galax city, Virginia': 13, 'Hampton city, Virginia': 282, 'Harrisonburg city, Virginia': 111, 'Hopewell city, Virginia': 47, 'Lynchburg city, Virginia': 172, 'Manassas city, Virginia': 86, 'Newport News city, Virginia': 376, 'Norfolk city, Virginia': 509, 'Poquoson city, Virginia': 25, 'Portsmouth city, Virginia': 198, 'Radford city, Virginia': 38, 'Richmond city, Virginia': 483, 'Roanoke city, Virginia': 208, 'Suffolk city, Virginia': 193, 'Virginia Beach city, Virginia': 944, 'Williamsburg city, Virginia': 31, 'Adams, Washington': 33, 'Benton, Washington': 347, 'Chelan, Washington': 131, 'Clallam, Washington': 131, 'Clark, Washington': 830, 'Columbia, Washington': 6, 'Cowlitz, Washington': 188, 'Douglas, Washington': 73, 'Ferry, Washington': 12, 'Franklin, Washington': 161, 'Grant, Washington': 166, 'Grays Harbor, Washington': 127, 'Island, Washington': 144, 'Jefferson, Washington': 54, 'King, Washington': 3829, 'Kitsap, Washington': 461, 'Kittitas, Washington': 81, 'Klickitat, Washington': 38, 'Lewis, Washington': 137, 'Lincoln, Washington': 18, 'Mason, Washington': 113, 'Okanogan, Washington': 71, 'Pierce, Washington': 1538, 'San Juan, Washington': 29, 'Skagit, Washington': 219, 'Skamania, Washington': 20, 'Snohomish, Washington': 1397, 'Spokane, Washington': 888, 'Stevens, Washington': 77, 'Thurston, Washington': 493, 'Walla Walla, Washington': 103, 'Whatcom, Washington': 389, 'Whitman, Washington': 85, 'Yakima, Washington': 426, 'Berkeley, West Virginia': 452, 'Greenbrier, West Virginia': 131, 'Hancock, West Virginia': 109, 'Harrison, West Virginia': 255, 'Jackson, West Virginia': 108, 'Jefferson, West Virginia': 217, 'Kanawha, West Virginia': 676, 'Logan, West Virginia': 121, 'Marion, West Virginia': 213, 'Marshall, West Virginia': 116, 'Mason, West Virginia': 100, 'Mercer, West Virginia': 223, 'Monongalia, West Virginia': 401, 'Ohio, West Virginia': 157, 'Pleasants, West Virginia': 28, 'Preston, West Virginia': 127, 'Putnam, West Virginia': 214, 'Raleigh, West Virginia': 278, 'Tucker, West Virginia': 25, 'Upshur, West Virginia': 91, 'Wood, West Virginia': 317, 'Bayfield, Wisconsin': 31, 'Brown, Wisconsin': 555, 'Calumet, Wisconsin': 105, 'Chippewa, Wisconsin': 135, 'Clark, Wisconsin': 73, 'Columbia, Wisconsin': 120, 'Dane, Wisconsin': 1148, 'Dodge, Wisconsin': 184, 'Douglas, Wisconsin': 90, 'Dunn, Wisconsin': 95, 'Eau Claire, Wisconsin': 219, 'Fond du Lac, Wisconsin': 217, 'Grant, Wisconsin': 108, 'Green, Wisconsin': 77, 'Iowa, Wisconsin': 49, 'Iron, Wisconsin': 11, 'Jefferson, Wisconsin': 178, 'Juneau, Wisconsin': 56, 'Kenosha, Wisconsin': 356, 'La Crosse, Wisconsin': 247, 'Marathon, Wisconsin': 284, 'Marinette, Wisconsin': 84, 'Milwaukee, Wisconsin': 1986, 'Monroe, Wisconsin': 97, 'Oneida, Wisconsin': 74, 'Outagamie, Wisconsin': 394, 'Ozaukee, Wisconsin': 187, 'Pierce, Wisconsin': 89, 'Portage, Wisconsin': 148, 'Racine, Wisconsin': 412, 'Richland, Wisconsin': 36, 'Rock, Wisconsin': 343, 'St. Croix, Wisconsin': 190, 'Sauk, Wisconsin': 135, 'Sheboygan, Wisconsin': 242, 'Vilas, Wisconsin': 46, 'Walworth, Wisconsin': 218, 'Washington, Wisconsin': 285, 'Waukesha, Wisconsin': 848, 'Waupaca, Wisconsin': 107, 'Winnebago, Wisconsin': 361, 'Wood, Wisconsin': 153, 'Albany, Wyoming': 136, 'Campbell, Wyoming': 162, 'Carbon, Wyoming': 51, 'Converse, Wyoming': 48, 'Fremont, Wyoming': 137, 'Goshen, Wyoming': 46, 'Hot Springs, Wyoming': 15, 'Johnson, Wyoming': 29, 'Laramie, Wyoming': 348, 'Natrona, Wyoming': 279, 'Park, Wyoming': 102, 'Sheridan, Wyoming': 106, 'Sublette, Wyoming': 34, 'Sweetwater, Wyoming': 148, 'Teton, Wyoming': 82, 'Washakie, Wyoming': 27, 'Aberdeen, SD': 186, 'Aberdeen, WA': 127, 'Abilene, TX': 317, 'Ada, OK': 107, 'Adrian, MI': 246, 'Akron, OH': 1968, 'Albany, GA': 350, 'Albany, NY': 2374, 'Albany, OR': 207, 'Albemarle, NC': 131, 'Albertville, AL': 299, 'Albuquerque, NM': 1624, 'Alexander City, AL': 158, 'Alexandria, LA': 500, 'Allentown, PA': 2394, 'Alma, MI': 101, 'Altoona, PA': 353, 'Altus, OK': 68, 'Amarillo, TX': 590, 'Americus, GA': 70, 'Ames, IA': 369, 'Amsterdam, NY': 132, 'Anchorage, AK': 871, 'Andrews, TX': 43, 'Ann Arbor, MI': 919, 'Anniston, AL': 352, 'Appleton, WI': 499, 'Arcadia, FL': 98, 'Ardmore, OK': 134, 'Arkadelphia, AR': 71, 'Asheville, NC': 794, 'Ashland, OH': 149, 'Ashtabula, OH': 272, 'Astoria, OR': 64, 'Athens, GA': 474, 'Athens, OH': 182, 'Athens, TN': 156, 'Atlanta, GA': 14436, 'Atlantic City, NJ': 632, 'Atmore, AL': 113, 'Auburn, AL': 510, 'Auburn, IN': 117, 'Auburn, NY': 206, 'Augusta, GA': 1460, 'Augusta, ME': 305, 'Austin, MN': 100, 'Austin, TX': 5121, 'Bainbridge, GA': 63, 'Bakersfield, CA': 1620, 'Baltimore, MD': 5317, 'Bangor, ME': 380, 'Baraboo, WI': 135, 'Bardstown, KY': 147, 'Barnstable Town, MA': 489, 'Barre, VT': 122, 'Bartlesville, OK': 144, 'Batavia, NY': 154, 'Batesville, AR': 121, 'Baton Rouge, LA': 2784, 'Battle Creek, MI': 335, 'Bay City, MI': 257, 'Bay City, TX': 84, 'Beaumont, TX': 901, 'Beaver Dam, WI': 184, 'Beckley, WV': 278, 'Bedford, IN': 122, 'Bellefontaine, OH': 127, 'Bellingham, WA': 389, 'Bemidji, MN': 117, 'Bend, OR': 316, 'Bennettsville, SC': 62, 'Bennington, VT': 74, 'Big Rapids, MI': 108, 'Billings, MT': 532, 'Binghamton, NY': 644, 'Birmingham, AL': 3308, 'Bismarck, ND': 545, 'Blackfoot, ID': 88, 'Blacksburg, VA': 244, 'Bloomington, IL': 428, 'Bloomington, IN': 456, 'Bloomsburg, PA': 240, 'Bluefield, WV': 223, 'Bogalusa, LA': 152, 'Boise City, ID': 1385, 'Bonham, TX': 81, 'Boone, NC': 117, 'Boston, MA': 11115, 'Boulder, CO': 619, 'Bowling Green, KY': 534, 'Bozeman, MT': 377, 'Bradford, PA': 117, 'Brainerd, MN': 74, 'Branson, MO': 173, 'Breckenridge, CO': 58, 'Bremerton, WA': 461, 'Brenham, TX': 82, 'Brevard, NC': 72, 'Bridgeport, CT': 1886, 'Brookhaven, MS': 136, 'Brookings, SD': 168, 'Brownsville, TX': 973, 'Brownwood, TX': 87, 'Brunswick, GA': 204, 'Bucyrus, OH': 116, 'Buffalo, NY': 3045, 'Burley, ID': 45, 'Burlington, IA': 116, 'Burlington, NC': 355, 'Burlington, VT': 446, 'Butte, MT': 115, 'Cadillac, MI': 121, 'Calhoun, GA': 139, 'California, MD': 215, 'Canton, OH': 1112, 'Cape Coral, FL': 2003, 'Cape Girardeau, MO': 281, 'Carbondale, IL': 307, 'Carlsbad, NM': 105, 'Carroll, IA': 60, 'Carson City, NV': 117, 'Casper, WY': 279, 'Ca\u00f1on City, CO': 90, 'Cedar City, UT': 98, 'Cedar Rapids, IA': 756, 'Cedartown, GA': 102, 'Celina, OH': 115, 'Central City, KY': 97, 'Centralia, WA': 137, 'Chambersburg, PA': 449, 'Champaign, IL': 524, 'Charleston, IL': 26, 'Charleston, SC': 1923, 'Charleston, WV': 784, 'Charlotte, NC': 5604, 'Charlottesville, VA': 457, 'Chattanooga, TN': 1311, 'Cheyenne, WY': 348, 'Chicago, IL': 23713, 'Chico, CA': 394, 'Cincinnati, OH': 6168, 'Clarksburg, WV': 255, 'Clarksdale, MS': 88, 'Clarksville, TN': 831, 'Cleveland, MS': 122, 'Cleveland, OH': 5734, 'Cleveland, TN': 313, 'Clewiston, FL': 109, 'Clinton, IA': 139, 'Clovis, NM': 88, "Coeur d'Alene, ID": 314, 'College Station, TX': 608, 'Colorado Springs, CO': 1416, 'Columbia, MO': 613, 'Columbia, SC': 2009, 'Columbus, GA': 758, 'Columbus, IN': 226, 'Columbus, MS': 234, 'Columbus, NE': 120, 'Columbus, OH': 5660, 'Concord, NH': 317, 'Connersville, IN': 62, 'Cookeville, TN': 296, 'Cordele, GA': 53, 'Cornelia, GA': 108, 'Corning, NY': 257, 'Corpus Christi, TX': 986, 'Corsicana, TX': 115, 'Cortland, NY': 128, 'Corvallis, OR': 148, 'Coshocton, OH': 102, 'Craig, CO': 25, 'Crawfordsville, IN': 103, 'Crestview, FL': 739, 'Crossville, TN': 175, 'Cullman, AL': 259, 'Cullowhee, NC': 92, 'Dallas, TX': 17252, 'Dalton, GA': 347, 'Danville, KY': 96, 'Danville, VA': 210, 'Daphne, AL': 692, 'Davenport, IA': 994, 'Dayton, OH': 2260, 'DeRidder, LA': 123, 'Decatur, AL': 473, 'Decatur, IL': 260, 'Decatur, IN': 96, 'Defiance, OH': 106, 'Del Rio, TX': 112, 'Deltona, FL': 1737, 'Denver, CO': 5621, 'Des Moines, IA': 2015, 'Detroit, MI': 10795, 'Dickinson, ND': 135, 'Dodge City, KS': 110, 'Dothan, AL': 328, 'Douglas, GA': 103, 'Dover, DE': 397, 'DuBois, PA': 229, 'Dublin, GA': 114, 'Dubuque, IA': 291, 'Duluth, MN': 587, 'Duncan, OK': 120, 'Durango, CO': 106, 'Durant, OK': 134, 'Durham, NC': 1350, 'Dyersburg, TN': 107, 'Eagle Pass, TX': 135, 'East Stroudsburg, PA': 493, 'Easton, MD': 70, 'Eau Claire, WI': 354, 'Edwards, CO': 104, 'El Campo, TX': 95, 'El Centro, CA': 326, 'El Dorado, AR': 123, 'El Paso, TX': 1930, 'Elizabeth City, NC': 111, 'Elizabethtown, KY': 401, 'Elkhart, IN': 557, 'Elko, NV': 110, 'Ellensburg, WA': 81, 'Elmira, NY': 225, 'Emporia, KS': 109, 'Erie, PA': 782, 'Espa\u00f1ola, NM': 70, 'Eugene, OR': 611, 'Eureka, CA': 244, 'Evansville, IN': 871, 'Fairbanks, AK': 213, 'Fairmont, MN': 49, 'Fairmont, WV': 213, 'Fargo, ND': 942, 'Faribault, MN': 167, 'Farmington, MO': 208, 'Farmington, NM': 223, 'Fayetteville, AR': 1658, 'Fayetteville, NC': 1104, 'Fernley, NV': 120, 'Findlay, OH': 212, 'Fitzgerald, GA': 40, 'Flagstaff, AZ': 272, 'Flint, MI': 1014, 'Florence, AL': 458, 'Florence, SC': 490, 'Fond du Lac, WI': 217, 'Fort Collins, CO': 678, 'Fort Dodge, IA': 107, 'Fort Leonard Wood, MO': 163, 'Fort Morgan, CO': 55, 'Fort Payne, AL': 221, 'Fort Polk South, LA': 156, 'Fort Smith, AR': 727, 'Fort Wayne, IN': 1115, 'Frankfort, IN': 87, 'Frankfort, KY': 235, 'Freeport, IL': 111, 'Fremont, NE': 131, 'Fremont, OH': 163, 'Fresno, CA': 1798, 'Gadsden, AL': 317, 'Gainesville, FL': 806, 'Gainesville, GA': 490, 'Gainesville, TX': 94, 'Gallup, NM': 128, 'Gardnerville Ranchos, NV': 102, 'Georgetown, SC': 150, 'Gettysburg, PA': 298, 'Gillette, WY': 162, 'Glens Falls, NY': 337, 'Glenwood Springs, CO': 147, 'Gloversville, NY': 144, 'Goldsboro, NC': 258, 'Granbury, TX': 141, 'Grand Island, NE': 220, 'Grand Junction, CO': 292, 'Grand Rapids, MI': 2691, 'Grants Pass, OR': 139, 'Grants, NM': 48, 'Great Falls, MT': 268, 'Greeley, CO': 616, 'Green Bay, WI': 555, 'Greeneville, TN': 200, 'Greensboro, NC': 1429, 'Greensburg, IN': 71, 'Greenville, MS': 175, 'Greenville, NC': 379, 'Greenville, OH': 143, 'Greenville, SC': 2207, 'Greenwood, MS': 112, 'Greenwood, SC': 169, 'Grenada, MS': 83, 'Gulfport, MS': 1596, 'Hagerstown, MD': 738, 'Hailey, ID': 43, 'Hammond, LA': 444, 'Hanford, CA': 275, 'Hannibal, MO': 31, 'Harrisburg, PA': 1675, 'Harrison, AR': 119, 'Harrisonburg, VA': 283, 'Hartford, CT': 2408, 'Hastings, NE': 112, 'Hattiesburg, MS': 673, 'Heber, UT': 136, 'Helena, MT': 269, 'Henderson, NC': 93, 'Hereford, TX': 42, 'Hermiston, OR': 142, 'Hickory, NC': 697, 'Hillsdale, MI': 114, 'Hilo, HI': 382, 'Hilton Head Island, SC': 533, 'Hinesville, GA': 193, 'Hobbs, NM': 127, 'Holland, MI': 295, 'Homosassa Springs, FL': 389, 'Hood River, OR': 37, 'Hope, AR': 68, 'Hot Springs, AR': 318, 'Houma, LA': 686, 'Houston, TX': 16119, 'Hudson, NY': 160, 'Huntingdon, PA': 130, 'Huntington, IN': 98, 'Huntington, WV': 380, 'Huntsville, AL': 1462, 'Huntsville, TX': 167, 'Huron, SD': 88, 'Hutchinson, KS': 204, 'Idaho Falls, ID': 282, 'Indiana, PA': 243, 'Indianapolis, IN': 5596, 'Indianola, MS': 100, 'Iowa City, IA': 518, 'Iron Mountain, MI': 63, 'Ithaca, NY': 275, 'Jackson, MI': 396, 'Jackson, MS': 2377, 'Jackson, TN': 476, 'Jackson, WY': 105, 'Jacksonville, FL': 4053, 'Jacksonville, IL': 84, 'Jacksonville, NC': 415, 'Jacksonville, TX': 121, 'Jamestown, NY': 342, 'Janesville, WI': 343, 'Jasper, AL': 196, 'Jasper, IN': 115, 'Jefferson City, MO': 425, 'Jefferson, GA': 175, 'Jennings, LA': 103, 'Johnson City, TN': 589, 'Johnstown, PA': 377, 'Jonesboro, AR': 428, 'Joplin, MO': 556, 'Juneau, AK': 70, 'Kahului, HI': 318, 'Kalamazoo, MI': 662, 'Kalispell, MT': 342, 'Kankakee, IL': 274, 'Kansas City, MO': 6833, 'Kapaa, HI': 137, 'Kearney, NE': 201, 'Keene, NH': 159, 'Kendallville, IN': 128, 'Kennett, MO': 90, 'Kennewick, WA': 508, 'Ketchikan, AK': 30, 'Key West, FL': 192, 'Killeen, TX': 1008, 'Kingsport, TN': 770, 'Kingston, NY': 479, 'Kinston, NC': 117, 'Kirksville, MO': 78, 'Klamath Falls, OR': 109, 'Knoxville, TN': 2515, 'Kokomo, IN': 222, 'La Crosse, WI': 247, 'La Grande, OR': 42, 'LaGrange, GA': 270, 'Laconia, NH': 128, 'Lafayette, IN': 604, 'Lafayette, LA': 1612, 'Lake Charles, LA': 671, 'Lake City, FL': 186, 'Lake Havasu City, AZ': 403, 'Lakeland, FL': 1884, 'Lancaster, PA': 1582, 'Lansing, MI': 1374, 'Laramie, WY': 136, 'Laredo, TX': 636, 'Las Cruces, NM': 392, 'Las Vegas, NM': 49, 'Las Vegas, NV': 4760, 'Laurel, MS': 272, 'Laurinburg, NC': 73, 'Lawrence, KS': 403, 'Lawton, OK': 338, 'Lebanon, NH': 453, 'Lebanon, PA': 411, 'Levelland, TX': 52, 'Lewisburg, PA': 130, 'Lewiston, ID': 76, 'Lewiston, ME': 270, 'Lexington, KY': 1653, 'Lexington, NE': 91, 'Lima, OH': 286, 'Lincoln, IL': 71, 'Lincoln, NE': 1148, 'Little Rock, AR': 2340, 'Logan, UT': 230, 'London, KY': 194, 'Longview, TX': 659, 'Longview, WA': 188, 'Los Angeles, CA': 23786, 'Louisville/Jefferson County, KY': 3859, 'Lubbock, TX': 727, 'Lufkin, TX': 199, 'Lumberton, NC': 274, 'Lynchburg, VA': 403, 'Macon, GA': 520, 'Madera, CA': 283, 'Madison, WI': 1394, 'Madisonville, KY': 142, 'Magnolia, AR': 75, 'Malone, NY': 135, 'Malvern, AR': 108, 'Manchester, NH': 875, 'Manhattan, KS': 324, 'Mankato, MN': 254, 'Mansfield, OH': 339, 'Marietta, OH': 167, 'Marinette, WI': 84, 'Marion, IN': 177, 'Marion, NC': 96, 'Marion, OH': 182, 'Marquette, MI': 166, 'Marshall, MN': 63, 'Marshalltown, IA': 118, 'Martin, TN': 96, 'Mason City, IA': 127, 'Maysville, KY': 54, 'McAlester, OK': 122, 'McAllen, TX': 1998, 'McComb, MS': 157, 'McPherson, KS': 94, 'Meadville, PA': 245, 'Medford, OR': 353, 'Memphis, TN': 4198, 'Menomonie, WI': 95, 'Merced, CA': 499, 'Meridian, MS': 396, 'Miami, FL': 16032, 'Miami, OK': 87, 'Michigan City, IN': 296, 'Midland, MI': 207, 'Midland, TX': 419, 'Milledgeville, GA': 107, 'Milwaukee, WI': 3306, 'Minden, LA': 126, 'Minneapolis, MN': 8873, 'Minot, ND': 314, 'Missoula, MT': 394, 'Mitchell, SD': 94, 'Moberly, MO': 76, 'Mobile, AL': 1330, 'Modesto, CA': 991, 'Monroe, LA': 659, 'Monroe, MI': 376, 'Montgomery, AL': 1156, 'Montrose, CO': 81, 'Morehead City, NC': 145, 'Morgan City, LA': 162, 'Morgantown, WV': 528, 'Morristown, TN': 346, 'Moses Lake, WA': 166, 'Moultrie, GA': 109, 'Mount Airy, NC': 150, 'Mount Gay, WV': 121, 'Mount Pleasant, MI': 174, 'Mount Sterling, KY': 110, 'Mount Vernon, OH': 174, 'Mount Vernon, WA': 219, 'Mountain Home, AR': 134, 'Muncie, IN': 308, 'Murray, KY': 124, 'Muscatine, IA': 127, 'Muskegon, MI': 433, 'Muskogee, OK': 190, 'Myrtle Beach, SC': 1148, 'Nacogdoches, TX': 149, 'Napa, CA': 247, 'Naples, FL': 1000, 'Nashville, TN': 5603, 'Natchez, MS': 122, 'Natchitoches, LA': 125, 'New Bern, NC': 214, 'New Castle, IN': 129, 'New Castle, PA': 247, 'New Haven, CT': 1709, 'New Orleans, LA': 4189, 'New Philadelphia, OH': 257, 'New York, NY': 27398, 'Newberry, SC': 92, 'Newport, OR': 79, 'Newport, TN': 104, 'Niles, MI': 383, 'Nogales, AZ': 88, 'Norfolk, NE': 126, 'North Platte, NE': 125, 'North Port, FL': 2175, 'North Vernon, IN': 74, 'Norwalk, OH': 163, 'Norwich, CT': 530, 'Oak Harbor, WA': 144, 'Ocala, FL': 950, 'Ocean City, NJ': 220, 'Ogden, UT': 1228, 'Ogdensburg, NY': 290, 'Oklahoma City, OK': 3942, 'Olean, NY': 205, 'Olympia, WA': 493, 'Omaha, NE': 3295, 'Oneonta, NY': 160, 'Ontario, OR': 45, 'Opelousas, LA': 271, 'Orangeburg, SC': 206, 'Orlando, FL': 6778, 'Oshkosh, WI': 361, 'Oskaloosa, IA': 66, 'Othello, WA': 33, 'Ottawa, IL': 352, 'Ottawa, KS': 84, 'Ottumwa, IA': 104, 'Owatonna, MN': 91, 'Owensboro, KY': 324, 'Oxford, MS': 216, 'Oxnard, CA': 1522, 'Paducah, KY': 209, 'Pahrump, NV': 97, 'Palatka, FL': 193, 'Palm Bay, FL': 1565, 'Panama City, FL': 454, 'Paragould, AR': 145, 'Paris, TX': 114, 'Parkersburg, WV': 317, 'Payson, AZ': 102, 'Pensacola, FL': 1306, 'Peoria, IL': 900, 'Peru, IN': 95, 'Philadelphia, PA': 16543, 'Phoenix, AZ': 9401, 'Picayune, MS': 222, 'Pierre, SD': 84, 'Pine Bluff, AR': 279, 'Pinehurst, NC': 211, 'Pittsburg, KS': 128, 'Pittsburgh, PA': 6716, 'Pittsfield, MA': 287, 'Plainview, TX': 76, 'Platteville, WI': 108, 'Plattsburgh, NY': 217, 'Plymouth, IN': 124, 'Pocatello, ID': 166, 'Point Pleasant, WV': 183, 'Ponca City, OK': 121, 'Pontiac, IL': 89, 'Poplar Bluff, MO': 41, 'Port Angeles, WA': 131, 'Port Lavaca, TX': 48, 'Port St. Lucie, FL': 1271, 'Portales, NM': 33, 'Portland, ME': 1345, 'Portland, OR': 4035, 'Pottsville, PA': 409, 'Poughkeepsie, NY': 1833, 'Prescott Valley, AZ': 446, 'Providence, RI': 3521, 'Provo, UT': 1145, 'Pueblo, CO': 320, 'Pullman, WA': 85, 'Punta Gorda, FL': 491, 'Quincy, IL': 163, 'Racine, WI': 412, 'Raleigh, NC': 2919, 'Rapid City, SD': 681, 'Raymondville, TX': 49, 'Reading, PA': 1221, 'Red Wing, MN': 115, 'Redding, CA': 324, 'Reno, NV': 990, 'Rexburg, ID': 99, 'Richmond, IN': 177, 'Richmond, KY': 297, 'Richmond, VA': 2470, 'Rio Grande City, TX': 148, 'Riverside, CA': 8370, 'Riverton, WY': 137, 'Roanoke Rapids, NC': 40, 'Roanoke, VA': 592, 'Rochester, MN': 553, 'Rochester, NY': 2817, 'Rock Springs, WY': 148, 'Rockford, IL': 706, 'Rockingham, NC': 94, 'Rocky Mount, NC': 306, 'Rome, GA': 236, 'Roseburg, OR': 177, 'Roswell, NM': 116, 'Russellville, AR': 205, 'Ruston, LA': 154, 'Rutland, VT': 122, 'Sacramento, CA': 4252, 'Safford, AZ': 73, 'Saginaw, MI': 476, 'Salem, OH': 285, 'Salem, OR': 693, 'Salina, KS': 18, 'Salinas, CA': 781, 'Salisbury, MD': 858, 'Salt Lake City, UT': 2218, 'San Angelo, TX': 274, 'San Antonio, TX': 5811, 'San Diego, CA': 6008, 'San Francisco, CA': 8514, 'San Jose, CA': 3583, 'San Luis Obispo, CA': 509, 'Sandusky, OH': 207, 'Sanford, NC': 129, 'Santa Cruz, CA': 491, 'Santa Fe, NM': 270, 'Santa Maria, CA': 803, 'Santa Rosa, CA': 889, 'Sault Ste. Marie, MI': 93, 'Savannah, GA': 943, 'Sayre, PA': 174, 'Scottsboro, AL': 160, 'Scottsburg, IN': 64, 'Scranton, PA': 1528, 'Searcy, AR': 252, 'Seattle, WA': 6764, 'Sebastian, FL': 415, 'Sebring, FL': 276, 'Sedalia, MO': 131, 'Selinsgrove, PA': 117, 'Selma, AL': 115, 'Seneca, SC': 190, 'Sevierville, TN': 284, 'Seymour, IN': 119, 'Shawnee, OK': 203, 'Sheboygan, WI': 242, 'Shelby, NC': 205, 'Shelbyville, TN': 144, 'Shelton, WA': 113, 'Sheridan, WY': 106, 'Sherman, TX': 313, 'Show Low, AZ': 210, 'Shreveport, LA': 1301, 'Sidney, OH': 136, 'Sierra Vista, AZ': 239, 'Sikeston, MO': 118, 'Sioux City, IA': 385, 'Sioux Falls, SD': 1246, 'Somerset, KY': 207, 'Somerset, PA': 212, 'South Bend, IN': 862, 'Spartanburg, SC': 767, 'Spearfish, SD': 124, 'Spirit Lake, IA': 51, 'Spokane, WA': 965, 'Springfield, IL': 486, 'Springfield, MA': 1602, 'Springfield, MO': 1182, 'Springfield, OH': 375, 'St. Cloud, MN': 504, 'St. George, UT': 319, 'St. Joseph, MO': 295, 'St. Louis, MO': 8055, 'St. Marys, GA': 131, 'Starkville, MS': 236, 'State College, PA': 470, 'Statesboro, GA': 191, 'Steamboat Springs, CO': 48, 'Stephenville, TX': 98, 'Sterling, CO': 42, 'Sterling, IL': 137, 'Stevens Point, WI': 148, 'Stillwater, OK': 228, 'Stockton, CA': 1371, 'Sulphur Springs, TX': 85, 'Summerville, GA': 59, 'Sumter, SC': 336, 'Sunbury, PA': 263, 'Syracuse, NY': 1750, 'Tahlequah, OK': 136, 'Talladega, AL': 247, 'Tallahassee, FL': 881, 'Tampa, FL': 8305, 'Taos, NM': 58, 'Taylorville, IL': 80, 'Terre Haute, IN': 385, 'Texarkana, TX': 214, 'The Dalles, OR': 42, 'The Villages, FL': 344, 'Thomaston, GA': 63, 'Thomasville, GA': 106, 'Tiffin, OH': 154, 'Tifton, GA': 97, 'Toccoa, GA': 62, 'Toledo, OH': 1795, 'Topeka, KS': 740, 'Torrington, CT': 360, 'Traverse City, MI': 331, 'Trenton, NJ': 881, 'Troy, AL': 102, 'Truckee, CA': 179, 'Tucson, AZ': 1989, 'Tullahoma, TN': 122, 'Tulsa, OK': 2534, 'Tupelo, MS': 662, 'Tuscaloosa, AL': 735, 'Twin Falls, ID': 165, 'Tyler, TX': 535, 'Ukiah, CA': 156, 'Union, SC': 65, 'Urban Honolulu, HI': 1851, 'Urbana, OH': 108, 'Utica, NY': 782, 'Uvalde, TX': 61, 'Valdosta, GA': 281, 'Vallejo, CA': 805, 'Van Wert, OH': 79, 'Vernal, UT': 64, 'Victoria, TX': 211, 'Vidalia, GA': 64, 'Vineland, NJ': 358, 'Vineyard Haven, MA': 39, 'Virginia Beach, VA': 3585, 'Visalia, CA': 839, 'Wabash, IN': 83, 'Waco, TX': 629, 'Wahpeton, ND': 15, 'Walla Walla, WA': 103, 'Wapakoneta, OH': 127, 'Warner Robins, GA': 444, 'Warren, PA': 113, 'Warrensburg, MO': 167, 'Warsaw, IN': 214, 'Washington Court House, OH': 79, 'Washington, DC': 14291, 'Washington, NC': 98, 'Waterloo, IA': 393, 'Watertown, NY': 296, 'Watertown, SD': 163, 'Watertown, WI': 178, 'Wausau, WI': 284, 'Waycross, GA': 131, 'Weatherford, OK': 81, 'Weirton, WV': 291, 'Wenatchee, WA': 204, 'West Point, MS': 77, 'Wheeling, WV': 460, 'Whitewater, WI': 218, 'Wichita Falls, TX': 304, 'Wichita, KS': 2110, 'Williamsport, PA': 328, 'Willmar, MN': 107, 'Wilmington, NC': 492, 'Wilmington, OH': 117, 'Wilson, NC': 171, 'Winchester, VA': 187, 'Winnemucca, NV': 35, 'Winona, MN': 126, 'Winston, NC': 1242, 'Wisconsin Rapids, WI': 153, 'Wooster, OH': 323, 'Worcester, MA': 2143, 'Yakima, WA': 426, 'Yankton, SD': 109, 'York, PA': 1302, 'Youngstown, OH': 1511, 'Yuba City, CA': 315, 'Yuma, AZ': 406, 'Zanesville, OH': 241 }
}
viTrack.cbsamap = { 46013: 'Aberdeen, SD', 46045: 'Aberdeen, SD', 53027: 'Aberdeen, WA', 48059: 'Abilene, TX', 48253: 'Abilene, TX', 48441: 'Abilene, TX', 40123: 'Ada, OK', 26091: 'Adrian, MI', 72003: 'Aguadilla, PR', 72005: 'Aguadilla, PR', 72011: 'Aguadilla, PR', 72071: 'Aguadilla, PR', 72081: 'Aguadilla, PR', 72099: 'Aguadilla, PR', 72117: 'Aguadilla, PR', 72131: 'Aguadilla, PR', 72141: 'Aguadilla, PR', 39133: 'Akron, OH', 39153: 'Akron, OH', 35035: 'Alamogordo, NM', 13095: 'Albany, GA', 13177: 'Albany, GA', 13273: 'Albany, GA', 13321: 'Albany, GA', 41043: 'Albany, OR', 36001: 'Albany, NY', 36083: 'Albany, NY', 36091: 'Albany, NY', 36093: 'Albany, NY', 36095: 'Albany, NY', 37167: 'Albemarle, NC', 27047: 'Albert Lea, MN', 1095: 'Albertville, AL', 35001: 'Albuquerque, NM', 35043: 'Albuquerque, NM', 35057: 'Albuquerque, NM', 35061: 'Albuquerque, NM', 1037: 'Alexander City, AL', 1123: 'Alexander City, AL', 22043: 'Alexandria, LA', 22079: 'Alexandria, LA', 27041: 'Alexandria, MN', 48131: 'Alice, TX', 48249: 'Alice, TX', 34041: 'Allentown, PA', 42025: 'Allentown, PA', 42077: 'Allentown, PA', 42095: 'Allentown, PA', 26057: 'Alma, MI', 26007: 'Alpena, MI', 42013: 'Altoona, PA', 40065: 'Altus, OK', 48011: 'Amarillo, TX', 48065: 'Amarillo, TX', 48359: 'Amarillo, TX', 48375: 'Amarillo, TX', 48381: 'Amarillo, TX', 13249: 'Americus, GA', 13261: 'Americus, GA', 19015: 'Ames, IA', 19169: 'Ames, IA', 36057: 'Amsterdam, NY', 2020: 'Anchorage, AK', 2170: 'Anchorage, AK', 48003: 'Andrews, TX', 18151: 'Angola, IN', 26161: 'Ann Arbor, MI', 1015: 'Anniston, AL', 55015: 'Appleton, WI', 55087: 'Appleton, WI', 12027: 'Arcadia, FL', 40019: 'Ardmore, OK', 40085: 'Ardmore, OK', 72013: 'Arecibo, PR', 72027: 'Arecibo, PR', 72065: 'Arecibo, PR', 72115: 'Arecibo, PR', 5019: 'Arkadelphia, AR', 37021: 'Asheville, NC', 37087: 'Asheville, NC', 37089: 'Asheville, NC', 37115: 'Asheville, NC', 39005: 'Ashland, OH', 39007: 'Ashtabula, OH', 41007: 'Astoria, OR', 20005: 'Atchison, KS', 39009: 'Athens, OH', 47107: 'Athens, TN', 48213: 'Athens, TX', 13059: 'Athens, GA', 13195: 'Athens, GA', 13219: 'Athens, GA', 13221: 'Athens, GA', 13013: 'Atlanta, GA', 13015: 'Atlanta, GA', 13035: 'Atlanta, GA', 13045: 'Atlanta, GA', 13057: 'Atlanta, GA', 13063: 'Atlanta, GA', 13067: 'Atlanta, GA', 13077: 'Atlanta, GA', 13085: 'Atlanta, GA', 13089: 'Atlanta, GA', 13097: 'Atlanta, GA', 13113: 'Atlanta, GA', 13117: 'Atlanta, GA', 13121: 'Atlanta, GA', 13135: 'Atlanta, GA', 13143: 'Atlanta, GA', 13149: 'Atlanta, GA', 13151: 'Atlanta, GA', 13159: 'Atlanta, GA', 13171: 'Atlanta, GA', 13199: 'Atlanta, GA', 13211: 'Atlanta, GA', 13217: 'Atlanta, GA', 13223: 'Atlanta, GA', 13227: 'Atlanta, GA', 13231: 'Atlanta, GA', 13247: 'Atlanta, GA', 13255: 'Atlanta, GA', 13297: 'Atlanta, GA', 34001: 'Atlantic City, NJ', 1053: 'Atmore, AL', 18033: 'Auburn, IN', 36011: 'Auburn, NY', 1081: 'Auburn, AL', 13033: 'Augusta, GA', 13073: 'Augusta, GA', 13181: 'Augusta, GA', 13189: 'Augusta, GA', 13245: 'Augusta, GA', 45003: 'Augusta, GA', 45037: 'Augusta, GA', 23011: 'Augusta, ME', 27099: 'Austin, MN', 48021: 'Austin, TX', 48055: 'Austin, TX', 48209: 'Austin, TX', 48453: 'Austin, TX', 48491: 'Austin, TX', 13087: 'Bainbridge, GA', 6029: 'Bakersfield, CA', 24003: 'Baltimore, MD', 24005: 'Baltimore, MD', 24013: 'Baltimore, MD', 24025: 'Baltimore, MD', 24027: 'Baltimore, MD', 24035: 'Baltimore, MD', 24510: 'Baltimore, MD', 23019: 'Bangor, ME', 55111: 'Baraboo, WI', 21179: 'Bardstown, KY', 25001: 'Barnstable Town, MA', 50023: 'Barre, VT', 40147: 'Bartlesville, OK', 36037: 'Batavia, NY', 5063: 'Batesville, AR', 5135: 'Batesville, AR', 22005: 'Baton Rouge, LA', 22007: 'Baton Rouge, LA', 22033: 'Baton Rouge, LA', 22037: 'Baton Rouge, LA', 22047: 'Baton Rouge, LA', 22063: 'Baton Rouge, LA', 22077: 'Baton Rouge, LA', 22091: 'Baton Rouge, LA', 22121: 'Baton Rouge, LA', 22125: 'Baton Rouge, LA', 26025: 'Battle Creek, MI', 26017: 'Bay City, MI', 48321: 'Bay City, TX', 31067: 'Beatrice, NE', 48199: 'Beaumont, TX', 48245: 'Beaumont, TX', 48361: 'Beaumont, TX', 55027: 'Beaver Dam, WI', 54019: 'Beckley, WV', 54081: 'Beckley, WV', 18093: 'Bedford, IN', 48025: 'Beeville, TX', 39091: 'Bellefontaine, OH', 53073: 'Bellingham, WA', 27007: 'Bemidji, MN', 41017: 'Bend, OR', 45069: 'Bennettsville, SC', 50003: 'Bennington, VT', 33007: 'Berlin, NH', 26107: 'Big Rapids, MI', 48227: 'Big Spring, TX', 51195: 'Big Stone Gap, VA', 51720: 'Big Stone Gap, VA', 30009: 'Billings, MT', 30095: 'Billings, MT', 30111: 'Billings, MT', 36007: 'Binghamton, NY', 36107: 'Binghamton, NY', 1007: 'Birmingham, AL', 1009: 'Birmingham, AL', 1021: 'Birmingham, AL', 1073: 'Birmingham, AL', 1115: 'Birmingham, AL', 1117: 'Birmingham, AL', 38015: 'Bismarck, ND', 38059: 'Bismarck, ND', 38065: 'Bismarck, ND', 16011: 'Blackfoot, ID', 51071: 'Blacksburg, VA', 51121: 'Blacksburg, VA', 51155: 'Blacksburg, VA', 51750: 'Blacksburg, VA', 17113: 'Bloomington, IL', 18105: 'Bloomington, IN', 18119: 'Bloomington, IN', 42037: 'Bloomsburg, PA', 42093: 'Bloomsburg, PA', 51021: 'Bluefield, WV', 51185: 'Bluefield, WV', 54055: 'Bluefield, WV', 5093: 'Blytheville, AR', 22117: 'Bogalusa, LA', 16001: 'Boise City, ID', 16015: 'Boise City, ID', 16027: 'Boise City, ID', 16045: 'Boise City, ID', 16073: 'Boise City, ID', 48147: 'Bonham, TX', 37189: 'Boone, NC', 48233: 'Borger, TX', 25021: 'Boston, MA', 25023: 'Boston, MA', 25025: 'Boston, MA', 25009: 'Boston, MA', 25017: 'Boston, MA', 33015: 'Boston, MA', 33017: 'Boston, MA', 8013: 'Boulder, CO', 21003: 'Bowling Green, KY', 21031: 'Bowling Green, KY', 21061: 'Bowling Green, KY', 21227: 'Bowling Green, KY', 30031: 'Bozeman, MT', 42083: 'Bradford, PA', 27021: 'Brainerd, MN', 27035: 'Brainerd, MN', 29213: 'Branson, MO', 8117: 'Breckenridge, CO', 53035: 'Bremerton, WA', 48477: 'Brenham, TX', 37175: 'Brevard, NC', 9001: 'Bridgeport, CT', 28085: 'Brookhaven, MS', 41015: 'Brookings, OR', 46011: 'Brookings, SD', 47075: 'Brownsville, TN', 48061: 'Brownsville, TX', 48049: 'Brownwood, TX', 13025: 'Brunswick, GA', 13127: 'Brunswick, GA', 13191: 'Brunswick, GA', 39033: 'Bucyrus, OH', 36029: 'Buffalo, NY', 36063: 'Buffalo, NY', 16031: 'Burley, ID', 16067: 'Burley, ID', 17071: 'Burlington, IA', 19057: 'Burlington, IA', 37001: 'Burlington, NC', 50007: 'Burlington, VT', 50011: 'Burlington, VT', 50013: 'Burlington, VT', 30093: 'Butte, MT', 26113: 'Cadillac, MI', 26165: 'Cadillac, MI', 13129: 'Calhoun, GA', 24037: 'California, MD', 24019: 'Cambridge, MD', 39059: 'Cambridge, OH', 5013: 'Camden, AR', 5103: 'Camden, AR', 21087: 'Campbellsville, KY', 21217: 'Campbellsville, KY', 8043: 'Ca\u00f1on City, CO', 39019: 'Canton, OH', 39151: 'Canton, OH', 12071: 'Cape Coral, FL', 17003: 'Cape Girardeau, MO', 29017: 'Cape Girardeau, MO', 29031: 'Cape Girardeau, MO', 17077: 'Carbondale, IL', 17087: 'Carbondale, IL', 17199: 'Carbondale, IL', 35015: 'Carlsbad, NM', 19027: 'Carroll, IA', 32510: 'Carson City, NV', 56025: 'Casper, WY', 49021: 'Cedar City, UT', 19011: 'Cedar Rapids, IA', 19105: 'Cedar Rapids, IA', 19113: 'Cedar Rapids, IA', 13233: 'Cedartown, GA', 39107: 'Celina, OH', 21177: 'Central City, KY', 17121: 'Centralia, IL', 53041: 'Centralia, WA', 42055: 'Chambersburg, PA', 17019: 'Champaign, IL', 17147: 'Champaign, IL', 54005: 'Charleston, WV', 54015: 'Charleston, WV', 54035: 'Charleston, WV', 54039: 'Charleston, WV', 54043: 'Charleston, WV', 17029: 'Charleston, IL', 17035: 'Charleston, IL', 45015: 'Charleston, SC', 45019: 'Charleston, SC', 45035: 'Charleston, SC', 37007: 'Charlotte, NC', 37025: 'Charlotte, NC', 37071: 'Charlotte, NC', 37097: 'Charlotte, NC', 37109: 'Charlotte, NC', 37119: 'Charlotte, NC', 37159: 'Charlotte, NC', 37179: 'Charlotte, NC', 45023: 'Charlotte, NC', 45057: 'Charlotte, NC', 45091: 'Charlotte, NC', 51003: 'Charlottesville, VA', 51065: 'Charlottesville, VA', 51079: 'Charlottesville, VA', 51125: 'Charlottesville, VA', 51540: 'Charlottesville, VA', 13047: 'Chattanooga, TN', 13083: 'Chattanooga, TN', 13295: 'Chattanooga, TN', 47065: 'Chattanooga, TN', 47115: 'Chattanooga, TN', 47153: 'Chattanooga, TN', 56021: 'Cheyenne, WY', 17031: 'Chicago, IL', 17043: 'Chicago, IL', 17063: 'Chicago, IL', 17111: 'Chicago, IL', 17197: 'Chicago, IL', 17037: 'Chicago, IL', 17089: 'Chicago, IL', 17093: 'Chicago, IL', 18073: 'Chicago, IL', 18089: 'Chicago, IL', 18111: 'Chicago, IL', 18127: 'Chicago, IL', 17097: 'Chicago, IL', 55059: 'Chicago, IL', 6007: 'Chico, CA', 39141: 'Chillicothe, OH', 18029: 'Cincinnati, OH', 18047: 'Cincinnati, OH', 18115: 'Cincinnati, OH', 18161: 'Cincinnati, OH', 21015: 'Cincinnati, OH', 21023: 'Cincinnati, OH', 21037: 'Cincinnati, OH', 21077: 'Cincinnati, OH', 21081: 'Cincinnati, OH', 21117: 'Cincinnati, OH', 21191: 'Cincinnati, OH', 39015: 'Cincinnati, OH', 39017: 'Cincinnati, OH', 39025: 'Cincinnati, OH', 39061: 'Cincinnati, OH', 39165: 'Cincinnati, OH', 54017: 'Clarksburg, WV', 54033: 'Clarksburg, WV', 54091: 'Clarksburg, WV', 28027: 'Clarksdale, MS', 21047: 'Clarksville, TN', 21221: 'Clarksville, TN', 47125: 'Clarksville, TN', 47161: 'Clarksville, TN', 6033: 'Clearlake, CA', 28011: 'Cleveland, MS', 47011: 'Cleveland, TN', 47139: 'Cleveland, TN', 39035: 'Cleveland, OH', 39055: 'Cleveland, OH', 39085: 'Cleveland, OH', 39093: 'Cleveland, OH', 39103: 'Cleveland, OH', 12051: 'Clewiston, FL', 19045: 'Clinton, IA', 35009: 'Clovis, NM', 72043: 'Coamo, PR', 72123: 'Coco, PR', 16055: "Coeur d'Alene, ID", 20125: 'Coffeyville, KS', 26023: 'Coldwater, MI', 48041: 'College Station, TX', 48051: 'College Station, TX', 48395: 'College Station, TX', 8041: 'Colorado Springs, CO', 8119: 'Colorado Springs, CO', 29019: 'Columbia, MO', 29053: 'Columbia, MO', 29089: 'Columbia, MO', 45017: 'Columbia, SC', 45039: 'Columbia, SC', 45055: 'Columbia, SC', 45063: 'Columbia, SC', 45079: 'Columbia, SC', 45081: 'Columbia, SC', 1113: 'Columbus, GA', 13053: 'Columbus, GA', 13145: 'Columbus, GA', 13197: 'Columbus, GA', 13215: 'Columbus, GA', 13259: 'Columbus, GA', 13263: 'Columbus, GA', 18005: 'Columbus, IN', 28087: 'Columbus, MS', 31141: 'Columbus, NE', 39041: 'Columbus, OH', 39045: 'Columbus, OH', 39049: 'Columbus, OH', 39073: 'Columbus, OH', 39089: 'Columbus, OH', 39097: 'Columbus, OH', 39117: 'Columbus, OH', 39127: 'Columbus, OH', 39129: 'Columbus, OH', 39159: 'Columbus, OH', 33013: 'Concord, NH', 18041: 'Connersville, IN', 47087: 'Cookeville, TN', 47133: 'Cookeville, TN', 47141: 'Cookeville, TN', 41011: 'Coos Bay, OR', 13081: 'Cordele, GA', 28003: 'Corinth, MS', 13137: 'Cornelia, GA', 36101: 'Corning, NY', 48355: 'Corpus Christi, TX', 48409: 'Corpus Christi, TX', 48349: 'Corsicana, TX', 36023: 'Cortland, NY', 41003: 'Corvallis, OR', 39031: 'Coshocton, OH', 8081: 'Craig, CO', 18107: 'Crawfordsville, IN', 6015: 'Crescent City, CA', 12091: 'Crestview, FL', 12131: 'Crestview, FL', 47035: 'Crossville, TN', 1043: 'Cullman, AL', 37099: 'Cullowhee, NC', 37173: 'Cullowhee, NC', 24001: 'Cumberland, MD', 54057: 'Cumberland, MD', 48085: 'Dallas, TX', 48113: 'Dallas, TX', 48121: 'Dallas, TX', 48139: 'Dallas, TX', 48231: 'Dallas, TX', 48257: 'Dallas, TX', 48397: 'Dallas, TX', 48251: 'Dallas, TX', 48367: 'Dallas, TX', 48439: 'Dallas, TX', 48497: 'Dallas, TX', 13213: 'Dalton, GA', 13313: 'Dalton, GA', 17183: 'Danville, IL', 21021: 'Danville, KY', 21137: 'Danville, KY', 51143: 'Danville, VA', 51590: 'Danville, VA', 1003: 'Daphne, AL', 17073: 'Davenport, IA', 17131: 'Davenport, IA', 17161: 'Davenport, IA', 19163: 'Davenport, IA', 47143: 'Dayton, TN', 39057: 'Dayton, OH', 39109: 'Dayton, OH', 39113: 'Dayton, OH', 1079: 'Decatur, AL', 1103: 'Decatur, AL', 17115: 'Decatur, IL', 18001: 'Decatur, IN', 39039: 'Defiance, OH', 48465: 'Del Rio, TX', 12035: 'Deltona, FL', 12127: 'Deltona, FL', 35029: 'Deming, NM', 8001: 'Denver, CO', 8005: 'Denver, CO', 8014: 'Denver, CO', 8019: 'Denver, CO', 8031: 'Denver, CO', 8035: 'Denver, CO', 8039: 'Denver, CO', 8047: 'Denver, CO', 8059: 'Denver, CO', 8093: 'Denver, CO', 22011: 'DeRidder, LA', 19049: 'Des Moines, IA', 19077: 'Des Moines, IA', 19099: 'Des Moines, IA', 19121: 'Des Moines, IA', 19153: 'Des Moines, IA', 19181: 'Des Moines, IA', 26163: 'Detroit, MI', 26087: 'Detroit, MI', 26093: 'Detroit, MI', 26099: 'Detroit, MI', 26125: 'Detroit, MI', 26147: 'Detroit, MI', 38007: 'Dickinson, ND', 38089: 'Dickinson, ND', 17103: 'Dixon, IL', 20057: 'Dodge City, KS', 1061: 'Dothan, AL', 1067: 'Dothan, AL', 1069: 'Dothan, AL', 13003: 'Douglas, GA', 13069: 'Douglas, GA', 10001: 'Dover, DE', 13167: 'Dublin, GA', 13175: 'Dublin, GA', 13283: 'Dublin, GA', 42033: 'DuBois, PA', 19061: 'Dubuque, IA', 27017: 'Duluth, MN', 27075: 'Duluth, MN', 27137: 'Duluth, MN', 55031: 'Duluth, MN', 48341: 'Dumas, TX', 40137: 'Duncan, OK', 8067: 'Durango, CO', 40013: 'Durant, OK', 37037: 'Durham, NC', 37063: 'Durham, NC', 37077: 'Durham, NC', 37135: 'Durham, NC', 37145: 'Durham, NC', 47045: 'Dyersburg, TN', 48323: 'Eagle Pass, TX', 24041: 'Easton, MD', 42089: 'East Stroudsburg, PA', 55017: 'Eau Claire, WI', 55035: 'Eau Claire, WI', 8037: 'Edwards, CO', 17049: 'Effingham, IL', 48481: 'El Campo, TX', 6025: 'El Centro, CA', 5139: 'El Dorado, AR', 37139: 'Elizabeth City, NC', 37143: 'Elizabeth City, NC', 21093: 'Elizabethtown, KY', 21123: 'Elizabethtown, KY', 21163: 'Elizabethtown, KY', 40009: 'Elk City, OK', 18039: 'Elkhart, IN', 54083: 'Elkins, WV', 32007: 'Elko, NV', 32011: 'Elko, NV', 53037: 'Ellensburg, WA', 36015: 'Elmira, NY', 48141: 'El Paso, TX', 48229: 'El Paso, TX', 20017: 'Emporia, KS', 20111: 'Emporia, KS', 40047: 'Enid, OK', 1031: 'Enterprise, AL', 42049: 'Erie, PA', 26041: 'Escanaba, MI', 35039: 'Espa\u00f1ola, NM', 1005: 'Eufaula, AL', 13239: 'Eufaula, AL', 41039: 'Eugene, OR', 6023: 'Eureka, CA', 56041: 'Evanston, WY', 18129: 'Evansville, IN', 18163: 'Evansville, IN', 18173: 'Evansville, IN', 21101: 'Evansville, IN', 2090: 'Fairbanks, AK', 19101: 'Fairfield, IA', 27091: 'Fairmont, MN', 54049: 'Fairmont, WV', 32001: 'Fallon, NV', 27027: 'Fargo, ND', 38017: 'Fargo, ND', 27131: 'Faribault, MN', 29187: 'Farmington, MO', 35045: 'Farmington, NM', 37051: 'Fayetteville, NC', 37085: 'Fayetteville, NC', 37093: 'Fayetteville, NC', 5007: 'Fayetteville, AR', 5087: 'Fayetteville, AR', 5143: 'Fayetteville, AR', 27111: 'Fergus Falls, MN', 32019: 'Fernley, NV', 39063: 'Findlay, OH', 13017: 'Fitzgerald, GA', 4005: 'Flagstaff, AZ', 26049: 'Flint, MI', 45031: 'Florence, SC', 45041: 'Florence, SC', 1033: 'Florence, AL', 1077: 'Florence, AL', 55039: 'Fond du Lac, WI', 37161: 'Forest City, NC', 5123: 'Forrest City, AR', 8069: 'Fort Collins, CO', 19187: 'Fort Dodge, IA', 29169: 'Fort Leonard Wood, MO', 17067: 'Fort Madison, IA', 19111: 'Fort Madison, IA', 29045: 'Fort Madison, IA', 8087: 'Fort Morgan, CO', 1049: 'Fort Payne, AL', 22115: 'Fort Polk South, LA', 5033: 'Fort Smith, AR', 5047: 'Fort Smith, AR', 5131: 'Fort Smith, AR', 40135: 'Fort Smith, AR', 18003: 'Fort Wayne, IN', 18183: 'Fort Wayne, IN', 18023: 'Frankfort, IN', 21005: 'Frankfort, KY', 21073: 'Frankfort, KY', 48171: 'Fredericksburg, TX', 17177: 'Freeport, IL', 31053: 'Fremont, NE', 39143: 'Fremont, OH', 6019: 'Fresno, CA', 1055: 'Gadsden, AL', 45021: 'Gaffney, SC', 12001: 'Gainesville, FL', 12041: 'Gainesville, FL', 12075: 'Gainesville, FL', 13139: 'Gainesville, GA', 48097: 'Gainesville, TX', 17095: 'Galesburg, IL', 35031: 'Gallup, NM', 20055: 'Garden City, KS', 20093: 'Garden City, KS', 32005: 'Gardnerville Ranchos, NV', 45043: 'Georgetown, SC', 42001: 'Gettysburg, PA', 56005: 'Gillette, WY', 56011: 'Gillette, WY', 56045: 'Gillette, WY', 21009: 'Glasgow, KY', 21169: 'Glasgow, KY', 36113: 'Glens Falls, NY', 36115: 'Glens Falls, NY', 8045: 'Glenwood Springs, CO', 8097: 'Glenwood Springs, CO', 36035: 'Gloversville, NY', 37191: 'Goldsboro, NC', 48221: 'Granbury, TX', 27119: 'Grand Forks, ND', 38035: 'Grand Forks, ND', 31079: 'Grand Island, NE', 31093: 'Grand Island, NE', 31121: 'Grand Island, NE', 8077: 'Grand Junction, CO', 27061: 'Grand Rapids, MN', 26067: 'Grand Rapids, MI', 26081: 'Grand Rapids, MI', 26117: 'Grand Rapids, MI', 26139: 'Grand Rapids, MI', 35006: 'Grants, NM', 41033: 'Grants Pass, OR', 20009: 'Great Bend, KS', 30013: 'Great Falls, MT', 8123: 'Greeley, CO', 55009: 'Green Bay, WI', 55061: 'Green Bay, WI', 55083: 'Green Bay, WI', 47059: 'Greeneville, TN', 37081: 'Greensboro, NC', 37151: 'Greensboro, NC', 37157: 'Greensboro, NC', 18031: 'Greensburg, IN', 28151: 'Greenville, MS', 37147: 'Greenville, NC', 39037: 'Greenville, OH', 45007: 'Greenville, SC', 45045: 'Greenville, SC', 45059: 'Greenville, SC', 45077: 'Greenville, SC', 28015: 'Greenwood, MS', 28083: 'Greenwood, MS', 45047: 'Greenwood, SC', 28043: 'Grenada, MS', 72015: 'Guayama, PR', 72057: 'Guayama, PR', 72109: 'Guayama, PR', 28045: 'Gulfport, MS', 28047: 'Gulfport, MS', 28059: 'Gulfport, MS', 28131: 'Gulfport, MS', 40139: 'Guymon, OK', 24043: 'Hagerstown, MD', 54003: 'Hagerstown, MD', 54065: 'Hagerstown, MD', 16013: 'Hailey, ID', 16025: 'Hailey, ID', 22105: 'Hammond, LA', 6031: 'Hanford, CA', 29127: 'Hannibal, MO', 29173: 'Hannibal, MO', 42041: 'Harrisburg, PA', 42043: 'Harrisburg, PA', 42099: 'Harrisburg, PA', 5009: 'Harrison, AR', 5101: 'Harrison, AR', 51165: 'Harrisonburg, VA', 51660: 'Harrisonburg, VA', 9003: 'Hartford, CT', 9007: 'Hartford, CT', 9013: 'Hartford, CT', 31001: 'Hastings, NE', 28031: 'Hattiesburg, MS', 28035: 'Hattiesburg, MS', 28073: 'Hattiesburg, MS', 28111: 'Hattiesburg, MS', 20051: 'Hays, KS', 49043: 'Heber, UT', 49051: 'Heber, UT', 30043: 'Helena, MT', 30049: 'Helena, MT', 5107: 'Helena, AR', 37181: 'Henderson, NC', 48117: 'Hereford, TX', 41049: 'Hermiston, OR', 41059: 'Hermiston, OR', 37003: 'Hickory, NC', 37023: 'Hickory, NC', 37027: 'Hickory, NC', 37035: 'Hickory, NC', 26059: 'Hillsdale, MI', 15001: 'Hilo, HI', 45013: 'Hilton Head Island, SC', 45053: 'Hilton Head Island, SC', 13179: 'Hinesville, GA', 13183: 'Hinesville, GA', 35025: 'Hobbs, NM', 26005: 'Holland, MI', 12017: 'Homosassa Springs, FL', 41027: 'Hood River, OR', 5057: 'Hope, AR', 5099: 'Hope, AR', 5051: 'Hot Springs, AR', 26061: 'Houghton, MI', 26083: 'Houghton, MI', 22057: 'Houma, LA', 22109: 'Houma, LA', 48015: 'Houston, TX', 48039: 'Houston, TX', 48071: 'Houston, TX', 48157: 'Houston, TX', 48167: 'Houston, TX', 48201: 'Houston, TX', 48291: 'Houston, TX', 48339: 'Houston, TX', 48473: 'Houston, TX', 36021: 'Hudson, NY', 42061: 'Huntingdon, PA', 18069: 'Huntington, IN', 21019: 'Huntington, WV', 21043: 'Huntington, WV', 21089: 'Huntington, WV', 39087: 'Huntington, WV', 54011: 'Huntington, WV', 54079: 'Huntington, WV', 54099: 'Huntington, WV', 1083: 'Huntsville, AL', 1089: 'Huntsville, AL', 48471: 'Huntsville, TX', 46005: 'Huron, SD', 46073: 'Huron, SD', 20155: 'Hutchinson, KS', 27085: 'Hutchinson, MN', 16019: 'Idaho Falls, ID', 16023: 'Idaho Falls, ID', 16051: 'Idaho Falls, ID', 42063: 'Indiana, PA', 18011: 'Indianapolis, IN', 18013: 'Indianapolis, IN', 18057: 'Indianapolis, IN', 18059: 'Indianapolis, IN', 18063: 'Indianapolis, IN', 18081: 'Indianapolis, IN', 18095: 'Indianapolis, IN', 18097: 'Indianapolis, IN', 18109: 'Indianapolis, IN', 18133: 'Indianapolis, IN', 18145: 'Indianapolis, IN', 28133: 'Indianola, MS', 19103: 'Iowa City, IA', 19183: 'Iowa City, IA', 26043: 'Iron Mountain, MI', 55037: 'Iron Mountain, MI', 36109: 'Ithaca, NY', 26075: 'Jackson, MI', 28029: 'Jackson, MS', 28049: 'Jackson, MS', 28051: 'Jackson, MS', 28089: 'Jackson, MS', 28121: 'Jackson, MS', 28127: 'Jackson, MS', 28163: 'Jackson, MS', 39079: 'Jackson, OH', 47023: 'Jackson, TN', 47033: 'Jackson, TN', 47053: 'Jackson, TN', 47113: 'Jackson, TN', 16081: 'Jackson, WY', 56039: 'Jackson, WY', 12003: 'Jacksonville, FL', 12019: 'Jacksonville, FL', 12031: 'Jacksonville, FL', 12089: 'Jacksonville, FL', 12109: 'Jacksonville, FL', 17137: 'Jacksonville, IL', 17171: 'Jacksonville, IL', 37133: 'Jacksonville, NC', 48073: 'Jacksonville, TX', 38093: 'Jamestown, ND', 36013: 'Jamestown, NY', 55105: 'Janesville, WI', 1127: 'Jasper, AL', 18037: 'Jasper, IN', 18125: 'Jasper, IN', 72073: 'Jayuya, PR', 13157: 'Jefferson, GA', 29027: 'Jefferson City, MO', 29051: 'Jefferson City, MO', 29135: 'Jefferson City, MO', 29151: 'Jefferson City, MO', 22053: 'Jennings, LA', 13305: 'Jesup, GA', 47019: 'Johnson City, TN', 47171: 'Johnson City, TN', 47179: 'Johnson City, TN', 42021: 'Johnstown, PA', 5031: 'Jonesboro, AR', 5111: 'Jonesboro, AR', 29097: 'Joplin, MO', 29145: 'Joplin, MO', 2110: 'Juneau, AK', 15009: 'Kahului, HI', 26077: 'Kalamazoo, MI', 30029: 'Kalispell, MT', 17091: 'Kankakee, IL', 20091: 'Kansas City, MO', 20103: 'Kansas City, MO', 20107: 'Kansas City, MO', 20121: 'Kansas City, MO', 20209: 'Kansas City, MO', 29013: 'Kansas City, MO', 29025: 'Kansas City, MO', 29037: 'Kansas City, MO', 29047: 'Kansas City, MO', 29049: 'Kansas City, MO', 29095: 'Kansas City, MO', 29107: 'Kansas City, MO', 29165: 'Kansas City, MO', 29177: 'Kansas City, MO', 15007: 'Kapaa, HI', 31019: 'Kearney, NE', 31099: 'Kearney, NE', 33005: 'Keene, NH', 18113: 'Kendallville, IN', 29069: 'Kennett, MO', 53005: 'Kennewick, WA', 53021: 'Kennewick, WA', 48265: 'Kerrville, TX', 2130: 'Ketchikan, AK', 12087: 'Key West, FL', 37055: 'Kill Devil Hills, NC', 48027: 'Killeen, TX', 48099: 'Killeen, TX', 48281: 'Killeen, TX', 47073: 'Kingsport, TN', 47163: 'Kingsport, TN', 51169: 'Kingsport, TN', 51191: 'Kingsport, TN', 51520: 'Kingsport, TN', 36111: 'Kingston, NY', 48261: 'Kingsville, TX', 48273: 'Kingsville, TX', 37107: 'Kinston, NC', 29001: 'Kirksville, MO', 29197: 'Kirksville, MO', 41035: 'Klamath Falls, OR', 47001: 'Knoxville, TN', 47009: 'Knoxville, TN', 47013: 'Knoxville, TN', 47093: 'Knoxville, TN', 47105: 'Knoxville, TN', 47129: 'Knoxville, TN', 47145: 'Knoxville, TN', 47173: 'Knoxville, TN', 18067: 'Kokomo, IN', 33001: 'Laconia, NH', 27055: 'La Crosse, WI', 55063: 'La Crosse, WI', 22001: 'Lafayette, LA', 22045: 'Lafayette, LA', 22055: 'Lafayette, LA', 22099: 'Lafayette, LA', 22113: 'Lafayette, LA', 18007: 'Lafayette, IN', 18015: 'Lafayette, IN', 18157: 'Lafayette, IN', 18171: 'Lafayette, IN', 41061: 'La Grande, OR', 1017: 'LaGrange, GA', 13285: 'LaGrange, GA', 22019: 'Lake Charles, LA', 22023: 'Lake Charles, LA', 12023: 'Lake City, FL', 4015: 'Lake Havasu City, AZ', 12105: 'Lakeland, FL', 48115: 'Lamesa, TX', 42071: 'Lancaster, PA', 26037: 'Lansing, MI', 26045: 'Lansing, MI', 26065: 'Lansing, MI', 26155: 'Lansing, MI', 56001: 'Laramie, WY', 48479: 'Laredo, TX', 35013: 'Las Cruces, NM', 35033: 'Las Vegas, NM', 35047: 'Las Vegas, NM', 32003: 'Las Vegas, NV', 28061: 'Laurel, MS', 28067: 'Laurel, MS', 37165: 'Laurinburg, NC', 20045: 'Lawrence, KS', 47099: 'Lawrenceburg, TN', 40031: 'Lawton, OK', 40033: 'Lawton, OK', 29105: 'Lebanon, MO', 33009: 'Lebanon, NH', 33019: 'Lebanon, NH', 50017: 'Lebanon, NH', 50027: 'Lebanon, NH', 42075: 'Lebanon, PA', 48219: 'Levelland, TX', 42119: 'Lewisburg, PA', 47117: 'Lewisburg, TN', 16069: 'Lewiston, ID', 53003: 'Lewiston, ID', 23001: 'Lewiston, ME', 42087: 'Lewistown, PA', 31047: 'Lexington, NE', 31073: 'Lexington, NE', 21017: 'Lexington, KY', 21049: 'Lexington, KY', 21067: 'Lexington, KY', 21113: 'Lexington, KY', 21209: 'Lexington, KY', 21239: 'Lexington, KY', 20175: 'Liberal, KS', 39003: 'Lima, OH', 17107: 'Lincoln, IL', 31109: 'Lincoln, NE', 31159: 'Lincoln, NE', 5045: 'Little Rock, AR', 5053: 'Little Rock, AR', 5085: 'Little Rock, AR', 5105: 'Little Rock, AR', 5119: 'Little Rock, AR', 5125: 'Little Rock, AR', 42035: 'Lock Haven, PA', 16041: 'Logan, UT', 49005: 'Logan, UT', 18017: 'Logansport, IN', 21051: 'London, KY', 21121: 'London, KY', 21125: 'London, KY', 21235: 'London, KY', 48183: 'Longview, TX', 48203: 'Longview, TX', 48401: 'Longview, TX', 48459: 'Longview, TX', 53015: 'Longview, WA', 35028: 'Los Alamos, NM', 6059: 'Los Angeles, CA', 6037: 'Los Angeles, CA', 18019: 'Louisville/Jefferson County, KY', 18043: 'Louisville/Jefferson County, KY', 18061: 'Louisville/Jefferson County, KY', 18175: 'Louisville/Jefferson County, KY', 21029: 'Louisville/Jefferson County, KY', 21103: 'Louisville/Jefferson County, KY', 21111: 'Louisville/Jefferson County, KY', 21185: 'Louisville/Jefferson County, KY', 21211: 'Louisville/Jefferson County, KY', 21215: 'Louisville/Jefferson County, KY', 48107: 'Lubbock, TX', 48303: 'Lubbock, TX', 48305: 'Lubbock, TX', 26105: 'Ludington, MI', 48005: 'Lufkin, TX', 37155: 'Lumberton, NC', 51009: 'Lynchburg, VA', 51011: 'Lynchburg, VA', 51019: 'Lynchburg, VA', 51031: 'Lynchburg, VA', 51680: 'Lynchburg, VA', 17109: 'Macomb, IL', 13021: 'Macon, GA', 13079: 'Macon, GA', 13169: 'Macon, GA', 13207: 'Macon, GA', 13289: 'Macon, GA', 6039: 'Madera, CA', 18077: 'Madison, IN', 55021: 'Madison, WI', 55025: 'Madison, WI', 55045: 'Madison, WI', 55049: 'Madison, WI', 21107: 'Madisonville, KY', 5027: 'Magnolia, AR', 36033: 'Malone, NY', 5059: 'Malvern, AR', 33011: 'Manchester, NH', 20061: 'Manhattan, KS', 20149: 'Manhattan, KS', 20161: 'Manhattan, KS', 55071: 'Manitowoc, WI', 27013: 'Mankato, MN', 27103: 'Mankato, MN', 39139: 'Mansfield, OH', 39167: 'Marietta, OH', 26109: 'Marinette, WI', 55075: 'Marinette, WI', 18053: 'Marion, IN', 37111: 'Marion, NC', 39101: 'Marion, OH', 26103: 'Marquette, MI', 27083: 'Marshall, MN', 29195: 'Marshall, MO', 19127: 'Marshalltown, IA', 47183: 'Martin, TN', 51089: 'Martinsville, VA', 51690: 'Martinsville, VA', 29147: 'Maryville, MO', 19033: 'Mason City, IA', 19195: 'Mason City, IA', 72067: 'Mayag\u00fcez, PR', 72083: 'Mayag\u00fcez, PR', 72097: 'Mayag\u00fcez, PR', 21083: 'Mayfield, KY', 21161: 'Maysville, KY', 40121: 'McAlester, OK', 48215: 'McAllen, TX', 28113: 'McComb, MS', 47177: 'McMinnville, TN', 20113: 'McPherson, KS', 42039: 'Meadville, PA', 41029: 'Medford, OR', 5035: 'Memphis, TN', 28033: 'Memphis, TN', 28093: 'Memphis, TN', 28137: 'Memphis, TN', 28143: 'Memphis, TN', 47047: 'Memphis, TN', 47157: 'Memphis, TN', 47167: 'Memphis, TN', 55033: 'Menomonie, WI', 6047: 'Merced, CA', 28023: 'Meridian, MS', 28069: 'Meridian, MS', 28075: 'Meridian, MS', 29007: 'Mexico, MO', 40115: 'Miami, OK', 12011: 'Miami, FL', 12086: 'Miami, FL', 12099: 'Miami, FL', 18091: 'Michigan City, IN', 21013: 'Middlesborough, KY', 26111: 'Midland, MI', 48317: 'Midland, TX', 48329: 'Midland, TX', 13009: 'Milledgeville, GA', 13141: 'Milledgeville, GA', 55079: 'Milwaukee, WI', 55089: 'Milwaukee, WI', 55131: 'Milwaukee, WI', 55133: 'Milwaukee, WI', 22119: 'Minden, LA', 48363: 'Mineral Wells, TX', 27003: 'Minneapolis, MN', 27019: 'Minneapolis, MN', 27025: 'Minneapolis, MN', 27037: 'Minneapolis, MN', 27053: 'Minneapolis, MN', 27059: 'Minneapolis, MN', 27079: 'Minneapolis, MN', 27095: 'Minneapolis, MN', 27123: 'Minneapolis, MN', 27139: 'Minneapolis, MN', 27141: 'Minneapolis, MN', 27163: 'Minneapolis, MN', 27171: 'Minneapolis, MN', 55093: 'Minneapolis, MN', 55109: 'Minneapolis, MN', 38049: 'Minot, ND', 38075: 'Minot, ND', 38101: 'Minot, ND', 30063: 'Missoula, MT', 46035: 'Mitchell, SD', 46061: 'Mitchell, SD', 29175: 'Moberly, MO', 1097: 'Mobile, AL', 1129: 'Mobile, AL', 6099: 'Modesto, CA', 22067: 'Monroe, LA', 22073: 'Monroe, LA', 22111: 'Monroe, LA', 26115: 'Monroe, MI', 1001: 'Montgomery, AL', 1051: 'Montgomery, AL', 1085: 'Montgomery, AL', 1101: 'Montgomery, AL', 8085: 'Montrose, CO', 8091: 'Montrose, CO', 37031: 'Morehead City, NC', 22101: 'Morgan City, LA', 54061: 'Morgantown, WV', 54077: 'Morgantown, WV', 47057: 'Morristown, TN', 47063: 'Morristown, TN', 47089: 'Morristown, TN', 16057: 'Moscow, ID', 53025: 'Moses Lake, WA', 13071: 'Moultrie, GA', 5005: 'Mountain Home, AR', 16039: 'Mountain Home, ID', 37171: 'Mount Airy, NC', 54045: 'Mount Gay, WV', 26073: 'Mount Pleasant, MI', 48063: 'Mount Pleasant, TX', 48449: 'Mount Pleasant, TX', 21011: 'Mount Sterling, KY', 21165: 'Mount Sterling, KY', 21173: 'Mount Sterling, KY', 17081: 'Mount Vernon, IL', 39083: 'Mount Vernon, OH', 53057: 'Mount Vernon, WA', 18035: 'Muncie, IN', 21035: 'Murray, KY', 19139: 'Muscatine, IA', 26121: 'Muskegon, MI', 40101: 'Muskogee, OK', 37019: 'Myrtle Beach, SC', 45051: 'Myrtle Beach, SC', 48347: 'Nacogdoches, TX', 6055: 'Napa, CA', 12021: 'Naples, FL', 47015: 'Nashville, TN', 47021: 'Nashville, TN', 47037: 'Nashville, TN', 47043: 'Nashville, TN', 47111: 'Nashville, TN', 47119: 'Nashville, TN', 47147: 'Nashville, TN', 47149: 'Nashville, TN', 47159: 'Nashville, TN', 47165: 'Nashville, TN', 47169: 'Nashville, TN', 47187: 'Nashville, TN', 47189: 'Nashville, TN', 22029: 'Natchez, MS', 28001: 'Natchez, MS', 22069: 'Natchitoches, LA', 37049: 'New Bern, NC', 37103: 'New Bern, NC', 37137: 'New Bern, NC', 45071: 'Newberry, SC', 18065: 'New Castle, IN', 42073: 'New Castle, PA', 9009: 'New Haven, CT', 22051: 'New Orleans, LA', 22071: 'New Orleans, LA', 22075: 'New Orleans, LA', 22087: 'New Orleans, LA', 22089: 'New Orleans, LA', 22093: 'New Orleans, LA', 22095: 'New Orleans, LA', 22103: 'New Orleans, LA', 39157: 'New Philadelphia, OH', 41041: 'Newport, OR', 47029: 'Newport, TN', 27015: 'New Ulm, MN', 36059: 'New York, NY', 36103: 'New York, NY', 34013: 'New York, NY', 34019: 'New York, NY', 34027: 'New York, NY', 34037: 'New York, NY', 34039: 'New York, NY', 42103: 'New York, NY', 34023: 'New York, NY', 34025: 'New York, NY', 34029: 'New York, NY', 34035: 'New York, NY', 34003: 'New York, NY', 34017: 'New York, NY', 34031: 'New York, NY', 36005: 'New York, NY', 36047: 'New York, NY', 36061: 'New York, NY', 36079: 'New York, NY', 36081: 'New York, NY', 36085: 'New York, NY', 36087: 'New York, NY', 36119: 'New York, NY', 26021: 'Niles, MI', 4023: 'Nogales, AZ', 31119: 'Norfolk, NE', 31139: 'Norfolk, NE', 31167: 'Norfolk, NE', 31111: 'North Platte, NE', 31113: 'North Platte, NE', 31117: 'North Platte, NE', 12081: 'North Port, FL', 12115: 'North Port, FL', 18079: 'North Vernon, IN', 37193: 'North Wilkesboro, NC', 39077: 'Norwalk, OH', 9011: 'Norwich, CT', 53029: 'Oak Harbor, WA', 12083: 'Ocala, FL', 34009: 'Ocean City, NJ', 48135: 'Odessa, TX', 49003: 'Ogden, UT', 49011: 'Ogden, UT', 49029: 'Ogden, UT', 49057: 'Ogden, UT', 36089: 'Ogdensburg, NY', 42121: 'Oil City, PA', 12093: 'Okeechobee, FL', 40017: 'Oklahoma City, OK', 40027: 'Oklahoma City, OK', 40051: 'Oklahoma City, OK', 40081: 'Oklahoma City, OK', 40083: 'Oklahoma City, OK', 40087: 'Oklahoma City, OK', 40109: 'Oklahoma City, OK', 36009: 'Olean, NY', 53067: 'Olympia, WA', 19085: 'Omaha, NE', 19129: 'Omaha, NE', 19155: 'Omaha, NE', 31025: 'Omaha, NE', 31055: 'Omaha, NE', 31153: 'Omaha, NE', 31155: 'Omaha, NE', 31177: 'Omaha, NE', 36077: 'Oneonta, NY', 16075: 'Ontario, OR', 41045: 'Ontario, OR', 22097: 'Opelousas, LA', 45075: 'Orangeburg, SC', 12069: 'Orlando, FL', 12095: 'Orlando, FL', 12097: 'Orlando, FL', 12117: 'Orlando, FL', 55139: 'Oshkosh, WI', 19123: 'Oskaloosa, IA', 53001: 'Othello, WA', 17011: 'Ottawa, IL', 17099: 'Ottawa, IL', 17155: 'Ottawa, IL', 20059: 'Ottawa, KS', 19179: 'Ottumwa, IA', 27147: 'Owatonna, MN', 21059: 'Owensboro, KY', 21091: 'Owensboro, KY', 21149: 'Owensboro, KY', 28071: 'Oxford, MS', 6111: 'Oxnard, CA', 1045: 'Ozark, AL', 17127: 'Paducah, KY', 21007: 'Paducah, KY', 21139: 'Paducah, KY', 21145: 'Paducah, KY', 32023: 'Pahrump, NV', 12107: 'Palatka, FL', 48001: 'Palestine, TX', 12009: 'Palm Bay, FL', 48179: 'Pampa, TX', 48393: 'Pampa, TX', 12005: 'Panama City, FL', 5055: 'Paragould, AR', 47079: 'Paris, TN', 48277: 'Paris, TX', 54105: 'Parkersburg, WV', 54107: 'Parkersburg, WV', 20099: 'Parsons, KS', 4007: 'Payson, AZ', 48163: 'Pearsall, TX', 48301: 'Pecos, TX', 48389: 'Pecos, TX', 19125: 'Pella, IA', 12033: 'Pensacola, FL', 12113: 'Pensacola, FL', 17057: 'Peoria, IL', 17123: 'Peoria, IL', 17143: 'Peoria, IL', 17175: 'Peoria, IL', 17179: 'Peoria, IL', 17203: 'Peoria, IL', 18103: 'Peru, IN', 34005: 'Philadelphia, PA', 34007: 'Philadelphia, PA', 34015: 'Philadelphia, PA', 42017: 'Philadelphia, PA', 42029: 'Philadelphia, PA', 42091: 'Philadelphia, PA', 42045: 'Philadelphia, PA', 42101: 'Philadelphia, PA', 10003: 'Philadelphia, PA', 24015: 'Philadelphia, PA', 34033: 'Philadelphia, PA', 4013: 'Phoenix, AZ', 4021: 'Phoenix, AZ', 28109: 'Picayune, MS', 46065: 'Pierre, SD', 46117: 'Pierre, SD', 5025: 'Pine Bluff, AR', 5069: 'Pine Bluff, AR', 5079: 'Pine Bluff, AR', 37125: 'Pinehurst, NC', 20037: 'Pittsburg, KS', 42003: 'Pittsburgh, PA', 42005: 'Pittsburgh, PA', 42007: 'Pittsburgh, PA', 42019: 'Pittsburgh, PA', 42051: 'Pittsburgh, PA', 42125: 'Pittsburgh, PA', 42129: 'Pittsburgh, PA', 25003: 'Pittsfield, MA', 48189: 'Plainview, TX', 55043: 'Platteville, WI', 36019: 'Plattsburgh, NY', 18099: 'Plymouth, IN', 16005: 'Pocatello, ID', 16077: 'Pocatello, ID', 39053: 'Point Pleasant, WV', 54053: 'Point Pleasant, WV', 40071: 'Ponca City, OK', 72001: 'Ponce, PR', 72075: 'Ponce, PR', 72113: 'Ponce, PR', 72149: 'Ponce, PR', 17105: 'Pontiac, IL', 29023: 'Poplar Bluff, MO', 29181: 'Poplar Bluff, MO', 35041: 'Portales, NM', 53009: 'Port Angeles, WA', 23005: 'Portland, ME', 23023: 'Portland, ME', 23031: 'Portland, ME', 41005: 'Portland, OR', 41009: 'Portland, OR', 41051: 'Portland, OR', 41067: 'Portland, OR', 41071: 'Portland, OR', 53011: 'Portland, OR', 53059: 'Portland, OR', 48057: 'Port Lavaca, TX', 12085: 'Port St. Lucie, FL', 12111: 'Port St. Lucie, FL', 39145: 'Portsmouth, OH', 42107: 'Pottsville, PA', 36027: 'Poughkeepsie, NY', 36071: 'Poughkeepsie, NY', 4025: 'Prescott Valley, AZ', 49007: 'Price, UT', 41013: 'Prineville, OR', 25005: 'Providence, RI', 44001: 'Providence, RI', 44003: 'Providence, RI', 44005: 'Providence, RI', 44007: 'Providence, RI', 44009: 'Providence, RI', 49023: 'Provo, UT', 49049: 'Provo, UT', 8101: 'Pueblo, CO', 53075: 'Pullman, WA', 12015: 'Punta Gorda, FL', 17001: 'Quincy, IL', 29111: 'Quincy, IL', 55101: 'Racine, WI', 37069: 'Raleigh, NC', 37101: 'Raleigh, NC', 37183: 'Raleigh, NC', 46093: 'Rapid City, SD', 46103: 'Rapid City, SD', 48489: 'Raymondville, TX', 42011: 'Reading, PA', 6103: 'Red Bluff, CA', 6089: 'Redding, CA', 27049: 'Red Wing, MN', 32029: 'Reno, NV', 32031: 'Reno, NV', 16043: 'Rexburg, ID', 16065: 'Rexburg, ID', 18177: 'Richmond, IN', 51007: 'Richmond, VA', 51036: 'Richmond, VA', 51041: 'Richmond, VA', 51053: 'Richmond, VA', 51075: 'Richmond, VA', 51085: 'Richmond, VA', 51087: 'Richmond, VA', 51097: 'Richmond, VA', 51101: 'Richmond, VA', 51127: 'Richmond, VA', 51145: 'Richmond, VA', 51149: 'Richmond, VA', 51183: 'Richmond, VA', 51570: 'Richmond, VA', 51670: 'Richmond, VA', 51730: 'Richmond, VA', 51760: 'Richmond, VA', 21065: 'Richmond, KY', 21151: 'Richmond, KY', 48427: 'Rio Grande City, TX', 6065: 'Riverside, CA', 6071: 'Riverside, CA', 56013: 'Riverton, WY', 51023: 'Roanoke, VA', 51045: 'Roanoke, VA', 51067: 'Roanoke, VA', 51161: 'Roanoke, VA', 51770: 'Roanoke, VA', 51775: 'Roanoke, VA', 37083: 'Roanoke Rapids, NC', 37131: 'Roanoke Rapids, NC', 17141: 'Rochelle, IL', 27039: 'Rochester, MN', 27045: 'Rochester, MN', 27109: 'Rochester, MN', 27157: 'Rochester, MN', 36051: 'Rochester, NY', 36055: 'Rochester, NY', 36069: 'Rochester, NY', 36073: 'Rochester, NY', 36117: 'Rochester, NY', 36123: 'Rochester, NY', 17007: 'Rockford, IL', 17201: 'Rockford, IL', 37153: 'Rockingham, NC', 48007: 'Rockport, TX', 56037: 'Rock Springs, WY', 37065: 'Rocky Mount, NC', 37127: 'Rocky Mount, NC', 29161: 'Rolla, MO', 13115: 'Rome, GA', 41019: 'Roseburg, OR', 35005: 'Roswell, NM', 35027: 'Ruidoso, NM', 5115: 'Russellville, AR', 5149: 'Russellville, AR', 22061: 'Ruston, LA', 50021: 'Rutland, VT', 6017: 'Sacramento, CA', 6061: 'Sacramento, CA', 6067: 'Sacramento, CA', 6113: 'Sacramento, CA', 4009: 'Safford, AZ', 26145: 'Saginaw, MI', 27009: 'St. Cloud, MN', 27145: 'St. Cloud, MN', 49053: 'St. George, UT', 20043: 'St. Joseph, MO', 29003: 'St. Joseph, MO', 29021: 'St. Joseph, MO', 29063: 'St. Joseph, MO', 17005: 'St. Louis, MO', 17013: 'St. Louis, MO', 17027: 'St. Louis, MO', 17083: 'St. Louis, MO', 17117: 'St. Louis, MO', 17119: 'St. Louis, MO', 17133: 'St. Louis, MO', 17163: 'St. Louis, MO', 29071: 'St. Louis, MO', 29099: 'St. Louis, MO', 29113: 'St. Louis, MO', 29183: 'St. Louis, MO', 29189: 'St. Louis, MO', 29219: 'St. Louis, MO', 29510: 'St. Louis, MO', 13039: 'St. Marys, GA', 42047: 'St. Marys, PA', 39029: 'Salem, OH', 41047: 'Salem, OR', 41053: 'Salem, OR', 20143: 'Salina, KS', 20169: 'Salina, KS', 6053: 'Salinas, CA', 10005: 'Salisbury, MD', 24039: 'Salisbury, MD', 24045: 'Salisbury, MD', 24047: 'Salisbury, MD', 49035: 'Salt Lake City, UT', 49045: 'Salt Lake City, UT', 48235: 'San Angelo, TX', 48431: 'San Angelo, TX', 48451: 'San Angelo, TX', 48013: 'San Antonio, TX', 48019: 'San Antonio, TX', 48029: 'San Antonio, TX', 48091: 'San Antonio, TX', 48187: 'San Antonio, TX', 48259: 'San Antonio, TX', 48325: 'San Antonio, TX', 48493: 'San Antonio, TX', 6073: 'San Diego, CA', 16017: 'Sandpoint, ID', 39043: 'Sandusky, OH', 37105: 'Sanford, NC', 6001: 'San Francisco, CA', 6013: 'San Francisco, CA', 6075: 'San Francisco, CA', 6081: 'San Francisco, CA', 6041: 'San Francisco, CA', 72023: 'San Germ\u00e1n, PR', 72079: 'San Germ\u00e1n, PR', 72121: 'San Germ\u00e1n, PR', 72125: 'San Germ\u00e1n, PR', 6069: 'San Jose, CA', 6085: 'San Jose, CA', 72007: 'San Juan, PR', 72009: 'San Juan, PR', 72017: 'San Juan, PR', 72019: 'San Juan, PR', 72021: 'San Juan, PR', 72025: 'San Juan, PR', 72029: 'San Juan, PR', 72031: 'San Juan, PR', 72033: 'San Juan, PR', 72035: 'San Juan, PR', 72037: 'San Juan, PR', 72039: 'San Juan, PR', 72041: 'San Juan, PR', 72045: 'San Juan, PR', 72047: 'San Juan, PR', 72051: 'San Juan, PR', 72053: 'San Juan, PR', 72054: 'San Juan, PR', 72061: 'San Juan, PR', 72063: 'San Juan, PR', 72069: 'San Juan, PR', 72077: 'San Juan, PR', 72085: 'San Juan, PR', 72087: 'San Juan, PR', 72089: 'San Juan, PR', 72091: 'San Juan, PR', 72095: 'San Juan, PR', 72101: 'San Juan, PR', 72103: 'San Juan, PR', 72105: 'San Juan, PR', 72107: 'San Juan, PR', 72119: 'San Juan, PR', 72127: 'San Juan, PR', 72129: 'San Juan, PR', 72135: 'San Juan, PR', 72137: 'San Juan, PR', 72139: 'San Juan, PR', 72143: 'San Juan, PR', 72145: 'San Juan, PR', 72151: 'San Juan, PR', 6079: 'San Luis Obispo, CA', 6087: 'Santa Cruz, CA', 35049: 'Santa Fe, NM', 72133: 'Santa Isabel, PR', 6083: 'Santa Maria, CA', 6097: 'Santa Rosa, CA', 26033: 'Sault Ste. Marie, MI', 13029: 'Savannah, GA', 13051: 'Savannah, GA', 13103: 'Savannah, GA', 42015: 'Sayre, PA', 31007: 'Scottsbluff, NE', 31157: 'Scottsbluff, NE', 31165: 'Scottsbluff, NE', 1071: 'Scottsboro, AL', 18143: 'Scottsburg, IN', 42069: 'Scranton, PA', 42079: 'Scranton, PA', 42131: 'Scranton, PA', 5145: 'Searcy, AR', 53033: 'Seattle, WA', 53061: 'Seattle, WA', 53053: 'Seattle, WA', 12061: 'Sebastian, FL', 12055: 'Sebring, FL', 29159: 'Sedalia, MO', 42109: 'Selinsgrove, PA', 1047: 'Selma, AL', 45073: 'Seneca, SC', 36099: 'Seneca Falls, NY', 47155: 'Sevierville, TN', 18071: 'Seymour, IN', 55078: 'Shawano, WI', 55115: 'Shawano, WI', 40125: 'Shawnee, OK', 55117: 'Sheboygan, WI', 37045: 'Shelby, NC', 47003: 'Shelbyville, TN', 53045: 'Shelton, WA', 56033: 'Sheridan, WY', 48181: 'Sherman, TX', 4017: 'Show Low, AZ', 22015: 'Shreveport, LA', 22017: 'Shreveport, LA', 22031: 'Shreveport, LA', 39149: 'Sidney, OH', 4003: 'Sierra Vista, AZ', 29201: 'Sikeston, MO', 35017: 'Silver City, NM', 19193: 'Sioux City, IA', 31043: 'Sioux City, IA', 31051: 'Sioux City, IA', 46127: 'Sioux City, IA', 46083: 'Sioux Falls, SD', 46087: 'Sioux Falls, SD', 46099: 'Sioux Falls, SD', 46125: 'Sioux Falls, SD', 48415: 'Snyder, TX', 21199: 'Somerset, KY', 42111: 'Somerset, PA', 6109: 'Sonora, CA', 18141: 'South Bend, IN', 26027: 'South Bend, IN', 45083: 'Spartanburg, SC', 46081: 'Spearfish, SD', 19041: 'Spencer, IA', 19059: 'Spirit Lake, IA', 53063: 'Spokane, WA', 53065: 'Spokane, WA', 17129: 'Springfield, IL', 17167: 'Springfield, IL', 25011: 'Springfield, MA', 25013: 'Springfield, MA', 25015: 'Springfield, MA', 29043: 'Springfield, MO', 29059: 'Springfield, MO', 29077: 'Springfield, MO', 29167: 'Springfield, MO', 29225: 'Springfield, MO', 39023: 'Springfield, OH', 28105: 'Starkville, MS', 28155: 'Starkville, MS', 42027: 'State College, PA', 13031: 'Statesboro, GA', 51015: 'Staunton, VA', 51790: 'Staunton, VA', 51820: 'Staunton, VA', 8107: 'Steamboat Springs, CO', 48143: 'Stephenville, TX', 8075: 'Sterling, CO', 17195: 'Sterling, IL', 55097: 'Stevens Point, WI', 40119: 'Stillwater, OK', 6077: 'Stockton, CA', 19021: 'Storm Lake, IA', 26149: 'Sturgis, MI', 48223: 'Sulphur Springs, TX', 13055: 'Summerville, GA', 45027: 'Sumter, SC', 45085: 'Sumter, SC', 42097: 'Sunbury, PA', 6035: 'Susanville, CA', 48353: 'Sweetwater, TX', 36053: 'Syracuse, NY', 36067: 'Syracuse, NY', 36075: 'Syracuse, NY', 40021: 'Tahlequah, OK', 1121: 'Talladega, AL', 12039: 'Tallahassee, FL', 12065: 'Tallahassee, FL', 12073: 'Tallahassee, FL', 12129: 'Tallahassee, FL', 12053: 'Tampa, FL', 12057: 'Tampa, FL', 12101: 'Tampa, FL', 12103: 'Tampa, FL', 35055: 'Taos, NM', 17021: 'Taylorville, IL', 18021: 'Terre Haute, IN', 18121: 'Terre Haute, IN', 18153: 'Terre Haute, IN', 18165: 'Terre Haute, IN', 18167: 'Terre Haute, IN', 5081: 'Texarkana, TX', 5091: 'Texarkana, TX', 48037: 'Texarkana, TX', 41065: 'The Dalles, OR', 12119: 'The Villages, FL', 13293: 'Thomaston, GA', 13275: 'Thomasville, GA', 39147: 'Tiffin, OH', 13277: 'Tifton, GA', 13257: 'Toccoa, GA', 39051: 'Toledo, OH', 39095: 'Toledo, OH', 39123: 'Toledo, OH', 39173: 'Toledo, OH', 20085: 'Topeka, KS', 20087: 'Topeka, KS', 20139: 'Topeka, KS', 20177: 'Topeka, KS', 20197: 'Topeka, KS', 9005: 'Torrington, CT', 26019: 'Traverse City, MI', 26055: 'Traverse City, MI', 26079: 'Traverse City, MI', 26089: 'Traverse City, MI', 34021: 'Trenton, NJ', 1109: 'Troy, AL', 6057: 'Truckee, CA', 4019: 'Tucson, AZ', 47031: 'Tullahoma, TN', 47051: 'Tullahoma, TN', 47127: 'Tullahoma, TN', 40037: 'Tulsa, OK', 40111: 'Tulsa, OK', 40113: 'Tulsa, OK', 40117: 'Tulsa, OK', 40131: 'Tulsa, OK', 40143: 'Tulsa, OK', 40145: 'Tulsa, OK', 28057: 'Tupelo, MS', 28081: 'Tupelo, MS', 28115: 'Tupelo, MS', 28117: 'Tupelo, MS', 1063: 'Tuscaloosa, AL', 1065: 'Tuscaloosa, AL', 1107: 'Tuscaloosa, AL', 1125: 'Tuscaloosa, AL', 16053: 'Twin Falls, ID', 16083: 'Twin Falls, ID', 48423: 'Tyler, TX', 6045: 'Ukiah, CA', 45087: 'Union, SC', 47131: 'Union City, TN', 39021: 'Urbana, OH', 15003: 'Urban Honolulu, HI', 36043: 'Utica, NY', 36065: 'Utica, NY', 48463: 'Uvalde, TX', 13027: 'Valdosta, GA', 13101: 'Valdosta, GA', 13173: 'Valdosta, GA', 13185: 'Valdosta, GA', 6095: 'Vallejo, CA', 39161: 'Van Wert, OH', 46027: 'Vermillion, SD', 49047: 'Vernal, UT', 48487: 'Vernon, TX', 28149: 'Vicksburg, MS', 48175: 'Victoria, TX', 48469: 'Victoria, TX', 13209: 'Vidalia, GA', 13279: 'Vidalia, GA', 18083: 'Vincennes, IN', 34011: 'Vineland, NJ', 25007: 'Vineyard Haven, MA', 37029: 'Virginia Beach, VA', 37053: 'Virginia Beach, VA', 37073: 'Virginia Beach, VA', 51073: 'Virginia Beach, VA', 51093: 'Virginia Beach, VA', 51095: 'Virginia Beach, VA', 51115: 'Virginia Beach, VA', 51175: 'Virginia Beach, VA', 51199: 'Virginia Beach, VA', 51550: 'Virginia Beach, VA', 51620: 'Virginia Beach, VA', 51650: 'Virginia Beach, VA', 51700: 'Virginia Beach, VA', 51710: 'Virginia Beach, VA', 51735: 'Virginia Beach, VA', 51740: 'Virginia Beach, VA', 51800: 'Virginia Beach, VA', 51810: 'Virginia Beach, VA', 51830: 'Virginia Beach, VA', 6107: 'Visalia, CA', 18169: 'Wabash, IN', 48145: 'Waco, TX', 48309: 'Waco, TX', 27167: 'Wahpeton, ND', 38077: 'Wahpeton, ND', 53071: 'Walla Walla, WA', 39011: 'Wapakoneta, OH', 13153: 'Warner Robins, GA', 13225: 'Warner Robins, GA', 42123: 'Warren, PA', 29101: 'Warrensburg, MO', 18085: 'Warsaw, IN', 18027: 'Washington, IN', 37013: 'Washington, NC', 24021: 'Washington, DC', 24031: 'Washington, DC', 11001: 'Washington, DC', 24009: 'Washington, DC', 24017: 'Washington, DC', 24033: 'Washington, DC', 51013: 'Washington, DC', 51043: 'Washington, DC', 51047: 'Washington, DC', 51059: 'Washington, DC', 51061: 'Washington, DC', 51107: 'Washington, DC', 51113: 'Washington, DC', 51153: 'Washington, DC', 51157: 'Washington, DC', 51177: 'Washington, DC', 51179: 'Washington, DC', 51187: 'Washington, DC', 51510: 'Washington, DC', 51600: 'Washington, DC', 51610: 'Washington, DC', 51630: 'Washington, DC', 51683: 'Washington, DC', 51685: 'Washington, DC', 54037: 'Washington, DC', 39047: 'Washington Court House, OH', 19013: 'Waterloo, IA', 19017: 'Waterloo, IA', 19075: 'Waterloo, IA', 46029: 'Watertown, SD', 46057: 'Watertown, SD', 55055: 'Watertown, WI', 36045: 'Watertown, NY', 12049: 'Wauchula, FL', 55069: 'Wausau, WI', 55073: 'Wausau, WI', 13229: 'Waycross, GA', 13299: 'Waycross, GA', 40039: 'Weatherford, OK', 39081: 'Weirton, WV', 54009: 'Weirton, WV', 54029: 'Weirton, WV', 53007: 'Wenatchee, WA', 53017: 'Wenatchee, WA', 29091: 'West Plains, MO', 28025: 'West Point, MS', 39013: 'Wheeling, WV', 54051: 'Wheeling, WV', 54069: 'Wheeling, WV', 55127: 'Whitewater, WI', 20015: 'Wichita, KS', 20079: 'Wichita, KS', 20173: 'Wichita, KS', 20191: 'Wichita, KS', 48009: 'Wichita Falls, TX', 48077: 'Wichita Falls, TX', 48485: 'Wichita Falls, TX', 42081: 'Williamsport, PA', 38105: 'Williston, ND', 27067: 'Willmar, MN', 37129: 'Wilmington, NC', 37141: 'Wilmington, NC', 39027: 'Wilmington, OH', 37195: 'Wilson, NC', 51069: 'Winchester, VA', 51840: 'Winchester, VA', 54027: 'Winchester, VA', 20035: 'Winfield, KS', 32013: 'Winnemucca, NV', 27169: 'Winona, MN', 37057: 'Winston, NC', 37059: 'Winston, NC', 37067: 'Winston, NC', 37169: 'Winston, NC', 37197: 'Winston, NC', 55141: 'Wisconsin Rapids, WI', 40045: 'Woodward, OK', 40153: 'Woodward, OK', 39169: 'Wooster, OH', 9015: 'Worcester, MA', 25027: 'Worcester, MA', 27105: 'Worthington, MN', 53077: 'Yakima, WA', 46135: 'Yankton, SD', 72055: 'Yauco, PR', 72059: 'Yauco, PR', 72111: 'Yauco, PR', 72153: 'Yauco, PR', 42133: 'York, PA', 39099: 'Youngstown, OH', 39155: 'Youngstown, OH', 42085: 'Youngstown, OH', 6101: 'Yuba City, CA', 6115: 'Yuba City, CA', 4027: 'Yuma, AZ', 39119: 'Zanesville, OH', 48505: 'Zapata, TX' }
window.addEventListener('load', viTrack.init)
