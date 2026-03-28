"use client";
import { useEffect, useState } from "react";
import { createClient } from "@/utils/supabase";
import { useParams, useRouter } from "next/navigation";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

export default function HalamanHasil() {
  const { id } = useParams();
  const router = useRouter();
  const supabase = createClient();

  const [hasil, setHasil] = useState<any>(null);
  const [daftarSoal, setDaftarSoal] = useState<any[]>([]);
  const [statistik, setStatistik] = useState({
    total: 0,
    diisi: 0,
    kosong: 0,
    benar: 0,
    salah: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchHasil = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.push("/login");
        return;
      }

      // 1. Ambil data hasil ujian TERBARU berdasarkan tanggal
      const { data: dataHasil, error: errHasil } = await supabase
        .from("hasil_ujian")
        .select(`*, daftar_tes(nama_tes)`)
        .eq("tes_id", id)
        .eq("user_id", user.id)
        .order("tanggal", { ascending: false }) // <-- INI YANG BIKIN FIX: Urutkan berdasarkan waktu ujian terbaru
        .limit(1)
        .maybeSingle();

      if (errHasil) console.error("Error Hasil:", errHasil);

      if (dataHasil) {
        // 2. Pastikan jawaban dibaca sebagai Object, bukan Text/String
        let jawabanUser = dataHasil.jawaban_siswa || {};
        if (typeof jawabanUser === "string") {
          try {
            jawabanUser = JSON.parse(jawabanUser);
          } catch (e) {
            console.error("Gagal parse jawaban:", e);
            jawabanUser = {};
          }
        }

        // Kita simpan jawaban yang sudah berformat object agar mudah dibaca ke depannya
        dataHasil.jawaban_siswa = jawabanUser;
        setHasil(dataHasil);

        // Cek apakah ini tes koran atau pilihan ganda
        const isKoran = jawabanUser?.kategori === "koran";

        // 3. Jika BUKAN tes koran, ambil daftar soal untuk dicocokkan
        if (!isKoran) {
          const { data: dataSoal, error: errSoal } = await supabase
            .from("soal")
            .select("*")
            .eq("tes_id", id)
            .order("id", { ascending: true }); // Pastikan soal urut

          if (errSoal) console.error("Error Soal:", errSoal);

          if (dataSoal) {
            setDaftarSoal(dataSoal);

            // 4. Hitung Statistik (Benar, Salah, Kosong)
            let benar = 0;
            let salah = 0;
            let kosong = 0;

            dataSoal.forEach((soal) => {
              const jawab = jawabanUser[soal.id];
              if (!jawab) {
                kosong++;
              } else if (jawab === soal.jawaban_benar) {
                benar++;
              } else {
                salah++;
              }
            });

            setStatistik({
              total: dataSoal.length,
              diisi: benar + salah,
              kosong,
              benar,
              salah,
            });
          }
        }
      }

      setLoading(false);
    };

    fetchHasil();
  }, [id, router, supabase]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-3">
          <div className="w-12 h-12 border-4 border-slate-200 border-t-indigo-600 rounded-full animate-spin"></div>
          <p className="text-slate-500 font-medium animate-pulse">
            Memuat hasil...
          </p>
        </div>
      </div>
    );
  }

  if (!hasil) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 text-slate-500 gap-4">
        <p className="text-lg font-medium">Data hasil ujian tidak ditemukan.</p>
        <button
          onClick={() => router.push("/dashboard")}
          className="text-indigo-600 font-bold hover:underline"
        >
          Kembali ke Dashboard
        </button>
      </div>
    );
  }

  const statsKoran = hasil.jawaban_siswa || {};
  const isKoran = statsKoran?.kategori === "koran";
  const grafikData = statsKoran?.grafik || [];
  const jawabanUser = hasil.jawaban_siswa || {};

  return (
    <div className="min-h-screen bg-slate-50 py-10 px-4 md:px-10 font-sans selection:bg-indigo-100 pb-24">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* HEADER */}
        <div className="bg-white p-6 md:p-8 rounded-3xl shadow-sm border border-slate-100 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div>
            <h1 className="text-2xl md:text-3xl font-extrabold text-slate-800">
              Hasil Analisis Simulasi
            </h1>
            <p className="text-slate-500 mt-2 font-medium flex items-center gap-2">
              <span className="bg-indigo-50 text-indigo-700 px-3 py-1 rounded-lg text-sm font-bold">
                {hasil.daftar_tes?.nama_tes || "Tes Psikologi"}
              </span>
              <span>•</span>
              <span className="text-sm">
                {new Date(hasil.tanggal).toLocaleDateString("id-ID", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}{" "}
                WIB
              </span>
            </p>
          </div>
          <button
            onClick={() => router.push("/dashboard")}
            className="bg-slate-800 text-white px-6 py-3 rounded-xl font-bold hover:bg-slate-700 hover:-translate-y-0.5 shadow-md transition-all whitespace-nowrap"
          >
            Kembali ke Dashboard
          </button>
        </div>

        {isKoran ? (
          /* =========================================
             BAGIAN TES KORAN (Tetap sama seperti aslinya)
             ========================================= */
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
              <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
                <p className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-1">
                  Kecepatan
                </p>
                <h3 className="text-3xl font-black text-slate-800">
                  {statsKoran.total_diisi || 0}
                </h3>
              </div>
              <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
                <p className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-1">
                  Ketelitian
                </p>
                <h3 className="text-3xl font-black text-slate-800">
                  {hasil.skor}%
                </h3>
              </div>
              <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
                <p className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-1">
                  Benar
                </p>
                <h3 className="text-3xl font-black text-emerald-600">
                  {statsKoran.total_benar || 0}
                </h3>
              </div>
              <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
                <p className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-1">
                  Salah
                </p>
                <h3 className="text-3xl font-black text-rose-600">
                  {statsKoran.total_salah || 0}
                </h3>
              </div>
            </div>
            {/* Grafik Koran disingkat untuk keterbacaan, Anda bisa biarkan kodingan grafik aslinya di sini */}
            <div className="bg-white p-6 md:p-8 rounded-3xl shadow-sm border border-slate-100">
              <h2 className="text-xl font-bold text-slate-800 mb-6">
                Grafik Ketahanan Kerja
              </h2>
              <div className="w-full h-[400px]">
                {grafikData && grafikData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart
                      data={grafikData}
                      margin={{ top: 10, right: 30, left: -20, bottom: 0 }}
                    >
                      <CartesianGrid
                        strokeDasharray="3 3"
                        vertical={false}
                        stroke="#e2e8f0"
                      />
                      <XAxis
                        dataKey="name"
                        axisLine={false}
                        tickLine={false}
                        dy={10}
                      />
                      <YAxis axisLine={false} tickLine={false} dx={-10} />
                      <Tooltip />
                      <Legend />
                      <Line
                        type="monotone"
                        dataKey="Benar"
                        stroke="#10b981"
                        strokeWidth={4}
                      />
                      <Line
                        type="monotone"
                        dataKey="Salah"
                        stroke="#f43f5e"
                        strokeWidth={4}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-slate-400">
                    Data grafik tidak tersedia
                  </div>
                )}
              </div>
            </div>
          </>
        ) : (
          /* =========================================
             BAGIAN TES PILIHAN GANDA (YANG BARU)
             ========================================= */
          <div className="space-y-8">
            {/* 1. KARTU RINGKASAN SKOR & STATISTIK */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Skor Utama */}
              <div className="bg-indigo-600 p-8 rounded-3xl shadow-md text-center flex flex-col justify-center items-center text-white">
                <h2 className="text-indigo-200 font-bold uppercase tracking-widest text-sm mb-2">
                  Nilai Akhir
                </h2>
                <div className="text-7xl font-black mb-4">{hasil.skor}</div>
                <div className="bg-white/20 px-4 py-2 rounded-xl text-sm font-medium backdrop-blur-sm">
                  ⏱️ Waktu: {hasil.durasi}
                </div>
              </div>

              {/* Detail Statistik */}
              <div className="lg:col-span-2 grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 flex flex-col justify-center items-center text-center">
                  <p className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-1">
                    Total Soal
                  </p>
                  <p className="text-3xl font-black text-slate-800">
                    {statistik.total}
                  </p>
                </div>
                <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 flex flex-col justify-center items-center text-center">
                  <p className="text-emerald-500 text-xs font-bold uppercase tracking-wider mb-1">
                    Benar
                  </p>
                  <p className="text-3xl font-black text-emerald-600">
                    {statistik.benar}
                  </p>
                </div>
                <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 flex flex-col justify-center items-center text-center">
                  <p className="text-rose-500 text-xs font-bold uppercase tracking-wider mb-1">
                    Salah
                  </p>
                  <p className="text-3xl font-black text-rose-600">
                    {statistik.salah}
                  </p>
                </div>
                <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 flex flex-col justify-center items-center text-center">
                  <p className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-1">
                    Kosong
                  </p>
                  <p className="text-3xl font-black text-slate-500">
                    {statistik.kosong}
                  </p>
                </div>
              </div>
            </div>

            {/* 2. DAFTAR SOAL & PEMBAHASAN */}
            <div className="space-y-6">
              <h2 className="text-2xl font-bold text-slate-800 border-b-2 border-slate-200 pb-4">
                Detail Jawaban & Pembahasan
              </h2>

              {daftarSoal.map((soal, index) => {
                const jawabSiswa = jawabanUser[soal.id];
                const isKosong = !jawabSiswa;
                const isBenar = jawabSiswa === soal.jawaban_benar;

                return (
                  <div
                    key={soal.id}
                    className="bg-white p-6 md:p-8 rounded-3xl shadow-sm border border-slate-100 relative overflow-hidden"
                  >
                    {/* Pita Status (Benar/Salah/Kosong) */}
                    <div
                      className={`absolute top-0 left-0 w-2 h-full ${isKosong ? "bg-slate-300" : isBenar ? "bg-emerald-500" : "bg-rose-500"}`}
                    />

                    {/* Header Soal */}
                    <div className="flex justify-between items-center mb-6 pl-4">
                      <h3 className="font-bold text-lg text-slate-800">
                        Soal No. {index + 1}
                      </h3>
                      <span
                        className={`px-4 py-1.5 rounded-full text-sm font-bold ${
                          isKosong
                            ? "bg-slate-100 text-slate-500"
                            : isBenar
                              ? "bg-emerald-100 text-emerald-700"
                              : "bg-rose-100 text-rose-700"
                        }`}
                      >
                        {isKosong ? "Kosong" : isBenar ? "Benar" : "Salah"}
                      </span>
                    </div>

                    {/* Pertanyaan & Gambar Soal */}
                    <div className="pl-4 mb-6">
                      {soal.url_gambar && (
                        <img
                          src={soal.url_gambar}
                          alt="Soal"
                          className="mb-4 max-h-60 rounded-xl shadow-sm border border-slate-100"
                        />
                      )}
                      <p className="text-lg text-slate-700 font-medium leading-relaxed whitespace-pre-wrap">
                        {soal.pertanyaan}
                      </p>
                    </div>

                    {/* Opsi Jawaban */}
                    <div className="pl-4 grid grid-cols-1 md:grid-cols-2 gap-3 mb-8">
                      {["a", "b", "c", "d"].map((opsi) => {
                        // Jangan render jika opsi ini kosong di database
                        if (!soal[`opsi_${opsi}`] && !soal[`url_opsi_${opsi}`])
                          return null;

                        const isOpsiBenar = soal.jawaban_benar === opsi;
                        const isDipilihUser = jawabSiswa === opsi;

                        // Logika Warna Kotak Opsi
                        let styleOpsi =
                          "bg-slate-50 border-slate-200 text-slate-600"; // Default
                        let styleHuruf =
                          "bg-white text-slate-500 border-slate-200";

                        if (isOpsiBenar) {
                          styleOpsi =
                            "bg-emerald-50 border-emerald-500 text-emerald-800 ring-1 ring-emerald-500";
                          styleHuruf =
                            "bg-emerald-500 text-white border-emerald-500";
                        } else if (isDipilihUser && !isBenar) {
                          styleOpsi =
                            "bg-rose-50 border-rose-300 text-rose-800 line-through decoration-rose-400 opacity-80";
                          styleHuruf =
                            "bg-rose-100 text-rose-500 border-rose-200";
                        }

                        return (
                          <div
                            key={opsi}
                            className={`p-4 border rounded-2xl flex items-start gap-4 ${styleOpsi}`}
                          >
                            <div
                              className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold flex-shrink-0 border ${styleHuruf}`}
                            >
                              {opsi.toUpperCase()}
                            </div>
                            <div className="flex-1 mt-1">
                              {soal[`url_opsi_${opsi}`] && (
                                <img
                                  src={soal[`url_opsi_${opsi}`]}
                                  className="max-h-32 mb-2 rounded-md"
                                  alt={`Opsi ${opsi}`}
                                />
                              )}
                              <span className="font-medium">
                                {soal[`opsi_${opsi}`]}
                              </span>

                              {/* Label Info (Jawabanmu / Kunci Jawaban) */}
                              <div className="mt-2 flex gap-2">
                                {isOpsiBenar && (
                                  <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-1 rounded font-bold">
                                    ✓ Kunci Jawaban
                                  </span>
                                )}
                                {isDipilihUser && !isOpsiBenar && (
                                  <span className="text-xs bg-rose-100 text-rose-700 px-2 py-1 rounded font-bold">
                                    ✗ Jawabanmu
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Area Pembahasan */}
                    <div className="pl-4">
                      <div className="bg-indigo-50/50 border border-indigo-100 rounded-2xl p-6">
                        <h4 className="text-indigo-800 font-bold flex items-center gap-2 mb-3">
                          💡 Pembahasan
                        </h4>
                        {soal.url_pembahasan && (
                          <img
                            src={soal.url_pembahasan}
                            alt="Pembahasan"
                            className="mb-4 max-h-60 rounded-xl shadow-sm"
                          />
                        )}
                        <p className="text-slate-700 leading-relaxed whitespace-pre-wrap">
                          {soal.pembahasan ? (
                            soal.pembahasan
                          ) : (
                            <span className="text-slate-400 italic">
                              Belum ada teks pembahasan untuk soal ini.
                            </span>
                          )}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
