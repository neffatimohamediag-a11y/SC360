const EIA_BASE_URL = 'https://api.eia.gov/v2/seriesid'

const SERIES = {
  brent: 'PET.RBRTE.D',
  gas: 'NG.RNGWHHD.D',
}

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
    },
  })
}

function percentageChange(current, previous) {
  if (
    !Number.isFinite(current) ||
    !Number.isFinite(previous) ||
    previous === 0
  ) {
    return 0
  }

  return ((current - previous) / previous) * 100
}

function normaliseEiaRows(payload) {
  const rows = payload?.response?.data

  if (!Array.isArray(rows)) {
    return []
  }

  return rows
    .map(row => ({
      period: String(row.period ?? ''),
      value: Number(row.value),
    }))
    .filter(row => row.period && Number.isFinite(row.value))
    .sort((left, right) => right.period.localeCompare(left.period))
}

async function fetchEiaSeries(seriesId, apiKey) {
  const url = new URL(`${EIA_BASE_URL}/${seriesId}`)

  url.searchParams.set('api_key', apiKey)
  url.searchParams.set('length', '45')
  url.searchParams.set('sort[0][column]', 'period')
  url.searchParams.set('sort[0][direction]', 'desc')

  const response = await fetch(url)

  if (!response.ok) {
    throw new Error(`EIA request failed with ${response.status}`)
  }

  const rows = normaliseEiaRows(await response.json())

  if (rows.length === 0) {
    throw new Error(`EIA returned no observations for ${seriesId}`)
  }

  return rows
}

function parseCsvLine(line) {
  const values = []
  let current = ''
  let quoted = false

  for (let index = 0; index < line.length; index += 1) {
    const character = line[index]

    if (character === '"') {
      if (quoted && line[index + 1] === '"') {
        current += '"'
        index += 1
      } else {
        quoted = !quoted
      }
    } else if (character === ',' && !quoted) {
      values.push(current)
      current = ''
    } else {
      current += character
    }
  }

  values.push(current)

  return values
}

function parseEcbCsv(csv) {
  const lines = csv
    .split(/\r?\n/)
    .map(line => line.trim())
    .filter(Boolean)

  if (lines.length < 2) {
    return []
  }

  const headers = parseCsvLine(lines[0])
  const periodIndex = headers.indexOf('TIME_PERIOD')
  const valueIndex = headers.indexOf('OBS_VALUE')

  if (periodIndex < 0 || valueIndex < 0) {
    return []
  }

  return lines
    .slice(1)
    .map(line => {
      const columns = parseCsvLine(line)

      return {
        period: columns[periodIndex],
        value: Number(columns[valueIndex]),
      }
    })
    .filter(row => row.period && Number.isFinite(row.value))
    .sort((left, right) => right.period.localeCompare(left.period))
}

async function fetchEurUsd() {
  const start = new Date()
  start.setDate(start.getDate() - 75)

  const url = new URL(
    'https://data-api.ecb.europa.eu/service/data/EXR/D.USD.EUR.SP00.A',
  )

  url.searchParams.set('format', 'csvdata')
  url.searchParams.set('startPeriod', start.toISOString().slice(0, 10))

  const response = await fetch(url, {
    headers: {
      Accept: 'text/csv',
    },
  })

  if (!response.ok) {
    throw new Error(`ECB request failed with ${response.status}`)
  }

  const rows = parseEcbCsv(await response.text())

  if (rows.length === 0) {
    throw new Error('ECB returned no EUR/USD observations')
  }

  return rows
}

function driverFromRows({
  id,
  name,
  rows,
  unit,
  source,
}) {
  const current = rows[0]
  const comparison = rows[Math.min(20, rows.length - 1)]

  return {
    id,
    name,
    value: current.value,
    change: Number(
      percentageChange(current.value, comparison.value).toFixed(2),
    ),
    unit,
    source,
    updatedAt: current.period,
    status: 'live',
    history: rows
      .slice(0, 30)
      .reverse()
      .map(row => ({
        period: row.period,
        value: row.value,
      })),
  }
}

export default {
  async fetch() {
    const apiKey = process.env.EIA_API_KEY

    if (!apiKey) {
      return json(
        {
          drivers: [],
          errors: ['EIA_API_KEY is not configured in Vercel.'],
        },
        503,
      )
    }

    const results = await Promise.allSettled([
      fetchEiaSeries(SERIES.brent, apiKey),
      fetchEiaSeries(SERIES.gas, apiKey),
      fetchEurUsd(),
    ])

    const drivers = []
    const errors = []

    const [brentResult, gasResult, currencyResult] = results

    if (brentResult.status === 'fulfilled') {
      drivers.push(
        driverFromRows({
          id: 'brent',
          name: 'Brent crude',
          rows: brentResult.value,
          unit: 'USD/bbl',
          source: 'U.S. EIA',
        }),
      )
    } else {
      errors.push(`Brent: ${brentResult.reason?.message ?? 'Unavailable'}`)
    }

    if (gasResult.status === 'fulfilled') {
      drivers.push(
        driverFromRows({
          id: 'gas',
          name: 'Henry Hub natural gas',
          rows: gasResult.value,
          unit: 'USD/MMBtu',
          source: 'U.S. EIA',
        }),
      )
    } else {
      errors.push(`Natural gas: ${gasResult.reason?.message ?? 'Unavailable'}`)
    }

    if (currencyResult.status === 'fulfilled') {
      drivers.push(
        driverFromRows({
          id: 'eurusd',
          name: 'EUR/USD',
          rows: currencyResult.value,
          unit: '',
          source: 'European Central Bank',
        }),
      )
    } else {
      errors.push(`EUR/USD: ${currencyResult.reason?.message ?? 'Unavailable'}`)
    }

    if (drivers.length === 0) {
      return json(
        {
          drivers,
          errors,
          updatedAt: new Date().toISOString(),
        },
        503,
      )
    }

    return json({
      drivers,
      errors,
      updatedAt: new Date().toISOString(),
      methodology:
        'Live upstream indicators from EIA and ECB. Resin movements are calculated SC360 pressure indices, not official resin price quotations.',
    })
  },
}