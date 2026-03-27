"use client";
import { useEffect, useState } from "react";
import { createClient } from "@/utils/supabase";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";

export default function HalamanHasil() {
  const { id } = useParams();
  const router = useRouter();
  const supabase = createClient();

  const [skor, setSkor] = useState<number>(0);
  const [daftarSoal, setDaftarSoal] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        router.push("/login");
        return;
      }

      // 1. Ambil Skor Akhir
      const { data: dataNilai } = await supabase
        .from("hasil_ujian")
        .select("skor")
        .eq("tes_id", id)
        .eq("user_id", user.id)
        .order("tanggal", { ascending: false })
        .limit(1)
        .single();

      if (dataNilai && dataNilai.skor !== null) setSkor(Number(dataNilai.skor));

      // 2. Ambil Daftar Soal untuk Pembahasan
      const { data: dataSoal } = await supabase
        .from("soal")
        .select("*")
        .eq("tes_id", id);

      if (dataSoal) setDaftarSoal(dataSoal);

      setLoading(false);
    };

    fetchData();
  }, [id, router, supabase]);

  if (loading)
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50">
        <div className="w-12 h-12 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
        <p className="text-slate-500 mt-4 font-semibold animate-pulse">
          Menyiapkan hasil & pembahasan...
        </p>
      </div>
    );

  const finalSkor = Number.isNaN(skor) ? 0 : skor;

  return (
    <div className="min-h-screen bg-slate-50 font-sans pb-20 selection:bg-indigo-100">
      {/* HEADER: KARTU SKOR (Dengan lengkungan di bawah) */}
      <div className="bg-slate-900 pt-16 pb-20 px-6 text-center shadow-2xl rounded-b-[2.5rem] md:rounded-b-[3.5rem] relative z-20">
        <div className="max-w-2xl mx-auto">
          <div className="w-20 h-20 bg-indigo-500/20 text-indigo-300 rounded-3xl flex items-center justify-center mx-auto mb-6 text-4xl border border-indigo-400/30">
            🎉
          </div>
          <h1 className="text-4xl font-extrabold text-white tracking-tight mb-2">
            Ujian Selesai!
          </h1>
          <p className="text-indigo-200 mb-8 font-medium">
            Kerja bagus! Berikut adalah skor akhir kamu:
          </p>

          <div className="bg-white/10 backdrop-blur-md py-8 rounded-3xl border border-white/20 inline-block px-20">
            <span
              className={`text-8xl font-black tracking-tighter drop-shadow-lg ${finalSkor >= 70 ? "text-emerald-400" : "text-rose-400"}`}
            >
              {finalSkor}
            </span>
          </div>
        </div>
      </div>

      {/* SECTION PEMBAHASAN (Jarak diperbaiki) */}
      <div className="max-w-4xl mx-auto px-6 mt-12 relative z-10 space-y-8">
        {/* Header Pembahasan & Tombol Kembali */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-5 border-b border-slate-200 pb-6">
          <h2 className="text-2xl font-extrabold text-slate-800 flex items-center gap-3">
            <span className="text-3xl">📚</span> Pembahasan Soal
          </h2>
          <Link
            href="/dashboard"
            className="bg-white text-indigo-600 font-bold px-6 py-3 rounded-xl border-2 border-indigo-100 hover:border-indigo-600 hover:bg-indigo-50 hover:-translate-y-0.5 shadow-sm transition-all w-full md:w-auto text-center"
          >
            Kembali ke Dashboard
          </Link>
        </div>

        {/* List Soal */}
        <div className="space-y-6">
          {daftarSoal.map((s, index) => {
            const isGambarSoal = s.url_gambar;
            const kunci = s.jawaban_benar;
            const isGambarOpsiKunci = s[`url_opsi_${kunci}`];

            return (
              <div
                key={s.id}
                className="bg-white p-8 rounded-3xl shadow-md shadow-slate-200/50 border border-slate-100 space-y-6"
              >
                {/* Info Nomor Soal */}
                <div className="flex items-start gap-4 border-b border-slate-100 pb-6">
                  <div className="w-12 h-12 bg-slate-100 text-slate-500 rounded-xl flex items-center justify-center font-black flex-shrink-0">
                    {index + 1}
                  </div>
                  <div className="flex-1 space-y-4 pt-2">
                    {isGambarSoal && (
                      <img
                        src={s.url_gambar}
                        alt="Gambar Soal"
                        className="max-h-56 rounded-xl border border-slate-200 shadow-sm"
                      />
                    )}
                    <p className="text-lg font-bold text-slate-800">
                      {s.pertanyaan}
                    </p>
                  </div>
                </div>

                {/* Kunci Jawaban */}
                <div className="bg-emerald-50 border border-emerald-100 p-5 rounded-2xl flex items-start gap-4">
                  <div className="w-8 h-8 rounded-full bg-emerald-500 text-white flex items-center justify-center font-bold text-sm flex-shrink-0 mt-1">
                    ✓
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-emerald-800 uppercase tracking-wider mb-2">
                      Jawaban Benar: Opsi {kunci.toUpperCase()}
                    </h4>
                    {isGambarOpsiKunci && (
                      <img
                        src={s[`url_opsi_${kunci}`]}
                        alt="Kunci Gambar"
                        className="max-h-32 rounded-lg border border-emerald-200 mb-2 bg-white"
                      />
                    )}
                    {(s[`opsi_${kunci}`] || !isGambarOpsiKunci) && (
                      <p className="text-emerald-900 font-medium">
                        {s[`opsi_${kunci}`] || "(Jawaban berupa gambar)"}
                      </p>
                    )}
                  </div>
                </div>

                {/* Penjelasan Pembahasan */}
                <div className="bg-indigo-50 border border-indigo-100 p-5 rounded-2xl">
                  <h4 className="text-sm font-bold text-indigo-800 uppercase tracking-wider mb-2 flex items-center gap-2">
                    <span>💡</span> Penjelasan Singkat
                  </h4>
                  <p className="text-indigo-900 leading-relaxed font-medium">
                    {s.pembahasan && s.pembahasan.trim() !== ""
                      ? s.pembahasan
                      : "Tidak ada penjelasan khusus untuk soal ini."}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Tombol Bawah */}
        <div className="pt-8 pb-10 text-center">
          <Link
            href="/dashboard"
            className="inline-block bg-indigo-600 text-white font-bold px-10 py-4 rounded-2xl hover:bg-indigo-700 shadow-xl shadow-indigo-200 transition-all hover:-translate-y-1"
          >
            Selesai Belajar
          </Link>
        </div>
      </div>
    </div>
  );
}
