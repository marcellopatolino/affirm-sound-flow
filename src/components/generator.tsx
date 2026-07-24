import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { useServerFn } from "@tanstack/react-start";
import { Link } from "@tanstack/react-router";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { AudioViz } from "./audio-viz";
import { useAudioMixer, type VoiceFormat } from "@/lib/audio-mixer";
import { SOUND_IDS, type SoundId } from "@/lib/background-sounds";
import { synthesizeSpeech } from "@/lib/tts.functions";
import { saveLibraryItem } from "@/lib/library.functions";
import { verifyCode } from "@/lib/pro.functions";
import { limitsFor } from "@/lib/limits";
import { startCheckout } from "@/lib/checkout";
import type { Lang } from "@/lib/translations";
import { Play, Pause, Download, Trash2, Plus, Lock, Sparkles } from "lucide-react";

const FREQUENCIES = [432, 528, 639, 741, 852, 963];

export function Generator({
  isAuthed,
  plan,
  onSaved,
}: {
  isAuthed: boolean;
  plan: "free" | "pro";
  onSaved?: () => void;
}) {
  const { t, i18n } = useTranslation();
  const lang = (i18n.language?.slice(0, 2) as Lang) ?? "pt";
  const limits = limitsFor(plan);

  const [affirmations, setAffirmations] = useState<string[]>([""]);
  const [sound, setSound] = useState<SoundId>("rain");
  const [format, setFormat] = useState<VoiceFormat>("normal");
  const [frequency, setFrequency] = useState(432);
  const [voiceVol, setVoiceVolL] = useState(45);
  const [bgVolL, setBgVolL] = useState(70);
  const [freqVolL, setFreqVolL] = useState(20);
  const [durationMin, setDurationMin] = useState(3);
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(false);
  const [code, setCode] = useState("");

  const mixer = useAudioMixer();
  const ttsFn = useServerFn(synthesizeSpeech);
  const saveFn = useServerFn(saveLibraryItem);
  const verifyFn = useServerFn(verifyCode);

  useEffect(() => { mixer.setVoiceVol(voiceVol); }, [voiceVol]); // eslint-disable-line
  useEffect(() => { mixer.setBgVol(bgVolL); }, [bgVolL]); // eslint-disable-line
  useEffect(() => { mixer.setFreqVol(freqVolL); }, [freqVolL]); // eslint-disable-line
  useEffect(() => { if (ready) mixer.setFrequency(frequency); }, [frequency]); // eslint-disable-line
  useEffect(() => { if (ready) mixer.setFormat(format); }, [format]); // eslint-disable-line
  useEffect(() => { if (ready) mixer.setSound(sound); }, [sound]); // eslint-disable-line

  const totalChars = affirmations.reduce((n, a) => n + a.length, 0);
  const affirmCount = affirmations.filter((a) => a.trim()).length;

  const canAdd = affirmations.length < limits.maxAffirmations;
  const overChars = totalChars > limits.maxChars;
  const overDuration = durationMin > limits.maxDurationMin;

  async function handleGenerate() {
    const clean = affirmations.map((s) => s.trim()).filter(Boolean);
    if (clean.length === 0) return toast.error("Adicione ao menos uma afirmação");
    if (clean.length > limits.maxAffirmations) return toast.error(t("gen_free_limit_affirmations"));
    if (totalChars > limits.maxChars) return toast.error(t("gen_free_limit_chars"));
    if (durationMin > limits.maxDurationMin) return toast.error(t("gen_free_limit_duration"));

    setLoading(true);
    try {
      const AC = window.AudioContext;
      const decoder = new AC();
      const buffers: AudioBuffer[] = [];
      for (const text of clean) {
        const { base64 } = await ttsFn({ data: { text, lang } });
        const bin = atob(base64);
        const bytes = new Uint8Array(bin.length);
        for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
        const buf = await decoder.decodeAudioData(bytes.buffer.slice(0) as ArrayBuffer);
        buffers.push(buf);
      }
      decoder.close().catch(() => {});

      await mixer.generate(
        { sound, frequency, format, voiceVol, bgVol: bgVolL, freqVol: freqVolL, durationMin },
        buffers,
      );
      setReady(true);

      if (isAuthed) {
        try {
          const res = await saveFn({
            data: {
              name: clean[0].slice(0, 60),
              affirmations: clean,
              sound,
              frequency,
              format,
              voice_vol: voiceVol,
              bg_vol: bgVolL,
              freq_vol: freqVolL,
              duration: durationMin,
              lang,
            },
          });
          if (res.saved) {
            toast.success(t("gen_saved"));
            onSaved?.();
          } else if (res.reason === "free_limit") {
            toast.warning(t("gen_free_limit_saved"));
          }
        } catch (err) {
          console.error(err);
          toast.error(err instanceof Error ? err.message : "Erro");
        }
      }
    } catch (err) {

      console.error(err);
      toast.error(err instanceof Error ? err.message : "Erro");
    } finally {
      setLoading(false);
    }
  }

  async function handleDownload() {
    if (!limits.downloadAllowed) {
      toast.error(t("gen_download_locked"));
      return;
    }
    try {
      const blob = await mixer.download();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `voxaffirm-${Date.now()}.wav`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro no download");
    }
  }

  async function handleVerifyCode() {
    if (!isAuthed) {
      toast.error("Faça login para ativar seu código");
      return;
    }
    try {
      const res = await verifyFn({ data: { code } });
      if (res.ok) {
        toast.success("Pro ativado!");
        setTimeout(() => window.location.reload(), 800);
      } else {
        toast.error(res.error ?? "invalid");
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro");
    }
  }

  return (
    <div className="w-full max-w-3xl mx-auto space-y-6">
      <Card className="p-6 space-y-4 bg-card/70 backdrop-blur border-border">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">{t("gen_affirmations")}</h2>
          <span className="mono text-xs text-muted-foreground">
            {affirmCount}/{limits.maxAffirmations === Infinity ? "∞" : limits.maxAffirmations} · {totalChars} {t("gen_chars")}
          </span>
        </div>
        {affirmations.map((a, i) => (
          <div key={i} className="flex gap-2">
            <Textarea
              value={a}
              onChange={(e) => {
                const next = [...affirmations];
                next[i] = e.target.value;
                setAffirmations(next);
              }}
              placeholder={t("gen_placeholder")}
              className="min-h-[60px] resize-none"
              rows={2}
            />
            {affirmations.length > 1 && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setAffirmations(affirmations.filter((_, k) => k !== i))}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>
        ))}
        {overChars && <p className="text-xs text-destructive">{t("gen_free_limit_chars")}</p>}
        <Button
          variant="outline"
          onClick={() => canAdd && setAffirmations([...affirmations, ""])}
          disabled={!canAdd}
        >
          <Plus className="h-4 w-4 mr-1" /> {t("gen_add")}
        </Button>
      </Card>

      <Card className="p-6 space-y-6 bg-card/70 backdrop-blur border-border">
        <h2 className="text-lg font-semibold">{t("gen_settings")}</h2>
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="text-sm text-muted-foreground mb-1 block">{t("gen_sound")}</label>
            <Select value={sound} onValueChange={(v) => setSound(v as SoundId)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {SOUND_IDS.map((s) => (
                  <SelectItem key={s} value={s}>{t(`sound_${s}`)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-sm text-muted-foreground mb-1 block">{t("gen_format")}</label>
            <Select value={format} onValueChange={(v) => setFormat(v as VoiceFormat)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="whisper">{t("gen_format_whisper")}</SelectItem>
                <SelectItem value="normal">{t("gen_format_normal")}</SelectItem>
                <SelectItem value="accelerated">{t("gen_format_accelerated")}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="sm:col-span-2">
            <label className="text-sm text-muted-foreground mb-1 block">{t("gen_frequency")}</label>
            <Select value={String(frequency)} onValueChange={(v) => setFrequency(Number(v))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {FREQUENCIES.map((f) => (
                  <SelectItem key={f} value={String(f)}>{t(`freq_${f}`)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <SliderRow label={t("gen_voice_vol")} value={voiceVol} onChange={setVoiceVolL} />
        <SliderRow label={t("gen_bg_vol")} value={bgVolL} onChange={setBgVolL} />
        <SliderRow label={t("gen_freq_vol")} value={freqVolL} onChange={setFreqVolL} />

        <div>
          <label className="text-sm text-muted-foreground mb-1 block">
            {t("gen_duration")} <span className="mono text-primary">· {durationMin} min</span>
          </label>
          <Slider
            value={[durationMin]}
            min={1}
            max={limits.maxDurationMin === Infinity ? 120 : limits.maxDurationMin}
            step={1}
            onValueChange={(v) => setDurationMin(v[0])}
          />
          {overDuration && <p className="mt-1 text-xs text-destructive">{t("gen_free_limit_duration")}</p>}
        </div>
      </Card>

      <Button
        onClick={handleGenerate}
        disabled={loading}
        className="w-full h-14 text-base font-semibold gold-gradient text-primary-foreground glow-primary hover:opacity-95"
      >
        <Sparkles className="h-5 w-5 mr-2" />
        {loading ? t("gen_button_loading") : t("gen_button")}
      </Button>

      {ready && (
        <Card className="p-6 space-y-4 bg-card/70 backdrop-blur border-primary/30">
          <AudioViz analyserRef={mixer.analyserRef} active={mixer.state === "playing"} />
          <div className="h-1.5 rounded-full bg-secondary overflow-hidden">
            <div className="h-full gold-gradient" style={{ width: `${mixer.progress * 100}%` }} />
          </div>
          <div className="flex items-center gap-2">
            {mixer.state === "playing" ? (
              <Button onClick={() => mixer.pause()} variant="outline">
                <Pause className="h-4 w-4 mr-1" /> {t("gen_pause")}
              </Button>
            ) : (
              <Button onClick={() => mixer.play()} variant="outline">
                <Play className="h-4 w-4 mr-1" /> {t("gen_play")}
              </Button>
            )}
            <Button
              onClick={handleDownload}
              className="ml-auto gold-gradient text-primary-foreground"
              disabled={!limits.downloadAllowed}
            >
              {limits.downloadAllowed ? <Download className="h-4 w-4 mr-1" /> : <Lock className="h-4 w-4 mr-1" />}
              {limits.downloadAllowed ? t("gen_download") : t("gen_download_locked")}
            </Button>
          </div>

          {!limits.downloadAllowed && (
            <div className="rounded-md border border-primary/30 bg-primary/5 p-4 space-y-3">
              <p className="text-sm">{t("gen_upgrade_banner")}</p>
              <div className="flex items-center gap-2">
                <Input
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  placeholder={t("gen_have_code")}
                  className="mono text-xs"
                />
                <Button onClick={handleVerifyCode} variant="outline">{t("gen_activate")}</Button>
              </div>
              <Button
                className="w-full gold-gradient text-primary-foreground"
                onClick={async () => {
  const result = await startCheckout();
  if (!result.ok) {
    toast.error(result.error || "Erro ao iniciar pagamento. Tente novamente.");
  }
}}
              >
                {t("plans_pro_cta")}
              </Button>
            </div>
          )}
        </Card>
      )}
    </div>
  );
}

function SliderRow({ label, value, onChange }: { label: string; value: number; onChange: (n: number) => void }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <label className="text-sm text-muted-foreground">{label}</label>
        <span className="mono text-xs text-primary">{value}%</span>
      </div>
      <Slider value={[value]} min={0} max={100} step={1} onValueChange={(v) => onChange(v[0])} />
    </div>
  );
}
