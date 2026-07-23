import { useState } from 'react'
import { OperationsApp } from './OperationsApp'
import { ResinIntelligence } from './ResinIntelligence'

type Workspace = 'operations' | 'resin'

export function App() {
  const [workspace, setWorkspace] =
    useState<Workspace>('operations')

  return (
    <div className="sc360-platform">
      <header className="platform-header">
        <div className="platform-brand">
          <div className="platform-logo">SC</div>

          <div>
            <strong>SC360</strong>
            <span>
              Supply Chain Decision Intelligence Platform
            </span>
          </div>
        </div>

        <nav
          className="platform-navigation"
          aria-label="SC360 workspaces"
        >
          <button
            type="button"
            className={
              workspace === 'operations'
                ? 'active'
                : ''
            }
            onClick={() =>
              setWorkspace('operations')
            }
          >
            Operations Intelligence
          </button>

          <button
            type="button"
            className={
              workspace === 'resin'
                ? 'active'
                : ''
            }
            onClick={() =>
              setWorkspace('resin')
            }
          >
            Resin Intelligence
          </button>
        </nav>
      </header>

      <main className="platform-workspace">
        {workspace === 'operations' ? (
          <OperationsApp />
        ) : (
          <ResinIntelligence />
        )}
      </main>
    </div>
  )
}