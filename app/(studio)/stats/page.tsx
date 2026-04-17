import type { ReactNode } from "react";
import type { Metadata } from "next";
import { requireStudioPageAccess } from "@/lib/auth";
import { STUDIO_APP_NAME } from "@/lib/navigation";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: `Caption Stats | ${STUDIO_APP_NAME}`,
};

type CaptionScoreRow = {
  id: string | number;
  display_text: string | null;
  total_votes: number | null;
};

type RankedCaption = {
  id: string;
  displayText: string;
  totalVotes: number;
};

type DistributionBucket = {
  label: string;
  count: number;
  tone: "positive" | "neutral" | "negative";
};

type DistributionBucketCount = {
  label: string;
  count: number;
};

function formatAverage(total: number, count: number) {
  if (!count) return "0.00";
  return (total / count).toFixed(2);
}

function formatRatio(value: number) {
  return `${(value * 100).toFixed(1)}%`;
}

function formatSignedValue(value: number) {
  if (value > 0) return `+${value}`;
  return `${value}`;
}

function getShare(count: number, total: number) {
  if (total <= 0) return 0;
  return (count / total) * 100;
}

function createCaptionRows(rows: CaptionScoreRow[] | null | undefined) {
  return (rows ?? []).map((row) => ({
    id: String(row.id),
    displayText: row.display_text?.trim() || "Untitled caption",
    totalVotes: typeof row.total_votes === "number" ? row.total_votes : 0,
  }));
}

function createRanking(rows: RankedCaption[], direction: "asc" | "desc") {
  const sorted = [...rows].sort((a, b) => {
    if (direction === "desc") {
      return b.totalVotes - a.totalVotes || a.displayText.localeCompare(b.displayText);
    }

    return a.totalVotes - b.totalVotes || a.displayText.localeCompare(b.displayText);
  });

  return sorted.slice(0, 5);
}

function fillRanking(rows: RankedCaption[]) {
  return Array.from({ length: 5 }, (_, index) => rows[index] ?? null);
}

function createScoreDistributionFromCounts(counts: DistributionBucketCount[]) {
  return [
    {
      label: "Strong Positive",
      count: counts.find((bucket) => bucket.label === "Strong Positive")?.count ?? 0,
      tone: "positive" as const,
    },
    {
      label: "Positive",
      count: counts.find((bucket) => bucket.label === "Positive")?.count ?? 0,
      tone: "positive" as const,
    },
    {
      label: "Neutral",
      count: counts.find((bucket) => bucket.label === "Neutral")?.count ?? 0,
      tone: "neutral" as const,
    },
    {
      label: "Negative",
      count: counts.find((bucket) => bucket.label === "Negative")?.count ?? 0,
      tone: "negative" as const,
    },
    {
      label: "Strong Negative",
      count: counts.find((bucket) => bucket.label === "Strong Negative")?.count ?? 0,
      tone: "negative" as const,
    },
  ];
}

function SectionMessage({ children }: { children: ReactNode }) {
  return <p className="text-sm text-[color:var(--muted-foreground)]">{children}</p>;
}

function getToneClasses(tone: "positive" | "neutral" | "negative") {
  if (tone === "positive") {
    return {
      badge: "bg-[color:var(--accent-soft)] text-[color:var(--accent)]",
      bar: "bg-[color:var(--accent)]",
      soft: "bg-[color:var(--accent-soft)]",
      border: "border-[color:var(--accent-soft)]",
    };
  }

  if (tone === "negative") {
    return {
      badge: "bg-[color:var(--danger-soft)] text-[color:var(--danger)]",
      bar: "bg-[color:var(--danger)]",
      soft: "bg-[color:var(--danger-soft)]",
      border: "border-[color:var(--danger-soft)]",
    };
  }

  return {
    badge: "bg-[color:var(--panel-muted)] text-[color:var(--muted-foreground)]",
    bar: "bg-[color:var(--muted-foreground)]",
    soft: "bg-[color:var(--panel-muted)]",
    border: "border-[color:var(--border)]",
  };
}

function OverviewCard({
  label,
  value,
  sublabel,
  accent,
}: {
  label: string;
  value: ReactNode;
  sublabel: ReactNode;
  accent: ReactNode;
}) {
  return (
    <article className="group relative overflow-hidden rounded-[26px] border border-[color:var(--border)] bg-[color:var(--panel)] p-5 shadow-[var(--shadow-soft)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_24px_60px_rgba(61,49,39,0.12)]">
      <div className="absolute inset-x-0 top-0 h-16 bg-[radial-gradient(circle_at_top_right,var(--glow),transparent_60%)] opacity-80" />
      <div className="relative flex min-h-[168px] flex-col">
        <div className="flex items-start justify-between gap-3">
          <p className="text-[11px] uppercase tracking-[0.26em] text-[color:var(--muted-foreground)]">{label}</p>
          {accent}
        </div>
        <div className="mt-5">{value}</div>
        <p className="mt-3 text-xs leading-5 text-[color:var(--muted-foreground)]">{sublabel}</p>
        <div className="mt-auto pt-5">
          <div className="h-px w-full bg-[color:var(--border)]" />
        </div>
      </div>
    </article>
  );
}

function TinyBars({
  values,
  tone,
}: {
  values: number[];
  tone: "positive" | "neutral" | "negative";
}) {
  const { bar, soft } = getToneClasses(tone);

  return (
    <div className="flex items-end gap-1 rounded-full border border-[color:var(--border)] bg-[color:var(--panel-muted)] px-2 py-1">
      {values.map((value, index) => (
        <div
          key={`${tone}-${index}`}
          className={`w-1.5 rounded-full transition-all duration-300 ${value > 0.55 ? bar : soft}`}
          style={{ height: `${16 + value * 18}px` }}
        />
      ))}
    </div>
  );
}

function SegmentedBar({
  leftCount,
  rightCount,
}: {
  leftCount: number;
  rightCount: number;
}) {
  const total = leftCount + rightCount;
  const leftWidth = getShare(leftCount, total);
  const rightWidth = total > 0 ? 100 - leftWidth : 0;

  return (
    <div className="overflow-hidden rounded-full border border-[color:var(--border)] bg-[color:var(--panel-muted)]">
      <div className="flex h-3 w-full">
        <div
          className="bg-[color:var(--accent)] transition-all duration-500"
          style={{ width: `${leftWidth}%` }}
        />
        <div
          className="bg-[color:var(--danger)] transition-all duration-500"
          style={{ width: `${rightWidth}%` }}
        />
      </div>
    </div>
  );
}

function StatusPill({
  label,
  tone,
}: {
  label: string;
  tone: "positive" | "neutral" | "negative";
}) {
  const { badge } = getToneClasses(tone);

  return (
    <span className={`inline-flex rounded-full px-2.5 py-1 text-[10px] uppercase tracking-[0.22em] ${badge}`}>
      {label}
    </span>
  );
}

function VoteStatBlock({
  label,
  value,
  pill,
  tone,
  signed = false,
}: {
  label: string;
  value: number;
  pill: string;
  tone: "positive" | "neutral" | "negative";
  signed?: boolean;
}) {
  const { soft } = getToneClasses(tone);

  return (
    <div className="rounded-[24px] border border-[color:var(--border)] bg-[color:var(--panel)] p-5">
      <div className="flex items-start justify-between gap-3">
        <p className="text-[11px] uppercase tracking-[0.24em] text-[color:var(--muted-foreground)]">{label}</p>
        <StatusPill label={pill} tone={tone} />
      </div>
      <p className="mt-6 text-4xl leading-none tracking-tight">{signed ? formatSignedValue(value) : value}</p>
      <div className={`mt-5 h-1.5 rounded-full ${soft}`} />
    </div>
  );
}

function DistributionRow({
  bucket,
  largestCount,
}: {
  bucket: DistributionBucket;
  largestCount: number;
}) {
  const { bar, badge } = getToneClasses(bucket.tone);
  const width = largestCount > 0 ? (bucket.count / largestCount) * 100 : 0;

  return (
    <div className="grid gap-3 rounded-[22px] border border-[color:var(--border)] bg-[color:var(--panel)] p-4 md:grid-cols-[minmax(0,180px)_56px_minmax(0,1fr)] md:items-center">
      <p className="text-sm font-medium text-[color:var(--foreground)]">{bucket.label}</p>
      <p className="text-right text-sm text-[color:var(--muted-foreground)]">{bucket.count}</p>
      <div className="flex items-center gap-3">
        <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-[color:var(--panel-muted)]">
          <div
            className={`h-full rounded-full transition-all duration-500 ${bar}`}
            style={{ width: `${width}%` }}
          />
        </div>
        <span className={`inline-flex min-w-[58px] justify-center rounded-full px-2.5 py-1 text-[10px] uppercase tracking-[0.18em] ${badge}`}>
          {largestCount > 0 ? formatRatio(bucket.count / largestCount) : "0.0%"}
        </span>
      </div>
    </div>
  );
}

function RankingCard({ caption }: { caption: RankedCaption | null }) {
  if (!caption) {
    return (
      <article className="min-h-[148px] rounded-[24px] border border-[color:var(--border)] bg-[color:var(--panel)] p-5">
        <div className="flex gap-4">
          <div className="w-1 rounded-full bg-[color:var(--border)]" />
          <div className="flex-1">
            <p className="text-sm leading-6 text-[color:var(--muted-foreground)]">No additional caption score data.</p>
            <p className="mt-4 text-[11px] uppercase tracking-[0.22em] text-[color:var(--muted-foreground)]">Total votes: 0</p>
          </div>
        </div>
      </article>
    );
  }

  const tone = caption.totalVotes > 0 ? "positive" : caption.totalVotes < 0 ? "negative" : "neutral";
  const { badge, soft } = getToneClasses(tone);

  return (
    <article className="group min-h-[148px] rounded-[24px] border border-[color:var(--border)] bg-[color:var(--panel)] p-5 shadow-[var(--shadow-soft)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_22px_54px_rgba(61,49,39,0.1)]">
      <div className="flex gap-4">
        <div className={`w-1 rounded-full ${soft}`} />
        <div className="flex-1">
          <div className="flex items-start justify-between gap-3">
            <p
              className="text-sm leading-6 text-[color:var(--foreground)]"
              style={{
                display: "-webkit-box",
                WebkitBoxOrient: "vertical",
                WebkitLineClamp: 3,
                overflow: "hidden",
              }}
            >
              {caption.displayText}
            </p>
            <span className={`inline-flex shrink-0 rounded-full px-3 py-1.5 text-xs font-medium transition-colors duration-200 ${badge}`}>
              {formatSignedValue(caption.totalVotes)}
            </span>
          </div>
          <div className="mt-4 flex items-center justify-between gap-3 text-[11px] uppercase tracking-[0.22em] text-[color:var(--muted-foreground)]">
            <span>Total votes: {caption.totalVotes}</span>
          </div>
        </div>
      </div>
    </article>
  );
}

export default async function CaptionStatsPage() {
  const { supabase } = await requireStudioPageAccess();

  const [
    { data: captionScoresData, error: captionScoresError },
    { count: totalVoteCount, error: totalVotesError },
    { count: upvoteCount, error: upvotesError },
    { count: downvoteCount, error: downvotesError },
    { count: strongPositiveCount, error: strongPositiveError },
    { count: positiveCount, error: positiveError },
    { count: neutralCount, error: neutralError },
    { count: negativeCount, error: negativeError },
    { count: strongNegativeCount, error: strongNegativeError },
  ] = await Promise.all([
    supabase.from("caption_scores").select("id, display_text, total_votes"),
    supabase.from("caption_votes").select("vote_value", { count: "exact", head: true }),
    supabase.from("caption_votes").select("vote_value", { count: "exact", head: true }).eq("vote_value", 1),
    supabase.from("caption_votes").select("vote_value", { count: "exact", head: true }).eq("vote_value", -1),
    supabase.from("caption_scores").select("id", { count: "exact", head: true }).gte("total_votes", 10),
    supabase.from("caption_scores").select("id", { count: "exact", head: true }).gte("total_votes", 1).lte("total_votes", 9),
    supabase.from("caption_scores").select("id", { count: "exact", head: true }).eq("total_votes", 0),
    supabase.from("caption_scores").select("id", { count: "exact", head: true }).gte("total_votes", -9).lte("total_votes", -1),
    supabase.from("caption_scores").select("id", { count: "exact", head: true }).lte("total_votes", -10),
  ]);

  const captionScores = createCaptionRows((captionScoresData ?? []) as CaptionScoreRow[]);
  const voteSectionError = totalVotesError || upvotesError || downvotesError;
  const scoreSectionError = captionScoresError;
  const distributionSectionError =
    strongPositiveError || positiveError || neutralError || negativeError || strongNegativeError;

  const totalVotes = voteSectionError ? 0 : totalVoteCount ?? 0;
  const upvotes = voteSectionError ? 0 : upvoteCount ?? 0;
  const downvotes = voteSectionError ? 0 : downvoteCount ?? 0;
  const totalScoredCaptions = scoreSectionError ? 0 : captionScores.length;
  const totalScoreValue = scoreSectionError ? 0 : captionScores.reduce((sum, row) => sum + row.totalVotes, 0);
  const averageCaptionScore = formatAverage(totalScoreValue, totalScoredCaptions);
  const positiveRatio = totalVotes > 0 ? upvotes / totalVotes : 0;
  const netVoteDifference = upvotes - downvotes;

  const scoreDistribution = distributionSectionError
    ? createScoreDistributionFromCounts([])
    : createScoreDistributionFromCounts([
        { label: "Strong Positive", count: strongPositiveCount ?? 0 },
        { label: "Positive", count: positiveCount ?? 0 },
        { label: "Neutral", count: neutralCount ?? 0 },
        { label: "Negative", count: negativeCount ?? 0 },
        { label: "Strong Negative", count: strongNegativeCount ?? 0 },
      ]);
  const largestBucketCount = scoreDistribution.reduce((max, bucket) => Math.max(max, bucket.count), 0);
  const topCaptions = fillRanking(scoreSectionError ? [] : createRanking(captionScores, "desc"));
  const bottomCaptions = fillRanking(scoreSectionError ? [] : createRanking(captionScores, "asc"));

  const heroBarValues = [
    Math.min(totalVotes / 25, 1),
    Math.min(totalScoredCaptions / 25, 1),
    Math.min(Math.abs(Number(averageCaptionScore)) / 10, 1),
    positiveRatio,
  ];

  return (
    <div className="space-y-8">
      <section className="rounded-[30px] border border-[color:var(--border)] bg-[color:var(--panel-strong)] p-7 shadow-[var(--shadow-soft)]">
        <div className="max-w-3xl">
          <p className="text-[11px] uppercase tracking-[0.32em] text-[color:var(--muted-foreground)]">Caption Analytics</p>
          <h2 className="mt-3 font-serif text-5xl leading-none tracking-tight md:text-6xl">Confirmed vote activity and caption score performance in one admin view.</h2>
          <p className="mt-5 text-sm leading-7 text-[color:var(--muted-foreground)]">
            This page uses only the confirmed data sources <code>caption_votes</code> and <code>caption_scores</code>, with section-level fallbacks if a query fails or a table is empty.
          </p>
        </div>

        <div className="mt-7 grid gap-4 xl:grid-cols-4">
          <OverviewCard
            label="Total Votes"
            value={<p className="text-4xl leading-none md:text-5xl">{totalVotes}</p>}
            sublabel="Count of raw vote records from caption_votes."
            accent={<TinyBars values={[0.35, 0.58, 0.46, heroBarValues[0]]} tone="neutral" />}
          />

          <OverviewCard
            label="Total Scored Captions"
            value={<p className="text-4xl leading-none md:text-5xl">{totalScoredCaptions}</p>}
            sublabel="Count of aggregated caption score rows from caption_scores."
            accent={<TinyBars values={[0.3, 0.44, 0.61, heroBarValues[1]]} tone="positive" />}
          />

          <OverviewCard
            label="Average Caption Score"
            value={<p className="text-4xl leading-none md:text-5xl">{averageCaptionScore}</p>}
            sublabel="Average of caption_scores.total_votes, rounded to 2 decimals."
            accent={<TinyBars values={[0.28, 0.5, 0.42, heroBarValues[2]]} tone="neutral" />}
          />

          <OverviewCard
            label="Vote Sentiment"
            value={
              <div className="space-y-4">
                <div className="grid grid-cols-3 gap-3 text-sm">
                  <div>
                    <p className="text-[10px] uppercase tracking-[0.2em] text-[color:var(--muted-foreground)]">Upvotes</p>
                    <p className="mt-1 text-lg leading-none">{upvotes}</p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-[0.2em] text-[color:var(--muted-foreground)]">Downvotes</p>
                    <p className="mt-1 text-lg leading-none">{downvotes}</p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-[0.2em] text-[color:var(--muted-foreground)]">Positive Ratio</p>
                    <p className="mt-1 text-lg leading-none">{formatRatio(positiveRatio)}</p>
                  </div>
                </div>
                <SegmentedBar leftCount={upvotes} rightCount={downvotes} />
              </div>
            }
            sublabel="Vote sentiment is based only on caption_votes.vote_value values of 1 and -1."
            accent={<StatusPill label="Sentiment" tone={positiveRatio >= 0.5 ? "positive" : "negative"} />}
          />
        </div>

        <div className="mt-4 space-y-2">
          {voteSectionError ? (
            <SectionMessage>Vote totals are unavailable right now. Vote-based sections are showing safe zero values.</SectionMessage>
          ) : null}
          {scoreSectionError ? (
            <SectionMessage>Caption score aggregates are unavailable right now. Score-based sections are showing safe zero values.</SectionMessage>
          ) : null}
        </div>
      </section>

      <section className="rounded-[28px] border border-[color:var(--border)] bg-[color:var(--panel)] p-5 shadow-[var(--shadow-soft)]">
        <p className="text-[11px] uppercase tracking-[0.32em] text-[color:var(--muted-foreground)]">Voting Breakdown</p>
        <h3 className="mt-2 font-serif text-4xl tracking-tight">Voting Breakdown</h3>
        <p className="mt-3 max-w-2xl text-sm leading-7 text-[color:var(--muted-foreground)]">
          A compact view of raw vote polarity from <code>caption_votes</code>, with a shared sentiment bar for immediate scanability.
        </p>

        {voteSectionError ? (
          <div className="mt-5">
            <SectionMessage>Vote breakdown is unavailable right now. Positive, negative, and net values are showing safe zero values.</SectionMessage>
          </div>
        ) : null}

        <div className="mt-6 grid gap-4 lg:grid-cols-3">
          <VoteStatBlock label="Positive Votes" value={upvotes} pill="Positive" tone="positive" />
          <VoteStatBlock label="Negative Votes" value={downvotes} pill="Negative" tone="negative" />
          <VoteStatBlock
            label="Net Vote Difference"
            value={netVoteDifference}
            pill="Net"
            tone={netVoteDifference > 0 ? "positive" : netVoteDifference < 0 ? "negative" : "neutral"}
            signed
          />
        </div>

        <div className="mt-6 rounded-[24px] border border-[color:var(--border)] bg-[color:var(--panel-strong)] p-5">
          <SegmentedBar leftCount={upvotes} rightCount={downvotes} />
          <div className="mt-3 flex items-center justify-between gap-4 text-xs uppercase tracking-[0.2em] text-[color:var(--muted-foreground)]">
            <span>Positive {formatRatio(getShare(upvotes, totalVotes) / 100)}</span>
            <span>Negative {formatRatio(getShare(downvotes, totalVotes) / 100)}</span>
          </div>
        </div>
      </section>

      <section className="rounded-[28px] border border-[color:var(--border)] bg-[color:var(--panel)] p-5 shadow-[var(--shadow-soft)]">
        <p className="text-[11px] uppercase tracking-[0.32em] text-[color:var(--muted-foreground)]">Caption Score Distribution</p>
        <h3 className="mt-2 font-serif text-4xl tracking-tight">Caption Score Distribution</h3>
        <p className="mt-3 max-w-2xl text-sm leading-7 text-[color:var(--muted-foreground)]">
          Distribution buckets are grouped directly from <code>caption_scores.total_votes</code> without any speculative joins or derived flavor breakdowns.
        </p>

        {distributionSectionError ? (
          <div className="mt-5">
            <SectionMessage>Caption score distribution is unavailable right now. Bucket counts are showing safe zero values.</SectionMessage>
          </div>
        ) : null}

        <div className="mt-6 space-y-3">
          {scoreDistribution.map((bucket) => (
            <DistributionRow key={bucket.label} bucket={bucket} largestCount={largestBucketCount} />
          ))}
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-2">
        <div className="rounded-[28px] border border-[color:var(--border)] bg-[color:var(--panel)] p-5 shadow-[var(--shadow-soft)]">
          <p className="text-[11px] uppercase tracking-[0.32em] text-[color:var(--muted-foreground)]">Top Captions</p>
          <h3 className="mt-2 font-serif text-4xl tracking-tight">Highest total votes</h3>
          <div className="mt-5 space-y-3">
            {scoreSectionError ? (
              <SectionMessage>Caption rankings are unavailable right now for this section.</SectionMessage>
            ) : totalScoredCaptions === 0 ? (
              <SectionMessage>No caption score data yet.</SectionMessage>
            ) : (
              topCaptions.map((caption, index) => <RankingCard key={caption?.id ?? `top-empty-${index}`} caption={caption} />)
            )}
          </div>
        </div>

        <div className="rounded-[28px] border border-[color:var(--border)] bg-[color:var(--panel)] p-5 shadow-[var(--shadow-soft)]">
          <p className="text-[11px] uppercase tracking-[0.32em] text-[color:var(--muted-foreground)]">Bottom Captions</p>
          <h3 className="mt-2 font-serif text-4xl tracking-tight">Lowest total votes</h3>
          <div className="mt-5 space-y-3">
            {scoreSectionError ? (
              <SectionMessage>Caption rankings are unavailable right now for this section.</SectionMessage>
            ) : totalScoredCaptions === 0 ? (
              <SectionMessage>No caption score data yet.</SectionMessage>
            ) : (
              bottomCaptions.map((caption, index) => (
                <RankingCard key={caption?.id ?? `bottom-empty-${index}`} caption={caption} />
              ))
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
