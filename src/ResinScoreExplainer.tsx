type Risk = 'Low' | 'Medium' | 'High' | 'Critical'

export type ScoreContribution = {
  id: string
  name: string
  liveChange: number
  weight: number
  contribution: number
  source: string
  updatedAt: string
}

export type ScoreContext = {
  code: string
  name: string
  pressure: number
  calculatedChange: number
  risk: Risk
  recommendation: string
  contributions: ScoreContribution[]
}

export function ResinScoreExplainer({
  context,
}: {
  context: ScoreContext
}) {
  return (
    <section className="panel score-explainer">
      <div className="score-explainer-head">
        <div>
          <span className="eyebrow">
            Transparent decision intelligence
          </span>

          <h3>Why is {context.code} scored this way?</h3>

          <p>
            The signal is calculated from live upstream movements,
            configured material weights and resin sensitivity.
          </p>
        </div>

        <div className="score-result">
          <span>Pressure score</span>
          <strong>{context.pressure}/100</strong>

          <em
            className={`score-risk score-risk-${context.risk.toLowerCase()}`}
          >
            {context.risk}
          </em>
        </div>
      </div>

      <div className="score-contribution-list">
        {context.contributions.map(item => (
          <article key={item.id}>
            <div className="score-source">
              <strong>{item.name}</strong>

              <small>
                {item.source} · {item.updatedAt}
              </small>
            </div>

            <div className="score-live-value">
              <span>Live movement</span>

              <strong>
                {item.liveChange > 0 ? '+' : ''}
                {item.liveChange.toFixed(2)}%
              </strong>
            </div>

            <div className="score-weight">
              <span>Weight</span>
              <strong>{Math.round(item.weight * 100)}%</strong>
            </div>

            <div className="score-impact">
              <span>Score contribution</span>

              <strong>
                {item.contribution > 0 ? '+' : ''}
                {item.contribution.toFixed(2)} pts
              </strong>
            </div>
          </article>
        ))}
      </div>

      <div className="score-methodology">
        <div>
          <span>Calculated resin movement</span>

          <strong>
            {context.calculatedChange > 0 ? '+' : ''}
            {context.calculatedChange.toFixed(2)}%
          </strong>
        </div>

        <div>
          <span>Buyer recommendation</span>
          <strong>{context.recommendation}</strong>
        </div>

        <div>
          <span>Method</span>

          <strong>
            Weighted upstream movement × resin sensitivity
          </strong>
        </div>
      </div>

      <div className="score-disclaimer">
        This calculation is an SC360 decision-support index. It is
        not an official spot price, contract price or licensed resin
        benchmark.
      </div>
    </section>
  )
}