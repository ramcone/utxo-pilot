const PAIN_POINTS = [
  {
    icon: '💸',
    problem: 'Overpaying fees without realising it',
    detail:
      'Most wallets pick UTXOs automatically — often poorly. Selecting ten small inputs when two large ones would do adds hundreds of bytes to your transaction and multiplies your fee. During high-fee periods this can cost you several dollars on a routine send.',
    solution:
      'UTXO Pilot\'s fee-first coin selection chooses the fewest, largest UTXOs needed to cover your amount. You see the exact estimated fee before you ever open your signing wallet.',
  },
  {
    icon: '🔗',
    problem: 'Accidentally linking unrelated funds',
    detail:
      'Every input in a Bitcoin transaction is visible on-chain. When your wallet bundles a "salary" UTXO with a "exchange withdrawal" UTXO to pay someone, a chain analyst can infer they share an owner — permanently connecting those histories.',
    solution:
      'Privacy-first mode in the Spend Planner groups UTXOs by label and avoids mixing coins from different sources. If mixing is unavoidable, UTXO Pilot warns you explicitly so you can make an informed choice.',
  },
  {
    icon: '🗑',
    problem: 'Dust accumulating and making future spends expensive',
    detail:
      'Small UTXOs — sometimes called dust — are outputs worth less than they cost to spend at typical fee rates. Over time they pile up from change outputs, small payments, and airdrops. A wallet full of dust can make a future spend cost more in fees than expected.',
    solution:
      'The Consolidation Planner identifies all UTXOs below a configurable threshold and shows you exactly what it costs to merge them at current fast, medium, and slow fee rates. Consolidate when fees are low and save later.',
  },
  {
    icon: '😰',
    problem: 'No time to think clearly when fees are spiking',
    detail:
      'Fee markets move fast. When you urgently need to send funds and fees are high, you are under pressure — not a good time to reason carefully about which UTXOs to use, what change you\'ll get back, or whether you\'re mixing sensitive coins.',
    solution:
      'UTXO Pilot is designed to be used before you open your signing wallet. Plan your spend while fees are calm and conditions are normal. When it\'s time to sign, you already know exactly which UTXOs to select.',
  },
  {
    icon: '🔍',
    problem: 'No visibility into your UTXO set',
    detail:
      'Most wallets show you a total balance and a list of transactions. They rarely surface the underlying UTXO set — how many outputs you have, how old they are, which are labelled, or how fragmented your wallet has become.',
    solution:
      'The UTXO Explorer gives you a filterable, sortable table of every unspent output. Filter by amount, age, or label. See at a glance if your wallet is healthy or needs consolidation.',
  },
  {
    icon: '🏷',
    problem: 'Forgetting where coins came from',
    detail:
      'Bitcoin is pseudonymous, not anonymous. Knowing the origin of each UTXO is important for privacy and personal record-keeping. Most wallets either have no labelling or lock labels inside the wallet file with no easy way to export or import them.',
    solution:
      'UTXO Pilot supports manual labels per output and imports BIP329 JSONL label files exported from Sparrow, Specter, and other compatible wallets. Labels are stored locally and feed directly into the privacy-first coin selection.',
  },
  {
    icon: '🛡',
    problem: 'Planning tools that require your keys',
    detail:
      'Some advanced Bitcoin tools ask you to import a wallet file, enter a seed phrase, or connect to a service. Any tool that handles your private key is a potential point of compromise — and an online service means your financial data leaves your machine.',
    solution:
      'UTXO Pilot is 100% watch-only. It accepts only an extended public key (xpub / ypub / zpub) — the same key you\'d share with a block explorer. It never signs, never broadcasts, and stores everything in a local SQLite database that never leaves your computer.',
  },
];

export default function WhyUTXOPilot() {
  return (
    <div className="page" style={{ maxWidth: 780 }}>
      <div className="page-header">
        <h2>Why UTXO Pilot?</h2>
        <p>Bitcoin self-custody is powerful — but managing UTXOs well is harder than it looks.</p>
      </div>

      {/* Hero statement */}
      <div
        className="card mb-8"
        style={{
          background: 'linear-gradient(135deg, rgba(247,147,26,0.08) 0%, rgba(247,147,26,0.03) 100%)',
          borderColor: 'rgba(247,147,26,0.25)',
          padding: '28px 24px',
        }}
      >
        <p style={{ fontSize: '1.05rem', lineHeight: 1.75, color: 'var(--text)' }}>
          Most Bitcoin wallet software is optimised for <strong>signing and broadcasting</strong>.
          Almost none of it is optimised for <strong>thinking before you sign</strong>.
          UTXO Pilot fills that gap — a local, private planning layer that sits between
          your UTXO set and your hardware wallet.
        </p>
      </div>

      {/* Pain points */}
      <div className="space-y-6 mb-8">
        {PAIN_POINTS.map((item) => (
          <div key={item.problem} className="card" style={{ padding: '20px 24px' }}>
            <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
              <div style={{ fontSize: '1.6rem', flexShrink: 0, marginTop: 2 }}>{item.icon}</div>
              <div style={{ flex: 1 }}>
                <h3 style={{ fontSize: '0.95rem', fontWeight: 700, marginBottom: 6, color: 'var(--text)' }}>
                  {item.problem}
                </h3>
                <p style={{ fontSize: '0.83rem', color: 'var(--text2)', lineHeight: 1.65, marginBottom: 12 }}>
                  {item.detail}
                </p>
                <div
                  style={{
                    background: 'rgba(247,147,26,0.07)',
                    border: '1px solid rgba(247,147,26,0.2)',
                    borderRadius: 6,
                    padding: '10px 14px',
                    fontSize: '0.83rem',
                    lineHeight: 1.6,
                    color: 'var(--text)',
                  }}
                >
                  <span style={{ color: 'var(--accent)', fontWeight: 700 }}>How UTXO Pilot helps: </span>
                  {item.solution}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Who it's for */}
      <div className="card mb-6">
        <h3 style={{ fontWeight: 700, marginBottom: 14, fontSize: '0.95rem' }}>Who is this for?</h3>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          {[
            { label: 'Hardware wallet users', desc: 'Ledger, Trezor, Coldcard, Passport, Jade — any device that shows an xpub.' },
            { label: 'Long-term holders', desc: 'If you stack sats over time, your UTXO set grows. Stay on top of it.' },
            { label: 'Privacy-conscious users', desc: 'Avoid linking coins from different origins when you spend.' },
            { label: 'Fee-sensitive users', desc: 'Know your fee before you commit — no surprises on the hardware screen.' },
          ].map((item) => (
            <div
              key={item.label}
              style={{
                background: 'var(--bg3)',
                borderRadius: 8,
                padding: '12px 14px',
                fontSize: '0.82rem',
              }}
            >
              <div style={{ fontWeight: 700, marginBottom: 4, color: 'var(--text)' }}>{item.label}</div>
              <div style={{ color: 'var(--text2)', lineHeight: 1.55 }}>{item.desc}</div>
            </div>
          ))}
        </div>
      </div>

      {/* What it is not */}
      <div className="card mb-6" style={{ borderColor: 'rgba(239,68,68,0.2)', background: 'rgba(239,68,68,0.03)' }}>
        <h3 style={{ fontWeight: 700, marginBottom: 12, fontSize: '0.95rem', color: 'var(--red)' }}>
          What UTXO Pilot is NOT
        </h3>
        <ul style={{ fontSize: '0.83rem', color: 'var(--text2)', lineHeight: 2.1, paddingLeft: 18 }}>
          <li>Not a wallet — it cannot hold, sign, or send Bitcoin</li>
          <li>Not a custodian — it never touches your private keys or seed phrase</li>
          <li>Not a cloud service — all data lives on your machine in a local database</li>
          <li>Not a tax tool — it does not calculate gains, losses, or cost basis</li>
          <li>Not a Lightning wallet — it plans on-chain transactions only</li>
          <li>Not an exchange — no buying, selling, or swapping</li>
        </ul>
      </div>

      {/* CTA */}
      <div className="card" style={{ textAlign: 'center', padding: '28px 24px' }}>
        <p style={{ fontSize: '0.95rem', marginBottom: 20, color: 'var(--text2)' }}>
          Ready to take control of your UTXO set?
        </p>
        <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
          <a href="/setup"  className="btn btn-primary">⚡ Follow the setup guide</a>
          <a href="/import" className="btn btn-secondary">Import a wallet</a>
        </div>
      </div>
    </div>
  );
}
