import { useEffect, useMemo, useState } from 'react'

type Risk = 'Low' | 'Medium' | 'High' | 'Critical'
type Period = '30D' | '90D' | '1Y'

type DriverHistory = {
  period: string
  value: number
}

type MarketDriver = {
  id: string
  name: string
  value: number
  change: number
  unit: string
  source: string
  updatedAt: string
  status: 'live' | 'fallback'
  history?: DriverHistory[]
}

type ResinDefinition = {
  code: string
  name: string
  oilWeight: number
  gasWeight: number
  currencyWeight: number
  sensitivity: number
  recommendationUp: string
  recommendationDown: string
}

type ResinSignal = ResinDefinition & {
  change: number
  pressure: number
  risk: Risk
  history: number[]
}

const resinDefinitions: ResinDefinition[] = [
  {
    code: 'ABS',
    name: 'Acrylonitrile Butadiene Styrene',
    oilWeight: 0.5,
    gasWeight: 0.25,
    currencyWeight: 0.25,
    sensitivity: 1.2,
    recommendationUp: 'Review quotations and negotiate validity extensions.',
    recommendationDown: 'Request refreshed quotations before placing coverage.',
  },
  {
    code: 'PP',
    name: 'Polypropylene',
    oilWeight: 0.65,
    gasWeight: 0.2,
    currencyWeight: 0.15,
    sensitivity: 1,
    recommendationUp: 'Review propylene-linked supplier pricing.',
    recommendationDown: 'Use the softer signal as a negotiation opportunity.',
  },
  {
    code: 'HDPE',
    name: 'High-density Polyethylene',
    oilWeight: 0.55,
    gasWeight: 0.3,
    currencyWeight: 0.15,
    sensitivity: 0.95,
    recommendationUp: 'Review upcoming PE demand and contract coverage.',
    recommendationDown: 'Request revised supplier offers before committing.',
  },
  {
    code: 'LDPE',
    name: 'Low-density Polyethylene',
    oilWeight: 0.5,
    gasWeight: 0.35,
    currencyWeight: 0.15,
    sensitivity: 1,
    recommendationUp: 'Monitor energy and ethylene-related supplier revisions.',
    recommendationDown: 'Delay non-critical coverage where operationally safe.',
  },
  {
    code: 'PA6',
    name: 'Polyamide 6',
    oilWeight: 0.4,
    gasWeight: 0.4,
    currencyWeight: 0.2,
    sensitivity: 1.25,
    recommendationUp: 'Review supplier capacity and contract expirations.',
    recommendationDown: 'Seek improved conversion and energy surcharges.',
  },
  {
    code: 'PA66',
    name: 'Polyamide 66',
    oilWeight: 0.35,
    gasWeight: 0.45,
    currencyWeight: 0.2,
    sensitivity: 1.45,
    recommendationUp: 'Begin an immediate commercial and supply-risk review.',
    recommendationDown: 'Validate availability before delaying purchases.',
  },
  {
    code: 'PC',
    name: 'Polycarbonate',
    oilWeight: 0.4,
    gasWeight: 0.4,
    currencyWeight: 0.2,
    sensitivity: 1.15,
    recommendationUp: 'Review energy-related supplier surcharges.',
    recommendationDown: 'Request updated offers for non-contracted volume.',
  },
  {
    code: 'POM',
    name: 'Polyoxymethylene',
    oilWeight: 0.35,
    gasWeight: 0.45,
    currencyWeight: 0.2,
    sensitivity: 1.1,
    recommendationUp: 'Request supplier cost-driver transparency.',
    recommendationDown: 'Use the lower signal in commercial negotiations.',
  },
  {
    code: 'PVC',
    name: 'Polyvinyl Chloride',
    oilWeight: 0.3,
    gasWeight: 0.5,
    currencyWeight: 0.2,
    sensitivity: 0.9,
    recommendationUp: 'Review energy and conversion-cost exposure.',
    recommendationDown: 'Consider short-term volume consolidation.',
  },
]

const fallbackDrivers: MarketDriver[] = [
  {
    id: 'brent',
    name: 'Brent crude',
    value: 0,
    change: 0,
    unit: 'USD/bbl',
    source: 'Waiting for EIA',
    updatedAt: 'Unavailable',
    status: 'fallback',
  },
  {
    id: 'gas',
    name: 'Henry Hub natural gas',
    value: 0,
    change: 0,
    unit: 'USD/MMBtu',
    source: 'Waiting for EIA',
    updatedAt: 'Unavailable',
    status: 'fallback',
  },
  {
    id: 'eurusd',
    name: 'EUR/USD',
    value: 0,
    change: 0,
    unit: '',
    source: 'Waiting for ECB',
    updatedAt: 'Unavailable',
    status: 'fallback',
  },
]

function clamp(value: number, minimum: number, maximum: number) {
  return Math.min(maximum, Math.max(minimum, value))
}

function riskFromPressure(pressure: number): Risk {
  if (pressure >= 78) return 'Critical'
  if (pressure >= 62) return 'High'
  if (pressure >= 45) return 'Medium'
  return 'Low'
}

function formatValue(driver: MarketDriver) {
  if (!driver.value) return '—'

  return driver.value.toLocaleString('en-US', {
    minimumFractionDigits: driver.id === 'eurusd' ? 4 : 2,
    maximumFractionDigits: driver.id === 'eurusd' ? 4 : 2,
  })
}

function calculateSignals(drivers: MarketDriver[]): ResinSignal[] {
  const driverMap = new Map(drivers.map(driver => [driver.id, driver]))

  const oil = driverMap.get('brent')?.change ?? 0
  const gas = driverMap.get('gas')?.change ?? 0
  const currency = driverMap.get('eurusd')?.change ?? 0

  return resinDefinitions.map(definition => {
    const change =
      (oil * definition.oilWeight +
        gas * definition.gasWeight -
        currency * definition.currencyWeight) *
      definition.sensitivity

    const roundedChange = Number(change.toFixed(2))
    const pressure = Math.round(clamp(50 + roundedChange * 6, 5, 95))

    const history = Array.from({ length: 12 }, (_, index) => {
      const progress = index / 11
      return Number((100 + roundedChange * progress).toFixed(2))
    })

    return {
      ...definition,
      change: roundedChange,
      pressure,
      risk: riskFromPressure(pressure),
      history,
    }
  })
}

function TrendChart({ values }: { values: number[] }) {
  const width = 620
  const height = 220
  const minimum = Math.min(...values)
  const maximum = Math.max(...values)
  const range = Math.max(maximum - minimum, 1)

  const points = values
    .map((value, index) => {
      const x = (index / Math.max(values.length - 1, 1)) * width
      const y = height - 18 - ((value - minimum) / range) * (height - 36)
      return `${x},${y}`
    })
    .join(' ')

  return (
    <svg
      className="resin-main-chart"
      viewBox={`0 0 ${width} ${height}`}
      role="img"
      aria-label="Calculated resin pressure trend"
    >
      <line x1="0" y1="45" x2={width} y2="45" />
      <line x1="0" y1="110" x2={width} y2="110" />
      <line x1="0" y1="175" x2={width} y2="175" />
      <polyline points={points} />

      {values.map((value, index) => {
        const x = (index / Math.max(values.length - 1, 1)) * width
        const y =
          height - 18 - ((value - minimum) / range) * (height - 36)

        return <circle key={`${index}-${value}`} cx={x} cy={y} r="3" />
      })}
    </svg>
  )
}

export function ResinIntelligence() {
  const [selectedCode, setSelectedCode] = useState('ABS')
  const [period, setPeriod] = useState<Period>('1Y')
  const [drivers, setDrivers] =
    useState<MarketDriver[]>(fallbackDrivers)

  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState('Connecting to market sources…')

  async function refresh() {
    setLoading(true)

    try {
      const response = await fetch('/api/market-drivers')

      if (!response.ok) {
        throw new Error(`Market service returned ${response.status}`)
      }

      const payload = (await response.json()) as {
        drivers?: MarketDriver[]
        errors?: string[]
        updatedAt?: string
      }

      if (!payload.drivers?.length) {
        throw new Error('No live market drivers were returned')
      }

      setDrivers(payload.drivers)
      setMessage(
        payload.errors?.length
          ? `Live with ${payload.errors.length} source warning(s)`
          : `Live sources updated ${new Date(
              payload.updatedAt ?? Date.now(),
            ).toLocaleString()}`,
      )
    } catch (error) {
      setDrivers(fallbackDrivers)
      setMessage(
        error instanceof Error
          ? error.message
          : 'Live market sources are unavailable',
      )
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void refresh()
  }, [])

  const signals = useMemo(() => calculateSignals(drivers), [drivers])

  const selected =
    signals.find(signal => signal.code === selectedCode) ?? signals[0]

  const visibleHistory = useMemo(() => {
    if (period === '30D') return selected.history.slice(-4)
    if (period === '90D') return selected.history.slice(-7)
    return selected.history
  }, [period, selected])

  const marketPressure = Math.round(
    signals.reduce((sum, signal) => sum + signal.pressure, 0) /
      signals.length,
  )

  const opportunities = signals.filter(signal => signal.change < -0.25).length

  const priorityAlerts = signals.filter(
    signal => signal.risk === 'High' || signal.risk === 'Critical',
  ).length

  const highestExposure = [...signals].sort(
    (left, right) => right.pressure - left.pressure,
  )[0]

  const liveCount = drivers.filter(driver => driver.status === 'live').length

  return (
    <section className="resin-intelligence">
      <div className="resin-page-title">
        <div>
          <span className="eyebrow">SC360 Market Intelligence</span>
          <h2>Resin Intelligence</h2>

          <p>
            Live upstream indicators translated into calculated resin
            purchasing signals.
          </p>
        </div>

        <div className="resin-live-area">
          <span
            className={
              liveCount > 0
                ? 'resin-live resin-live-active'
                : 'resin-live'
            }
          >
            <i />
            {liveCount > 0
              ? `${liveCount} live sources`
              : 'Sources unavailable'}
          </span>

          <button
            type="button"
            className="secondary"
            onClick={() => void refresh()}
            disabled={loading}
          >
            {loading ? 'Refreshing…' : 'Refresh market'}
          </button>

          <small>{message}</small>
        </div>
      </div>

      <div className="resin-kpis">
        <article>
          <span>Market pressure</span>
          <strong>{marketPressure}</strong>
          <small>Calculated composite index</small>
        </article>

        <article>
          <span>Buying opportunities</span>
          <strong>{opportunities}</strong>
          <small>Resins with downward signals</small>
        </article>

        <article>
          <span>Priority alerts</span>
          <strong>{priorityAlerts}</strong>
          <small>High and critical pressure</small>
        </article>

        <article>
          <span>Highest exposure</span>
          <strong>{highestExposure.code}</strong>
          <small>Pressure score {highestExposure.pressure}</small>
        </article>
      </div>

      <div className="resin-card-grid">
        {signals.map(signal => (
          <button
            type="button"
            key={signal.code}
            className={
              selected.code === signal.code
                ? 'resin-material-card selected'
                : 'resin-material-card'
            }
            onClick={() => setSelectedCode(signal.code)}
          >
            <div>
              <span>{signal.name}</span>
              <strong>{signal.code}</strong>
            </div>

            <div className="resin-material-change">
              <span
                className={`resin-direction ${
                  signal.change > 0.1
                    ? 'resin-direction-up'
                    : signal.change < -0.1
                      ? 'resin-direction-down'
                      : 'resin-direction-stable'
                }`}
              >
                {signal.change > 0.1
                  ? '↑'
                  : signal.change < -0.1
                    ? '↓'
                    : '→'}
              </span>

              <b>
                {signal.change > 0 ? '+' : ''}
                {signal.change.toFixed(1)}%
              </b>
            </div>

            <span
              className={`resin-risk resin-risk-${signal.risk.toLowerCase()}`}
            >
              {signal.risk}
            </span>
          </button>
        ))}
      </div>

      <div className="resin-detail-grid">
        <article className="panel resin-chart-panel">
          <div className="panel-head">
            <div>
              <span>Calculated resin pressure trend</span>
              <h3>
                {selected.code} · {selected.name}
              </h3>
            </div>

            <div className="resin-periods">
              {(['30D', '90D', '1Y'] as Period[]).map(item => (
                <button
                  type="button"
                  key={item}
                  className={period === item ? 'active' : ''}
                  onClick={() => setPeriod(item)}
                >
                  {item}
                </button>
              ))}
            </div>
          </div>

          <TrendChart values={visibleHistory} />

          <div className="resin-chart-summary">
            <div>
              <span>Calculated movement</span>
              <strong>
                {selected.change > 0 ? '+' : ''}
                {selected.change.toFixed(2)}%
              </strong>
            </div>

            <div>
              <span>Pressure</span>
              <strong>{selected.pressure}/100</strong>
            </div>

            <div>
              <span>Risk</span>
              <strong>{selected.risk}</strong>
            </div>

            <div>
              <span>Method</span>
              <strong>SC360 index</strong>
            </div>
          </div>
        </article>

        <aside className="panel resin-recommendation">
          <span className="eyebrow">SCOUT buyer assessment</span>

          <h3>
            {selected.code}{' '}
            {selected.change > 0.25
              ? 'is showing increasing upstream pressure.'
              : selected.change < -0.25
                ? 'is entering a softer buying window.'
                : 'is currently showing a stable signal.'}
          </h3>

          <p>
            This signal combines live crude-oil, natural-gas and currency
            movements. It is not an official quoted resin price.
          </p>

          <div className="resin-pressure-bar">
            <span style={{ width: `${selected.pressure}%` }} />
          </div>

          <div className="recommend">
            <span>Recommended buyer action</span>

            <strong>
              {selected.change >= 0
                ? selected.recommendationUp
                : selected.recommendationDown}
            </strong>
          </div>
        </aside>
      </div>

      <article className="panel resin-drivers-panel">
        <div className="panel-head">
          <div>
            <span>Live upstream intelligence</span>
            <h3>Market drivers</h3>
          </div>

          <small>Official source and observation date shown below</small>
        </div>

        <div className="resin-driver-grid">
          {drivers.map(driver => (
            <article key={driver.id}>
              <div>
                <span>{driver.name}</span>

                <small
                  className={
                    driver.status === 'live'
                      ? 'driver-source live'
                      : 'driver-source'
                  }
                >
                  {driver.status === 'live' ? 'LIVE' : 'UNAVAILABLE'}
                </small>
              </div>

              <strong>
                {formatValue(driver)} <small>{driver.unit}</small>
              </strong>

              <b className={driver.change >= 0 ? 'positive' : 'negative'}>
                {driver.change >= 0 ? '↑' : '↓'}{' '}
                {Math.abs(driver.change).toFixed(2)}%
              </b>

              <footer>
                <span>{driver.source}</span>
                <small>{driver.updatedAt}</small>
              </footer>
            </article>
          ))}
        </div>
      </article>

      <div className="resin-disclosure">
        <strong>Data methodology</strong>

        <span>
          Oil and natural-gas observations come from the U.S. EIA.
          EUR/USD observations come from the European Central Bank.
          Resin-family movements are calculated SC360 pressure indices,
          not official market quotations. Exact regional resin prices
          require a licensed resin-market data provider.
        </span>
      </div>
    </section>
  )
}