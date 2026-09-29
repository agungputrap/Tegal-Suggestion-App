import { botChatLink } from "../api";

// Ajakan memakai bot WhatsApp (tier 1 #36) — permukaan owner (portal &
// dashboard). Hanya tampil kalau nomor bot dibake saat build
// (VITE_BOT_NUMBER); kalau kosong, section ini hilang total — bot yang
// belum aktif tidak boleh dipromosikan.
export function BotHint() {
  const link = botChatLink("BUKA");
  if (!link) return null;
  return (
    <div className="px-4 py-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-100 dark:border-emerald-900 text-xs space-y-1.5">
      <p className="font-bold text-emerald-700 dark:text-emerald-300">
        <i className="fa-brands fa-whatsapp mr-1.5"></i>
        Lebih cepat: balas BUKA di WhatsApp
      </p>
      <p className="text-slate-600 dark:text-slate-300">
        Tanpa buka portal — kirim pesan ke bot, status bukamu langsung update.
      </p>
      <a
        href={link}
        target="_blank"
        rel="noreferrer"
        className="inline-flex items-center px-3.5 py-2 min-h-[44px] rounded-xl bg-[#25D366] hover:brightness-95 text-white font-bold transition"
      >
        <i className="fa-brands fa-whatsapp text-base mr-1.5"></i>
        Chat bot sekarang
      </a>
    </div>
  );
}
