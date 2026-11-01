import { useEffect, useState } from 'react';

function money(value) {
  return `$${Number(value).toFixed(2)}`;
}

function priceLabel(token) {
  if (!token.price_available) {
    return 'Price unavailable';
  }
  return money(token.price_usd);
}

function valueLabel(token) {
  if (!token.price_available) {
    return 'Unavailable';
  }
  return money(token.value_usd);
}

function errorMessage(body) {
  if (body && body.error && body.error.message) {
    return body.error.message;
  }
  return 'Unable to load portfolio';
}

async function readBody(response) {
  if (typeof response.text === 'function') {
    const text = await response.text();
    if (!text) {
      return null;
    }
    try {
      return JSON.parse(text);
    } catch {
      return { error: { message: text.trim() } };
    }
  }
  try {
    return await response.json();
  } catch {
    return null;
  }
}

export default function App({ address: initialAddress = '0xabc123' }) {
  const [address, setAddress] = useState(initialAddress);
  const [draft, setDraft] = useState(initialAddress);
  const [portfolio, setPortfolio] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!address) {
      setLoading(false);
      setError('Unable to load portfolio');
      setPortfolio(null);
      return;
    }

    let cancelled = false;

    async function load() {
      setLoading(true);
      setError('');
      try {
        const response = await fetch(`/api/wallets/${encodeURIComponent(address)}/portfolio`);
        const body = await readBody(response);
        if (!response.ok) {
          throw new Error(errorMessage(body));
        }
        if (!cancelled) {
          setPortfolio(body);
        }
      } catch (err) {
        if (!cancelled) {
          setPortfolio(null);
          setError(err.message);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [address]);

  function onSubmit(event) {
    event.preventDefault();
    const next = draft.trim();
    if (next === address) {
      return;
    }
    setAddress(next);
  }

  const showPortfolio = !loading && !error && portfolio && portfolio.tokens.length > 0;
  const showEmpty = !loading && !error && portfolio && portfolio.tokens.length === 0;

  return (
    <main>
      <form onSubmit={onSubmit}>
        <label htmlFor="wallet-address">Wallet address</label>
        <input
          id="wallet-address"
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
        />
        <button type="submit">Load</button>
      </form>
      {address ? <p>Wallet: {address}</p> : null}
      {loading ? <p>Loading portfolio...</p> : null}
      {!loading && error ? <p role="alert">{error}</p> : null}
      {showEmpty ? <p>No tokens found for this wallet.</p> : null}
      {showPortfolio ? (
        <>
          <h1>Wallet Portfolio</h1>
          <p>Total value: {money(portfolio.total_usd)}</p>
          <table>
            <thead>
              <tr>
                <th>Token</th>
                <th>Amount</th>
                <th>Price</th>
                <th>Value</th>
              </tr>
            </thead>
            <tbody>
              {portfolio.tokens.map((token) => (
                <tr key={`${token.chain}-${token.symbol}`}>
                  <td>{token.symbol}</td>
                  <td>{token.amount}</td>
                  <td>{priceLabel(token)}</td>
                  <td>{valueLabel(token)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      ) : null}
    </main>
  );
}
