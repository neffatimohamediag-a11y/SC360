import { useMemo, useState } from 'react'

type Risk = 'Low' | 'Medium' | 'High' | 'Critical'

export type SimulatorResin = {
  code: string
  name: string
  oilWeight: number
  gasWeight: number
  currencyWeight: number
  sensitivity: number
  currentChange: number
  currentPressure: number
}

type SimulationResult = SimulatorResin & {
  simulatedChange: number
  simulatedPressure: number
  pressureDifference: number
  risk: Risk
  recommendation: string
}

function clamp(value: number, minimum: number, maximum: number) {
  return Math.min(maximum, Math.max(minimum, value))
}

function getRisk(pressure: number): Risk {
  if (pressure >= 78) return 'Critical'
  if (pressure >= 62) return 'High'
  if (pressure >= 45) return 'Medium'
  return 'Low'
}

function getRecommendation(
  pressure: number,
  difference: number,
) {
  if (pressure >= 78 && difference > 0) {
    return 'Accelerate commercial review'
  }

  if (pressure >= 62 && difference > 0) {
    return 'Review quotations and coverage'
  }

  if (difference < -3) {
    return 'Potential buying opportunity'
  }

  return 'Monitor current position'
}

export function ResinDecisionSimulator({
  resins,
}: {
  resins: SimulatorResin[]
}) {
  const [oilScenario, setOilScenario] = useState(0)
  const [gasScenario, setGasScenario] = useState(0)
  const [currencyScenario, setCurrencyScenario] = useState(0)

  const results = useMemo<SimulationResult[]>(() => {
    return resins
      .map(resin => {
        const scenarioMovement =
          (oilScenario * resin.oilWeight +
            gasScenario * resin.gasWeight -
            currencyScenario * resin.currencyWeight) *
          resin.sensitivity

        const simulatedChange =
          resin.currentChange + scenarioMovement

        const simulatedPressure = Math.round(
          clamp(50 + simulatedChange * 6, 5, 95),
        )

        const pressureDifference =
          simulatedPressure - resin.currentPressure

        return {
          ...resin,
          simulatedChange,
          simulatedPressure,
          pressureDifference,
          risk: getRisk(simulatedPressure),
          recommendation: getRecommendation(
            simulatedPressure,
            pressureDifference,
          ),
        }
      })
      .sort(
        (left, right) =>
          right.simulatedPressure -
          left.simulatedPressure,
      )
  }, [currencyScenario, gasScenario, oilScenario, resins])

  const criticalCount = results.filter(
    result =>
      result.risk === 'Critical' ||
      result.risk === 'High',
  ).length

  const biggestIncrease = results[0]

  const opportunity = [...results]
    .sort(
      (left, right) =>
        left.pressureDifference -
        right.pressureDifference,
    )[0]

  function resetScenario() {
    setOilScenario(0)
    setGasScenario(0)
    setCurrencyScenario(0)
  }

  return (
    <section className="panel resin-simulator">
      <div className="resin-simulator-header">
        <div>
          <span className="eyebrow">
            SC360 Decision Simulator
          </span>

          <h3>Test market scenarios before they happen</h3>

          <p>
            Adjust upstream drivers and instantly recalculate
            resin pressure, risk and buyer actions.
          </p>
        </div>

        <button
          type="button"
          className="secondary"
          onClick={resetScenario}
        >
          Reset scenario
        </button>
      </div>

      <div className="simulator-controls">
        <label>
          <div>
            <span>Brent crude scenario</span>

            <strong>
              {oilScenario > 0 ? '+' : ''}
              {oilScenario}%
            </strong>
          </div>

          <input
            type="range"
            min="-20"
            max="20"
            step="1"
            value={oilScenario}
            onChange={event =>
              setOilScenario(Number(event.target.value))
            }
          />

          <small>Oil and petrochemical feedstock pressure</small>
        </label>

        <label>
          <div>
            <span>Natural gas scenario</span>

            <strong>
              {gasScenario > 0 ? '+' : ''}
              {gasScenario}%
            </strong>
          </div>

          <input
            type="range"
            min="-25"
            max="25"
            step="1"
            value={gasScenario}
            onChange={event =>
              setGasScenario(Number(event.target.value))
            }
          />

          <small>Energy and conversion-cost pressure</small>
        </label>

        <label>
          <div>
            <span>EUR/USD scenario</span>

            <strong>
              {currencyScenario > 0 ? '+' : ''}
              {currencyScenario}%
            </strong>
          </div>

          <input
            type="range"
            min="-10"
            max="10"
            step="0.5"
            value={currencyScenario}
            onChange={event =>
              setCurrencyScenario(
                Number(event.target.value),
              )
            }
          />

          <small>
            Positive values indicate a stronger euro
          </small>
        </label>
      </div>

      <div className="simulator-summary">
        <article>
          <span>High-risk materials</span>
          <strong>{criticalCount}</strong>
          <small>High and critical results</small>
        </article>

        <article>
          <span>Highest simulated pressure</span>
          <strong>{biggestIncrease?.code ?? '—'}</strong>
          <small>
            {biggestIncrease?.simulatedPressure ?? 0}/100
          </small>
        </article>

        <article>
          <span>Largest opportunity</span>
          <strong>{opportunity?.code ?? '—'}</strong>
          <small>
            {opportunity
              ? `${opportunity.pressureDifference} pressure points`
              : 'No result'}
          </small>
        </article>

        <article>
          <span>Scenario status</span>
          <strong>
            {oilScenario === 0 &&
            gasScenario === 0 &&
            currencyScenario === 0
              ? 'Baseline'
              : 'Active'}
          </strong>
          <small>Compared with the live market signal</small>
        </article>
      </div>

      <div className="simulator-table">
        <div className="simulator-table-head">
          <span>Resin</span>
          <span>Current</span>
          <span>Simulated</span>
          <span>Difference</span>
          <span>Risk</span>
          <span>Buyer action</span>
        </div>

        {results.map(result => (
          <article key={result.code}>
            <div>
              <strong>{result.code}</strong>
              <small>{result.name}</small>
            </div>

            <span>{result.currentPressure}/100</span>

            <strong>
              {result.simulatedPressure}/100
            </strong>

            <span
              className={
                result.pressureDifference > 0
                  ? 'simulator-worse'
                  : result.pressureDifference < 0
                    ? 'simulator-better'
                    : ''
              }
            >
              {result.pressureDifference > 0 ? '+' : ''}
              {result.pressureDifference}
            </span>

            <span
              className={`resin-risk resin-risk-${result.risk.toLowerCase()}`}
            >
              {result.risk}
            </span>

            <span>{result.recommendation}</span>
          </article>
        ))}
      </div>

      <div className="simulator-disclaimer">
        Scenario results are calculated decision-support estimates.
        They are not market forecasts or guaranteed future prices.
      </div>
    </section>
  )
}