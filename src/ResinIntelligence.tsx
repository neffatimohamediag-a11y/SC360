import { useEffect, useMemo, useState } from 'react'

type Direction = 'up' | 'down' | 'stable'
type Risk = 'Low' | 'Medium' | 'High' | 'Critical'
type Period = '30D' | '90D' | '1Y'

type Resin = {
  code: string
  name: string
  change30d: number
  pressure: number
  volatility: number
  risk: Risk
  direction: Direction
  recommendation: string
  history: number[]
}

type MarketDriver = {
  id: string
  name: string
  value: string
  change: number
  unit: string
  source: string
  updatedAt: string
  status: 'live' | 'fallback'
}

const resinData: Resin[] = [
  {
    code: 'ABS',
    name: 'Acrylonitrile Butadiene Styrene',
    change30d: 2.6,
    pressure: 78,
    volatility: 67,
    risk: 'High',
    direction: 'up',
    recommendation: 'Review open quotations and negotiate validity extensions.',
    history: [93, 94, 94, 96, 97, 99, 100, 102, 103, 105, 106, 108],
  },
  {
    code: 'PP',
    name: 'Polypropylene',
    change30d: -1.4,
    pressure: 38,
    volatility: 34,
    risk: 'Low',
    direction: 'down',
    recommendation: 'Use the softer market as a negotiation opportunity.',
    history: [104, 103, 102, 103, 101, 100, 99, 99, 98, 97, 97, 96],
  },
  {
    code: 'HDPE',
    name: 'High-density Polyethylene',
    change30d: 0.9,
    pressure: 54,
    volatility: 42,
    risk: 'Medium',
    direction: 'up',
    recommendation: 'Monitor feedstock movement before committing long-term volume.',
    history: [98, 98, 99, 100, 99, 100, 101, 101, 102, 102, 103, 104],
  },
  {
    code: 'LDPE',
    name: 'Low-density Polyethylene',
    change30d: -0.5,
    pressure: 43,
    volatility: 38,
    risk: 'Low',
    direction: 'down',
    recommendation: 'Delay non-critical coverage and request refreshed quotations.',
    history: [103, 103, 102, 102, 101, 101, 100, 100, 99, 99, 98, 98],
  },
  {
    code: 'PA6',
    name: 'Polyamide 6',
    change30d: 3.1,
    pressure: 74,
    volatility: 63,
    risk: 'High',
    direction: 'up',
    recommendation: 'Review supplier capacity and upcoming contract expirations.',
    history: [91, 92, 94, 94, 96, 97, 99, 100, 102, 104, 106, 107],
  },
  {
    code: 'PA66',
    name: 'Polyamide 66',
    change30d: 5.4,
    pressure: 89,
    volatility: 81,
    risk: 'Critical',
    direction: 'up',
    recommendation: 'Begin an immediate commercial and supply-risk review.',
    history: [88, 90, 91, 94, 96, 99, 101, 105, 108, 112, 116, 121],
  },
  {
    code: 'PC',
    name: 'Polycarbonate',
    change30d: 0.1,
    pressure: 49,
    volatility: 36,
    risk: 'Medium',
    direction: 'stable',
    recommendation: 'Maintain current coverage and monitor energy indicators.',
    history: [100, 101, 100, 100, 99, 100, 100, 101, 100, 100, 101, 100],
  },
  {
    code: 'POM',
    name: 'Polyoxymethylene',
    change30d: 1.8,
    pressure: 61,
    volatility: 48,
    risk: 'Medium',
    direction: 'up',
    recommendation: 'Request updated supplier cost breakdowns.',
    history: [95, 96, 96, 97, 98, 99, 99, 100, 101, 102, 103, 105],
  },
  {
    code: 'PVC',
    name: 'Polyvinyl Chloride',
    change30d: -0.7,
    pressure: 40,
    volatility: 31,
    risk: 'Low',
    direction: 'down',
    recommendation: 'Consider short-term volume consolidation.',
    history: [104, 103, 103, 102, 101, 101, 100, 99, 99, 98, 98, 97],
  },
]

const fallbackDrivers: MarketDriver[] = [
  {
    id: 'brent',
    name: 'Brent crude',
    value: '82.40',
    change: 2.3,
    unit: 'USD/bbl',
    source: 'Market connector',
    updatedAt: 'Fallback data',
    status: 'fallback',
  },
  {
    id: 'gas',
    name: 'Natural gas',
    value: '34.70',
    change: 4.1,
    unit: 'EUR/MWh',
    source: 'Energy connector',
    updatedAt: 'Fallback data',
    status: 'fallback',
  },
  {
    id: 'eurusd',
    name: 'EUR/USD',
    value: '1.17',
    change: -0.4,
    unit: '',
    source: 'Currency connector',
    updatedAt: 'Fallback data',
    status: 'fallback',
  },
  {
    id: 'freight',
    name: 'Container freight',
    value: '1,940',
    change: -1.8,
    unit: 'USD/FEU',
    source: 'Freight connector',
    updatedAt: 'Fallback data',
    status: 'fallback',
  },
]

function RiskBadge({ risk }: { risk: Risk }) {
  return (
    <span className={`resin-risk resin-risk-${risk.toLowerCase()}`}>
      {risk}
    </span>
  )
}

function TrendArrow({ direction }: { direction: Direction }) {
  return (
    <span className={`resin-direction resin-direction-${direction}`}>
      {direction === 'up' ? '↑' : direction === 'down' ? '↓' : '→'}
    </span>
  )
}

function Sparkline({ values }: { values: number[] }) {
  const width = 520
  const height = 190
  const minimum = Math.min(...values)
  const maximum = Math.max(...values)
  const range = Math.max(maximum - minimum, 1)

  const points = values
    .map((value, index) => {
      const x = (index / Math.max(values.length - 1, 1)) * width
      const y = height - ((value - minimum) / range) * (height - 24) - 12
      return `${x},${y}`
    })
    .join(' ')

  return (
    <svg
      className="resin-main-chart"
      viewBox={`0 0 ${width} ${height}`}
      role="img"
      aria-label="Selected resin market trend"
    >
      <line x1="0" y1="35" x2={width} y2="35" />
      <line x1="0" y1="95" x2={width} y2="95" />
      <line x1="0" y1="155" x2={width} y2="155" />
      <polyline points={points} />
      {values.map((value, index) => {
        const x = (index / Math.max(values.length - 1, 1)) * width
        const y = height - ((value - minimum) / range) * (height - 24) - 12
        return <circle key={`${value}-${index}`} cx={x} cy={y} r="3" />
      })}
    </svg>
  )
}

export function ResinIntelligence() {
  const [selectedCode, setSelectedCode] = useState('ABS')
  const [period, setPeriod] = useState<Period>('1Y')
  const [drivers, setDrivers] =
    useState<MarketDriver[]>(fallbackDrivers)
  const [refreshing, setRefreshing] = useState(false)
  const [lastRefresh, setLastRefresh] = useState('Not connected')

  const selected =
    resinData.find((resin) => resin.code === selectedCode) ?? resinData[0]

  const marketPressure = Math.round(
    resinData.reduce((sum, resin) => sum + resin.pressure, 0) /
      resinData.length,
  )

  const opportunities = resinData.filter(
    (resin) => resin.direction === 'down',
  ).length

  const criticalAlerts = resinData.filter(
    (resin) => resin.risk === 'High' || resin.risk === 'Critical',
  ).length

  const visibleHistory = useMemo(() => {
    if (period === '30D') return selected.history.slice(-4)
    if (period === '90D') return selected.history.slice(-7)
    return selected.history
  }, [period, selected])

  async function refreshMarketData() {
    setRefreshing(true)

    try {
      /*
       * First-release connector contract.
       *
       * The SC360 server should expose:
       * GET /api/market/drivers
       *
       * Expected response:
       * {
       *   "drivers": MarketDriver[]
       * }
       *
       * Until that route is connected to licensed/public feeds,
       * the UI keeps its clearly marked fallback values.
       */
      const response = await fetch('/api/market/drivers')

      if (!response.ok) {
        throw new Error(`Market API returned ${response.status}`)
      }

      const payload = (await response.json()) as {
        drivers?: MarketDriver[]
      }

      if (!payload.drivers?.length) {
        throw new Error('Market API returned no drivers')
      }

      setDrivers(payload.drivers)
      setLastRefresh(new Date().toLocaleString())
    } catch {
      setDrivers(fallbackDrivers)
      setLastRefresh('Connector unavailable — fallback data displayed')
    } finally {
      setRefreshing(false)
    }
  }

  useEffect(() => {
    void refreshMarketData()
  }, [])

  return (
    <section className="resin-intelligence">
      <div className="resin-page-title">
        <div>
          <span className="eyebrow">SC360 Market Intelligence</span>
          <h2>Resin Intelligence</h2>
          <p>
            External market signals translated into practical buyer decisions.
          </p>
        </div>

        <div className="resin-live-area">
          <span
            className={
              drivers.some((driver) => driver.status === 'live')
                ? 'resin-live resin-live-active'
                : 'resin-live'
            }
          >
            <i />
            {drivers.some((driver) => driver.status === 'live')
              ? 'Live sources connected'
              : 'Fallback market data'}
          </span>

          <button
            className="secondary"
            type="button"
            onClick={() => void refreshMarketData()}
            disabled={refreshing}
          >
            {refreshing ? 'Refreshing…' : 'Refresh market'}
          </button>

          <small>{lastRefresh}</small>
        </div>
      </div>

      <div className="resin-kpis">
        <article>
          <span>Market pressure</span>
          <strong>{marketPressure}</strong>
          <small>Composite resin pressure score</small>
        </article>

        <article>
          <span>Buying opportunities</span>
          <strong>{opportunities}</strong>
          <small>Materials with downward momentum</small>
        </article>

        <article>
          <span>Priority alerts</span>
          <strong>{criticalAlerts}</strong>
          <small>High and critical materials</small>
        </article>

        <article>
          <span>Highest exposure</span>
          <strong>PA66</strong>
          <small>Pressure score 89</small>
        </article>
      </div>

      <div className="resin-card-grid">
        {resinData.map((resin) => (
          <button
            type="button"
            key={resin.code}
            className={
              selected.code === resin.code
                ? 'resin-material-card selected'
                : 'resin-material-card'
            }
            onClick={() => setSelectedCode(resin.code)}
          >
            <div>
              <span>{resin.name}</span>
              <strong>{resin.code}</strong>
            </div>

            <div className="resin-material-change">
              <TrendArrow direction={resin.direction} />
              <b>
                {resin.change30d > 0 ? '+' : ''}
                {resin.change30d.toFixed(1)}%
              </b>
            </div>

            <RiskBadge risk={resin.risk} />
          </button>
        ))}
      </div>

      <div className="resin-detail-grid">
        <article className="panel resin-chart-panel">
          <div className="panel-head">
            <div>
              <span>Market trend</span>
              <h3>
                {selected.code} · {selected.name}
              </h3>
            </div>

            <div className="resin-periods">
              {(['30D', '90D', '1Y'] as Period[]).map((item) => (
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

          <Sparkline values={visibleHistory} />

          <div className="resin-chart-summary">
            <div>
              <span>30-day movement</span>
              <strong>
                {selected.change30d > 0 ? '+' : ''}
                {selected.change30d.toFixed(1)}%
              </strong>
            </div>

            <div>
              <span>Pressure</span>
              <strong>{selected.pressure}/100</strong>
            </div>

            <div>
              <span>Volatility</span>
              <strong>{selected.volatility}/100</strong>
            </div>

            <div>
              <span>Risk</span>
              <RiskBadge risk={selected.risk} />
            </div>
          </div>
        </article>

        <aside className="panel resin-recommendation">
          <span className="eyebrow">SCOUT buyer assessment</span>
          <h3>
            {selected.code}{' '}
            {selected.direction === 'up'
              ? 'cost pressure is increasing.'
              : selected.direction === 'down'
                ? 'is entering a softer buying window.'
                : 'is currently stable.'}
          </h3>

          <p>
            The current signal combines market direction, volatility and
            upstream cost pressure. It is a decision-support indicator rather
            than a quoted resin price.
          </p>

          <div className="resin-pressure-bar">
            <span style={{ width: `${selected.pressure}%` }} />
          </div>

          <div className="recommend">
            <span>Recommended buyer action</span>
            <strong>{selected.recommendation}</strong>
          </div>

          <button type="button" className="primary">
            Create sourcing review
          </button>
        </aside>
      </div>

      <article className="panel resin-drivers-panel">
        <div className="panel-head">
          <div>
            <span>Upstream intelligence</span>
            <h3>Market drivers</h3>
          </div>
          <small>Source status is shown on every card</small>
        </div>

        <div className="resin-driver-grid">
          {drivers.map((driver) => (
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
                  {driver.status === 'live' ? 'LIVE' : 'FALLBACK'}
                </small>
              </div>

              <strong>
                {driver.value}{' '}
                <small>{driver.unit}</small>
              </strong>

              <b className={driver.change >= 0 ? 'positive' : 'negative'}>
                {driver.change >= 0 ? '↑' : '↓'}{' '}
                {Math.abs(driver.change).toFixed(1)}%
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
        <strong>First-release data policy</strong>
        <span>
          Resin values are representative market indices until licensed resin
          feeds are connected. Live and fallback values are never presented as
          equivalent.
        </span>
      </div>
    </section>
  )
}