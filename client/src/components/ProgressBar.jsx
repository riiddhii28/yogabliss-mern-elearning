export default function ProgressBar({ completed, total, label = "Course progress" }) {
  const percentage = total > 0 ? Math.min(100, Math.max(0, Math.round(completed / total * 100))) : 0;
  return (
    <div className="learning-progress">
      <div className="progress-head">
        <span>{label}</span><span>{completed}/{total} lessons · {percentage}%</span>
      </div>
      <progress value={percentage} max="100" aria-label={label}>{percentage}%</progress>
    </div>
  );
}
