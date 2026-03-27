"use client";
import { useState, useEffect } from "react";
import { createClient } from "@/utils/supabase";
import { useParams, useRouter } from "next/navigation";

export default function MesinUjian() {
  const { id } = useParams();
  const router = useRouter();
  const supabase = createClient();

  const [soal, setSoal] = useState<any[]>([]);
  const [indeksAktif, setIndeksAktif] = useState(0);
  const [jawabanSiswa, setJawabanSiswa] = useState<any[]>([]);
  const [timer, setTimer] = useState(60);
  const [namaTes, setNamaTes] = useState("");
  const [loading, setLoading] = useState(true);

  // 1. Fetch Data Awal (Soal & Info Tes)
  useEffect(() => {
    const fetchData = async () => {
      // Ambil Info Tes untuk Timer
      const { data: dataTes } = await supabase
        .from("daftar_tes")
        .select("nama_tes, durasi_menit")
        .eq("id", id)
        .single();

      // Ambil Daftar Soal
      const { data: dataSoal } = await supabase
        .from("soal")
        .select("*")
        .eq("tes_id", id);

      if (dataTes) {
        setNamaTes(dataTes.nama_tes);
        const isPsikologi = dataTes.nama_tes
          .toLowerCase()
          .includes("psikologi");
        // Jika Psikologi: 60 detik per soal. Jika Sawit: Durasi menit * 60.
        setTimer(isPsikologi ? 60 : (dataTes.durasi_menit || 30) * 60);
      }

      if (dataSoal) setSoal(dataSoal);
      setLoading(false);
    };
    fetchData();
  }, [id, supabase]);

  // 2. Logika Timer Adaptif
  useEffect(() => {
    if (loading || soal.length === 0) return;

    const interval = setInterval(() => {
      setTimer((prev) => {
        if (prev <= 1) {
          const isPsikologi = namaTes.toLowerCase().includes("psikologi");

          if (isPsikologi) {
            // Mode Psikologi: Otomatis pindah soal saat waktu habis
            if (indeksAktif < soal.length - 1) {
              setIndeksAktif(indeksAktif + 1);
              return 60;
            } else {
              selesaiUjianOtomatis();
              return 0;
            }
          } else {
            // Mode Sawit/Umum: Waktu total habis
            selesaiUjianOtomatis();
            return 0;
          }
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [indeksAktif, loading, soal, namaTes]);

  // 3. Fungsi Navigasi & Simpan
  const handleNextSoal = () => {
    if (indeksAktif < soal.length - 1) {
      setIndeksAktif(indeksAktif + 1);
      // Reset timer HANYA jika tes Psikologi
      if (namaTes.toLowerCase().includes("psikologi")) {
        setTimer(60);
      }
    } else {
      selesaiUjian();
    }
  };

  const lompatKeSoal = (indeks: number) => {
    const isPsikologi = namaTes.toLowerCase().includes("psikologi");
    // Di tes psikologi, biasanya tidak boleh back/lompat.
    // Tapi jika kamu izinkan, hapus proteksi if ini:
    if (isPsikologi) {
      alert("Untuk tes psikologi, anda harus mengerjakan berurutan.");
      return;
    }
    setIndeksAktif(indeks);
  };

  const simpanJawabanLocal = (pilihan: string) => {
    const baru = [...jawabanSiswa];
    baru[indeksAktif] = pilihan;
    setJawabanSiswa(baru);
  };

  const selesaiUjianOtomatis = () => {
    alert("Waktu habis! Jawaban kamu akan disimpan.");
    prosesSelesai();
  };

  const selesaiUjian = async () => {
    if (!confirm("Apakah kamu yakin ingin mengakhiri ujian sekarang?")) return;
    prosesSelesai();
  };

  const prosesSelesai = async () => {
    let jumlahBenar = 0;
    soal.forEach((s, index) => {
      if (jawabanSiswa[index] === s.jawaban_benar) {
        jumlahBenar++;
      }
    });

    const totalSoal = soal.length;
    const skorAkhir =
      totalSoal > 0 ? Math.round((jumlahBenar / totalSoal) * 100) : 0;

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) {
      await supabase.from("hasil_ujian").insert([
        {
          user_id: user.id,
          email_siswa: user.email,
          tes_id: id,
          skor: skorAkhir,
        },
      ]);
    }

    router.push(`/hasil/${id}`);
  };

  const formatWaktu = (detik: number) => {
    const m = Math.floor(detik / 60);
    const s = detik % 60;
    return `${m < 10 ? "0" + m : m}:${s < 10 ? "0" + s : s}`;
  };

  if (loading)
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="w-12 h-12 border-4 border-t-indigo-600 rounded-full animate-spin"></div>
      </div>
    );

  const soalSekarang = soal[indeksAktif];

  return (
    <div className="min-h-screen bg-slate-50 font-sans pb-24">
      {/* HEADER */}
      <div className="bg-slate-900 px-6 py-5 text-white flex justify-between items-center shadow-lg sticky top-0 z-50">
        <div>
          <h2 className="font-extrabold text-lg text-indigo-300">{namaTes}</h2>
          <p className="text-sm text-slate-400">
            Soal {indeksAktif + 1} dari {soal.length}
          </p>
        </div>
        <div className="flex items-center gap-3 bg-indigo-600/20 px-5 py-2.5 rounded-2xl border border-indigo-500/30">
          <span className="text-indigo-300 text-sm font-bold uppercase tracking-widest">
            {namaTes.toLowerCase().includes("psikologi")
              ? "Per Soal"
              : "Sisa Waktu"}
          </span>
          <div className="font-mono font-black text-2xl text-white">
            {formatWaktu(timer)}
          </div>
        </div>
      </div>

      <div className="p-6 md:p-10 max-w-7xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* AREA KIRI: SOAL */}
          <div className="lg:col-span-3 space-y-8">
            <div className="bg-white p-8 md:p-10 rounded-3xl shadow-xl border border-slate-100">
              {soalSekarang.url_gambar && (
                <img
                  src={soalSekarang.url_gambar}
                  alt="Soal"
                  className="mb-8 max-h-72 mx-auto rounded-2xl shadow-md"
                />
              )}
              <p className="text-xl md:text-2xl font-bold text-slate-800 leading-relaxed">
                {soalSekarang.pertanyaan}
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {["a", "b", "c", "d"].map((opsi) => (
                <button
                  key={opsi}
                  onClick={() => simpanJawabanLocal(opsi)}
                  className={`group p-6 text-left border rounded-2xl transition-all flex items-start gap-4 ${
                    jawabanSiswa[indeksAktif] === opsi
                      ? "bg-indigo-600 border-indigo-700 text-white font-bold shadow-lg"
                      : "bg-white border-slate-200 text-slate-800 hover:border-indigo-300"
                  }`}
                >
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center font-black ${
                      jawabanSiswa[indeksAktif] === opsi
                        ? "bg-white text-indigo-700"
                        : "bg-indigo-50 text-indigo-600"
                    }`}
                  >
                    {opsi.toUpperCase()}
                  </div>
                  <div className="flex-1">
                    {soalSekarang[`url_opsi_${opsi}`] && (
                      <img
                        src={soalSekarang[`url_opsi_${opsi}`]}
                        className="max-h-40 mb-2 rounded-lg"
                      />
                    )}
                    <span className="text-lg">
                      {soalSekarang[`opsi_${opsi}`]}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* AREA KANAN: NAVIGASI */}
          <div className="lg:col-span-1">
            <div className="bg-white p-6 rounded-3xl shadow-xl border border-slate-100 sticky top-28">
              <h3 className="text-lg font-bold text-slate-800 mb-4 border-b pb-3">
                Navigasi Soal
              </h3>
              <div className="grid grid-cols-5 gap-2 mb-6">
                {soal.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => lompatKeSoal(i)}
                    className={`h-10 rounded-lg font-bold text-xs flex items-center justify-center transition-all ${
                      indeksAktif === i
                        ? "ring-4 ring-indigo-200 bg-indigo-600 text-white shadow-md"
                        : jawabanSiswa[i] !== undefined
                          ? "bg-emerald-500 text-white shadow-sm hover:bg-emerald-600"
                          : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                    }`}
                  >
                    {i + 1}
                  </button>
                ))}
              </div>
              <button
                onClick={selesaiUjian}
                className="w-full bg-rose-500 text-white py-3 rounded-xl font-bold hover:bg-rose-600 transition-all shadow-md shadow-rose-200"
              >
                Akhiri Ujian
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur-sm border-t border-slate-100 p-4 shadow-lg z-40">
        <div className="max-w-7xl mx-auto flex justify-between items-center px-4">
          <button
            onClick={() => indeksAktif > 0 && setIndeksAktif(indeksAktif - 1)}
            className="px-6 py-3 font-bold text-slate-500 hover:text-indigo-600 disabled:opacity-30"
          >
            ← Sebelumnya
          </button>
          <button
            onClick={handleNextSoal}
            className="flex items-center gap-2 bg-indigo-600 text-white px-8 py-3 rounded-xl font-bold hover:bg-indigo-700 shadow-md"
          >
            {indeksAktif === soal.length - 1
              ? "Selesai & Kumpulkan"
              : "Selanjutnya →"}
          </button>
        </div>
      </div>
    </div>
  );
}
