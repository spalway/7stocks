// Time until the next hourly drop.
//
// Takes a plain seconds count rather than reading a clock itself, so the page
// owns the single ticking value and every countdown on screen agrees. Two
// components each running their own interval drift apart within a minute.

const pad = (n) => String(Math.max(0, Math.floor(n))).padStart(2, '0');

export default function Countdown({ seconds = 0, inline = false }) {
  // Null means "not started": the first countdown begins the moment the
  // contract address is added, and until then the clock shows dashes rather
  // than a number that would be a lie.
  if (seconds === null) {
    if (inline) return <span className="countdown-inline is-idle">--:--</span>;
    return (
      <div className="countdown-row is-idle" role="timer" aria-label="Starts at launch">
        <span className="countdown-cell"><b>--</b><i>min</i></span>
        <span className="countdown-sep">:</span>
        <span className="countdown-cell"><b>--</b><i>sec</i></span>
      </div>
    );
  }

  const m = Math.floor(seconds / 60);
  const s = seconds % 60;

  if (inline) return <span className="countdown-inline">{pad(m)}:{pad(s)}</span>;

  return (
    <div className="countdown-row" role="timer" aria-label={`${m} minutes ${s} seconds`}>
      <span className="countdown-cell"><b>{pad(m)}</b><i>min</i></span>
      <span className="countdown-sep">:</span>
      <span className="countdown-cell"><b>{pad(s)}</b><i>sec</i></span>
    </div>
  );
}
