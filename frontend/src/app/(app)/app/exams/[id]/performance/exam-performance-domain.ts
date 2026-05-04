export type ScoreRecord = { student: string; classSection: string; score: number };

export function calculatePerformanceMetrics(scores: ScoreRecord[]) {
  const values = scores.map((item) => item.score);
  const average = Math.round(values.reduce((sum, score) => sum + score, 0) / Math.max(values.length, 1));
  return {
    average,
    min: values.length ? Math.min(...values) : 0,
    max: values.length ? Math.max(...values) : 0,
    count: values.length,
    distribution: {
      high: values.filter((score) => score >= 80).length,
      medium: values.filter((score) => score >= 60 && score < 80).length,
      low: values.filter((score) => score < 60).length,
    },
  };
}

export function getRemedialGroups(scores: ScoreRecord[], threshold: number) {
  return scores.filter((item) => item.score < threshold);
}

export function compareClassPerformance(scores: ScoreRecord[]) {
  const grouped = new Map<string, number[]>();
  for (const score of scores) grouped.set(score.classSection, [...(grouped.get(score.classSection) ?? []), score.score]);
  return [...grouped.entries()]
    .map(([classSection, values]) => ({ classSection, average: Math.round(values.reduce((sum, value) => sum + value, 0) / values.length), students: values.length }))
    .sort((a, b) => b.average - a.average);
}
