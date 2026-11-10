function GearSVG({ size }: { size: number }) {
  const cx = 50, cy = 50;
  const outerR = 47, innerR = 36, hubR = 11;
  const teeth = 14;
  const pts: string[] = [];
  for (let i = 0; i < teeth; i++) {
    const step = (2 * Math.PI) / teeth;
    const a0 = i * step - Math.PI / 2;
    const a1 = a0 + step * 0.3;
    const a2 = a0 + step * 0.7;
    const a3 = a0 + step;
    pts.push(
      `${cx + innerR * Math.cos(a0)},${cy + innerR * Math.sin(a0)}`,
      `${cx + outerR * Math.cos(a1)},${cy + outerR * Math.sin(a1)}`,
      `${cx + outerR * Math.cos(a2)},${cy + outerR * Math.sin(a2)}`,
      `${cx + innerR * Math.cos(a3)},${cy + innerR * Math.sin(a3)}`,
    );
  }
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" fill="currentColor">
      <polygon points={pts.join(" ")} />
      <circle cx={cx} cy={cy} r={hubR} fill="none" stroke="currentColor" strokeWidth="4" />
    </svg>
  );
}
export default GearSVG;
