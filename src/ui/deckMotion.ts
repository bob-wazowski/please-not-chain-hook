/** Two packet cuts, interleaving edges and a short, independent deal. */
export function deckMotion(
  card: DOMRect,
  table: DOMRect,
  index: number,
  count: number,
  shuffleSeconds: number,
): { frames: Keyframe[]; duration: number; shuffleDuration: number } {
  const shuffleDuration = shuffleSeconds * 1000;
  const stagger = Math.min(18, 240 / Math.max(1, count - 1));
  const departure = shuffleDuration + index * stagger;
  const flight = 290;
  const duration = shuffleDuration + (count - 1) * stagger + flight;
  const x = table.left + table.width / 2 - card.left - card.width / 2;
  const y =
    table.top + Math.min(table.height / 2, 180) - card.top - card.height / 2;
  const sx = Math.min(96, table.width * 0.27) / card.width;
  const sy = 126 / card.height;
  const half = Math.ceil(count / 2);
  const side = index < half ? -1 : 1;
  const rank = index % half;
  const layer = (index - count / 2) * 0.45;
  const interleaved = rank * 2 + (side === 1 ? 1 : 0);
  const pose = (dx: number, dy: number, angle: number, tilt = 0, lift = 0) =>
    `translate3d(${x + dx}px,${y + dy}px,${lift}px) rotateZ(${angle}deg) rotateY(${tilt}deg) scale(${sx},${sy})`;
  const frame = (
    time: number,
    transform: string,
    zIndex: number,
  ): Keyframe => ({
    offset: time / duration,
    transform,
    zIndex,
    easing: "cubic-bezier(.42,0,.2,1)",
  });
  const frames = [
    frame(0, pose(layer * 0.35, -layer, -4), index + 1),
    frame(
      shuffleDuration * 0.12,
      pose(side * 16, -layer - 7, side * 4, side * 5, 8),
      index + 1,
    ),
    frame(
      shuffleDuration * 0.28,
      pose(side * 58, -rank * 0.7 - 12, side * 13, side * -16, 20),
      index + 1,
    ),
    frame(
      shuffleDuration * (0.43 + (rank / Math.max(1, half)) * 0.055),
      pose(side * 8, -interleaved * 0.5, side * 2, 0, 3),
      interleaved + 1,
    ),
    frame(
      shuffleDuration * 0.54,
      pose(layer * 0.2, -layer, 3),
      interleaved + 1,
    ),
    frame(
      shuffleDuration * 0.67,
      pose(
        -side * 49,
        -rank * 0.7 + (side < 0 ? -22 : 8),
        -side * 11,
        side * 10,
        side < 0 ? 26 : 4,
      ),
      count - interleaved + 1,
    ),
    frame(
      shuffleDuration * (0.81 + (rank / Math.max(1, half)) * 0.055),
      pose(-side * 5, -layer, -side * 2, 0, 3),
      count - index,
    ),
    frame(shuffleDuration * 0.95, pose(layer * 0.2, -layer, 0), count - index),
    frame(departure, pose(layer * 0.2, -layer, 0), count - index),
    {
      offset: (departure + flight * 0.45) / duration,
      transform: `translate3d(${x * 0.48}px,${y * 0.48 - 14}px,28px) rotateZ(${index % 2 ? 4 : -4}deg) scale(${sx + (1 - sx) * 0.6},${sy + (1 - sy) * 0.6})`,
      zIndex: count + 2,
      easing: "cubic-bezier(.12,.65,.25,1)",
    },
    {
      offset: (departure + flight) / duration,
      transform: "translate3d(0,0,0) rotateZ(0deg) scale(1,1)",
      zIndex: 1,
    },
  ];
  if (departure + flight < duration)
    frames.push({
      offset: 1,
      transform: "translate3d(0,0,0) rotateZ(0deg) scale(1,1)",
      zIndex: 1,
    });
  return { frames, duration, shuffleDuration };
}
