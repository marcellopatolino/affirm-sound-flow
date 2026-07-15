export function VoxLogo({ size = 56 }: { size?: number }) {
  const s = size;
  return (
    <svg width={s} height={s} viewBox="0 0 64 64" fill="none" aria-label="VoxAffirm">
      <defs>
        <linearGradient id="voxg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#DDB04A" />
          <stop offset="100%" stopColor="#F1D582" />
        </linearGradient>
      </defs>
      <circle cx="32" cy="32" r="30" stroke="url(#voxg)" strokeWidth="1.5" fill="rgba(20,20,30,0.6)" />
      {[10, 14, 18, 46, 50, 54].map((x, i) => {
        const h = [10, 18, 26, 26, 18, 10][i];
        return (
          <rect key={x} x={x} y={32 - h / 2} width="2" height={h} rx="1" fill="url(#voxg)" opacity={0.85} />
        );
      })}
      <path d="M22 20 L32 46 L42 20" stroke="url(#voxg)" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </svg>
  );
}