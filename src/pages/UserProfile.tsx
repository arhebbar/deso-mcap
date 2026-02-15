import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { fetchUserProfile, type UserProfileData, type ApiCallRecord } from '@/api/userProfileApi';
import { formatUsd } from '@/lib/formatters';
import { useLiveData } from '@/hooks/useLiveData';
import { ArrowLeft } from 'lucide-react';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';

function AssetCard({ token, amount, usdValue }: { token: string; amount: number; usdValue: number }) {
  const fmt = (n: number) =>
    n >= 1_000_000 ? `${(n / 1_000_000).toFixed(1)}M` : n >= 1_000 ? `${(n / 1_000).toFixed(1)}K` : n.toFixed(4);
  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <div className="text-xs text-muted-foreground uppercase tracking-wider">{token}</div>
      <div className="mt-1 font-mono text-lg font-medium">{fmt(amount)}</div>
      <div className="text-xs text-muted-foreground">{formatUsd(usdValue)}</div>
    </div>
  );
}

function ApiCallCard({ call }: { call: ApiCallRecord }) {
  const statusColor = call.status >= 200 && call.status < 300 ? 'text-green-500' : 'text-amber-500';
  return (
    <AccordionItem value={call.name} className="border-border">
      <AccordionTrigger className="hover:no-underline">
        <div className="flex items-center gap-3 text-left">
          <span className="font-mono text-sm font-medium">{call.name}</span>
          <span className={`text-xs font-mono ${statusColor}`}>
            {call.status} {call.statusText}
          </span>
          <span className="text-xs text-muted-foreground truncate max-w-[200px]" title={call.url}>
            {call.url}
          </span>
        </div>
      </AccordionTrigger>
      <AccordionContent>
        <div className="space-y-4 pt-2 text-sm">
          <div>
            <div className="text-xs font-medium text-muted-foreground mb-1">Request</div>
            <div className="font-mono text-xs bg-muted/50 rounded p-3 overflow-x-auto">
              <div><strong>Method:</strong> {call.method}</div>
              <div><strong>URL:</strong> {call.url}</div>
              <div><strong>Headers:</strong></div>
              <pre className="mt-1 text-xs">{JSON.stringify(call.headers, null, 2)}</pre>
              {call.requestBody != null && (
                <>
                  <div><strong>Body:</strong></div>
                  <pre className="mt-1 text-xs">{JSON.stringify(call.requestBody, null, 2)}</pre>
                </>
              )}
            </div>
          </div>
          <div>
            <div className="text-xs font-medium text-muted-foreground mb-1">Response</div>
            <div className="font-mono text-xs bg-muted/50 rounded p-3 overflow-x-auto max-h-96 overflow-y-auto">
              <div><strong>Status:</strong> {call.status} {call.statusText}</div>
              <div><strong>Response Headers:</strong></div>
              <pre className="mt-1 text-xs">{JSON.stringify(call.responseHeaders, null, 2)}</pre>
              <div className="mt-2"><strong>Response Body:</strong></div>
              <pre className="mt-1 text-xs whitespace-pre-wrap break-all">
                {typeof call.responseBody === 'string'
                  ? call.responseBody
                  : JSON.stringify(call.responseBody, null, 2)}
              </pre>
            </div>
          </div>
        </div>
      </AccordionContent>
    </AccordionItem>
  );
}

export default function UserProfile() {
  const { username } = useParams<{ username: string }>();
  const { marketData } = useLiveData();
  const { data, isLoading, error } = useQuery({
    queryKey: ['user-profile', username],
    queryFn: () => fetchUserProfile(username!),
    enabled: !!username,
  });

  if (!username) {
    return (
      <div className="min-h-screen bg-background p-6">
        <Link to="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Back to Dashboard
        </Link>
        <p className="mt-4 text-muted-foreground">No username provided.</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background p-6">
        <Link to="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Back to Dashboard
        </Link>
        <div className="mt-8 animate-pulse space-y-4">
          <div className="h-8 w-48 bg-muted rounded" />
          <div className="h-32 bg-muted rounded" />
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-background p-6">
        <Link to="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Back to Dashboard
        </Link>
        <p className="mt-4 text-destructive">User not found or failed to load.</p>
      </div>
    );
  }

  const d = data as UserProfileData;
  const TOKEN_PRICES: Record<string, number> = {
    DESO: marketData.desoPrice,
    Openfund: marketData.openfundPrice,
    Focus: marketData.focusPrice,
    dUSDC: 1,
    dBTC: marketData.btcPrice,
    dETH: marketData.ethPrice,
    dSOL: marketData.solPrice,
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto p-6 space-y-8">
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" /> Back to Dashboard
        </Link>

        <div>
          <h1 className="text-2xl font-bold">{d.displayName}</h1>
          <p className="font-mono text-xs text-muted-foreground mt-1 break-all">{d.publicKey}</p>
        </div>

        <section>
          <h2 className="text-lg font-semibold mb-4">Holdings</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {Object.entries(d.balances)
              .filter(([token, amt]) => amt > 0 && (token !== 'DESO' || (d.desoStaked === 0 && d.desoUnstaked === 0)))
              .map(([token, amount]) => (
                <AssetCard
                  key={token}
                  token={token}
                  amount={amount}
                  usdValue={amount * (TOKEN_PRICES[token] ?? 0)}
                />
              ))}
            {(d.desoStaked > 0 || d.desoUnstaked > 0) && (
              <>
                {d.desoUnstaked > 0 && (
                  <AssetCard
                    key="DESO-unstaked"
                    token="DESO (unstaked)"
                    amount={d.desoUnstaked}
                    usdValue={d.desoUnstaked * marketData.desoPrice}
                  />
                )}
                {d.desoStaked > 0 && (
                  <AssetCard
                    key="DESO-staked"
                    token="DESO (staked)"
                    amount={d.desoStaked}
                    usdValue={d.desoStaked * marketData.desoPrice}
                  />
                )}
              </>
            )}
          </div>
          {Object.keys(d.balances).length === 0 && d.desoStaked === 0 && d.desoUnstaked === 0 && (
            <p className="text-muted-foreground text-sm">No holdings found.</p>
          )}
          <div className="mt-4 text-sm">
            <span className="text-muted-foreground">Total USD Value: </span>
            <span className="font-mono font-medium">{formatUsd(d.usdValue)}</span>
          </div>
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-4">API Responses (for debugging)</h2>
          <p className="text-sm text-muted-foreground mb-4">
            Expand each call to see request headers, body, and full response. Use this to debug why staked DESO may not be showing.
          </p>
          <Accordion type="multiple" className="w-full">
            {d.apiCalls.map((call) => (
              <ApiCallCard key={call.name} call={call} />
            ))}
          </Accordion>
        </section>
      </div>
    </div>
  );
}
