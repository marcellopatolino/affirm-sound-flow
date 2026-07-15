import { useEffect, useRef } from "react";

export function AudioViz({
  analyserRef,
  active,
}: {
  analyserRef: React.RefObject<AnalyserNode | null>;
  active: boolean;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    let raf = 0;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const draw = () => {
      const analyser = analyserRef.current;
      const W = canvas.width;
      const H = canvas.height;
      ctx.clearRect(0, 0, W, H);
      if (analyser && active) {
        const bufferLength = analyser.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);
        analyser.getByteFrequencyData(dataArray);
        const barW = W / bufferLength;
        for (let i = 0; i < bufferLength; i++) {
          const v = dataArray[i] / 255;
          const barH = v * H;
          const grad = ctx.createLinearGradient(0, H, 0, H - barH);
          grad.addColorStop(0, "#DDB04A");
          grad.addColorStop(1, "#F1D582");
          ctx.fillStyle = grad;
          ctx.fillRect(i * barW, H - barH, barW - 1, barH);
        }
      } else {
        ctx.fillStyle = "rgba(221,176,74,0.15)";
        for (let i = 0; i < 32; i++) {
          ctx.fillRect((i * canvas.width) / 32, canvas.height / 2 - 1, canvas.width / 32 - 1, 2);
        }
      }
      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, [analyserRef, active]);
  return (
    <canvas
      ref={canvasRef}
      width={480}
      height={64}
      className="w-full h-16 rounded-md bg-background/60 border border-border"
    />
  );
}