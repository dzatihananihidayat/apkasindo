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

      // Ambil data ujian terbaru untuk tes ini dan user ini
      const { data, error } = await supabase
        .from("hasil_ujian")
        .select(`*, daftar_tes(nama_tes)`)
        .eq("tes_id", id)
        .eq("user_id", user.id)
        .order("created_at", { ascending: false }) // Ambil yang paling baru disubmit
        .limit(1)
        .single();

      if (data) {
        setHasil(data);
      }
      setLoading(false);
    };

    fetchHasil();
  }, [id, router, supabase]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="w-12 h-12 border-4 border-t-indigo-600 rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!hasil) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 text-slate-500">
        Data hasil ujian tidak ditemukan.
      </div>
    );
  }

  // Ekstrak data dari JSONB jawaban_siswa
  const stats = hasil.jawaban_siswa;
  const isKoran = stats?.kategori === "koran";
  const grafikData = stats?.grafik || [];

  return (
    <div className="min-h-screen bg-slate-50 py-10 px-4 md:px-10 font-sans">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* HEADER */}
        <div className="bg-white p-6 md:p-8 rounded-3xl shadow-sm border border-slate-100 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-extrabold text-slate-800">
              Hasil Analisis Simulasi
            </h1>
            <p className="text-slate-500 mt-1 font-medium">
              {hasil.daftar_tes?.nama_tes || "Tes Psikologi"} •{" "}
              {new Date(hasil.tanggal).toLocaleDateString("id-ID", {
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </p>
          </div>
          <button
            onClick={() => router.push("/")}
            className="bg-slate-100 text-slate-600 px-6 py-2.5 rounded-xl font-bold hover:bg-slate-200 transition-all"
          >
            Kembali ke Beranda
          </button>
        </div>

        {/* JIKA TES KORAN TAMPILKAN DASHBOARD KHUSUS */}
        {isKoran ? (
          <>
            {/* KARTU STATISTIK (Seperti di gambar) */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Card 1: Kecepatan */}
              <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 flex items-center gap-5">
                <div className="w-14 h-14 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center">
                  <svg
                    className="w-7 h-7"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M13 10V3L4 14h7v7l9-11h-7z"
                    />
                  </svg>
                </div>
                <div>
                  <p className="text-slate-500 text-sm font-bold uppercase tracking-wider">
                    Kecepatan Kerja
                  </p>
                  <h3 className="text-3xl font-black text-slate-800">
                    {stats.total_diisi}{" "}
                    <span className="text-sm font-medium text-slate-500">
                      Isian
                    </span>
                  </h3>
                </div>
              </div>

              {/* Card 2: Ketelitian (Akurasi %) */}
              <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 flex items-center gap-5">
                <div className="w-14 h-14 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center">
                  <svg
                    className="w-7 h-7"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                </div>
                <div>
                  <p className="text-slate-500 text-sm font-bold uppercase tracking-wider">
                    Ketelitian Kerja
                  </p>
                  <h3 className="text-3xl font-black text-slate-800">
                    {hasil.skor}%{" "}
                    <span className="text-sm font-medium text-slate-500">
                      Akurasi
                    </span>
                  </h3>
                </div>
              </div>

              {/* Card 3: Error Rate (Total Salah) */}
              <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 flex items-center gap-5">
                <div className="w-14 h-14 bg-rose-50 text-rose-600 rounded-2xl flex items-center justify-center">
                  <svg
                    className="w-7 h-7"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                </div>
                <div>
                  <p className="text-slate-500 text-sm font-bold uppercase tracking-wider">
                    Tingkat Kesalahan
                  </p>
                  <h3 className="text-3xl font-black text-slate-800">
                    {stats.total_salah}{" "}
                    <span className="text-sm font-medium text-slate-500">
                      Kesalahan
                    </span>
                  </h3>
                </div>
              </div>
            </div>

            {/* AREA GRAFIK */}
            <div className="bg-white p-6 md:p-8 rounded-3xl shadow-sm border border-slate-100">
              <h2 className="text-xl font-bold text-slate-800 mb-6">
                Grafik Ketahanan Kerja (Per Kolom)
              </h2>
              <div className="w-full h-[400px]">
                {grafikData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart
                      data={grafikData}
                      margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
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
                        tick={{ fill: "#64748b" }}
                        dy={10}
                      />
                      <YAxis
                        axisLine={false}
                        tickLine={false}
                        tick={{ fill: "#64748b" }}
                        dx={-10}
                      />
                      <Tooltip
                        contentStyle={{
                          borderRadius: "12px",
                          border: "none",
                          boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
                        }}
                        cursor={{
                          stroke: "#cbd5e1",
                          strokeWidth: 2,
                          strokeDasharray: "5 5",
                        }}
                      />
                      <Legend
                        iconType="circle"
                        wrapperStyle={{ paddingTop: "20px" }}
                      />
                      <Line
                        type="monotone"
                        dataKey="Benar"
                        stroke="#10b981"
                        strokeWidth={4}
                        dot={{
                          r: 4,
                          fill: "#10b981",
                          strokeWidth: 2,
                          stroke: "#fff",
                        }}
                        activeDot={{ r: 8 }}
                      />
                      <Line
                        type="monotone"
                        dataKey="Salah"
                        stroke="#f43f5e"
                        strokeWidth={4}
                        dot={{
                          r: 4,
                          fill: "#f43f5e",
                          strokeWidth: 2,
                          stroke: "#fff",
                        }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-slate-400 font-medium">
                    Data grafik tidak tersedia
                  </div>
                )}
              </div>
            </div>
          </>
        ) : (
          // JIKA BUKAN TES KORAN (Pilihan Ganda Biasa)
          <div className="bg-white p-10 rounded-3xl shadow-sm border border-slate-100 text-center">
            <h2 className="text-2xl font-bold text-slate-800 mb-2">
              Nilai Akhir
            </h2>
            <div className="text-6xl font-black text-indigo-600 my-6">
              {hasil.skor}
            </div>
            <p className="text-slate-500">Waktu pengerjaan: {hasil.durasi}</p>
          </div>
        )}
      </div>
    </div>
  );
}
