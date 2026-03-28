"use client";
import { useEffect, useState } from "react";
import { createClient } from "@/utils/supabase";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

export default function Dashboard() {
  const supabase = createClient();
  const router = useRouter();

  const [tests, setTests] = useState<any[]>([]);
  const [userEmail, setUserEmail] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [chartData, setChartData] = useState<any[]>([]);

  // STATE UNTUK FILTER GRAFIK
  const [activeTab, setActiveTab] = useState<string>("Semua");

  useEffect(() => {
    const initDashboard = async () => {
      // 1. Cek User Login
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.push("/login");
        return;
      }
      setUserEmail(user.email || "");

      // 2. Ambil Daftar Tes
      const { data: testList } = await supabase.from("daftar_tes").select("*");
      if (testList) setTests(testList);

      // 3. Ambil Hasil Ujian User
      const { data: historyData, error: historyError } = await supabase
        .from("hasil_ujian")
        .select("skor, tanggal, tes_id")
        .eq("user_id", user.id)
        .order("tanggal", { ascending: true });

      if (historyError) {
        console.error("Gagal mengambil data riwayat:", historyError.message);
      }

      // 4. Format Data untuk Grafik
      if (historyData && testList) {
        const formattedData = historyData.map((item) => {
          const tesTerkait = testList.find((t) => t.id === item.tes_id);
          const namaTes = tesTerkait
            ? tesTerkait.nama_tes
            : `Ujian (ID: ${item.tes_id})`;

          return {
            namaUjian: namaTes,
            skor: item.skor,
            // Format waktu ditambahkan jam dan menit
            tanggal: new Date(item.tanggal)
              .toLocaleDateString("id-ID", {
                day: "numeric",
                month: "short",
                hour: "2-digit",
                minute: "2-digit",
              })
              .replace(/\./g, ":"),
          };
        });

        setChartData(formattedData);
      }

      setLoading(false);
    };
    initDashboard();
  }, [router, supabase]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50">
        <div className="w-12 h-12 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mb-4"></div>
        <p className="font-semibold text-slate-500 animate-pulse">
          Memuat Dashboard...
        </p>
      </div>
    );
  }

  // Komponen Custom Tooltip untuk Grafik
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-4 rounded-xl shadow-lg border border-slate-100">
          <p className="text-slate-500 text-sm font-medium mb-1">{label}</p>
          <p className="text-slate-800 font-bold text-md mb-2">
            {payload[0].payload.namaUjian}
          </p>
          <p className="text-emerald-600 font-bold text-lg">
            Skor: {payload[0].value}
          </p>
        </div>
      );
    }
    return null;
  };

  // LOGIKA FILTER GRAFIK
  const uniqueTabs = [
    "Semua",
    ...Array.from(new Set(chartData.map((item) => item.namaUjian))),
  ];

  const filteredChartData =
    activeTab === "Semua"
      ? chartData
      : chartData.filter((item) => item.namaUjian === activeTab);

  return (
    <div className="min-h-screen bg-slate-50 font-sans selection:bg-indigo-100 selection:text-indigo-900">
      <div className="max-w-6xl mx-auto px-6 py-10 md:py-16">
        {/* HEADER */}
        <header className="flex flex-col md:flex-row justify-between items-center bg-white p-6 md:px-8 rounded-3xl shadow-sm border border-slate-100 mb-12">
          <div className="mb-6 md:mb-0 text-center md:text-left">
            <h1 className="text-3xl font-extrabold text-slate-800 tracking-tight">
              Dashboard Ujian
            </h1>
            <p className="text-slate-500 mt-1 font-medium">
              Selamat datang,{" "}
              <span className="text-indigo-600">{userEmail}</span>
            </p>
          </div>

          <div className="flex items-center gap-3 md:gap-4">
            {userEmail === "guru@ujian.com" && (
              <Link
                href="/admin"
                className="flex items-center gap-2 bg-slate-800 text-white px-5 py-2.5 rounded-xl font-semibold hover:bg-slate-700 transition-all shadow-sm text-sm"
              >
                <span>⚙️</span> Panel Admin
              </Link>
            )}
            <button
              onClick={handleLogout}
              className="px-5 py-2.5 rounded-xl font-semibold text-rose-600 bg-rose-50 hover:bg-rose-100 transition-all text-sm"
            >
              Keluar
            </button>
          </div>
        </header>

        {/* SECTION TITLE: PILIH UJIAN */}
        <div className="mb-8 flex items-center gap-3">
          <div className="h-8 w-2 bg-indigo-500 rounded-full"></div>
          <h2 className="text-xl font-bold text-slate-700">
            Pilih Simulasi Tersedia
          </h2>
        </div>

        {/* GRID KARTU UJIAN */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-16">
          {tests.length > 0 ? (
            tests.map((tes) => {
              // Safety check untuk kategori yang mungkin null/undefined
              const kategori = tes.kategori || "";

              return (
                <div
                  key={tes.id}
                  className="group bg-white p-6 rounded-3xl shadow-sm border border-slate-100 hover:shadow-xl hover:shadow-indigo-500/10 hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between"
                >
                  <div>
                    <div className="w-14 h-14 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center mb-6 shadow-inner transition-transform group-hover:scale-110">
                      <svg
                        className="w-7 h-7"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="2"
                          d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                        ></path>
                      </svg>
                    </div>

                    <h3 className="text-xl font-bold text-slate-800 mb-3 group-hover:text-indigo-600 transition-colors line-clamp-2">
                      {tes.nama_tes}
                    </h3>

                    <div className="flex flex-wrap gap-2 text-xs font-semibold text-slate-500 mb-8">
                      <span className="flex items-center gap-1.5 bg-slate-100 px-3 py-1.5 rounded-lg border border-slate-200">
                        ⏱️ {tes.durasi_menit} Menit
                      </span>

                      {/* TANDA KHUSUS BERDASARKAN KATEGORI */}
                      <span
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border ${
                          kategori === "aritmatika"
                            ? "bg-blue-50 text-blue-600 border-blue-200"
                            : kategori === "visual"
                              ? "bg-purple-50 text-purple-600 border-purple-200"
                              : kategori === "koran"
                                ? "bg-orange-50 text-orange-600 border-orange-200"
                                : "bg-slate-100 text-slate-600 border-slate-200"
                        }`}
                      >
                        {kategori === "aritmatika" && "🔢 Aritmatika"}
                        {kategori === "visual" && "👁️ Kognitif Visual"}
                        {kategori === "koran" && "🧮 Tes Koran"}
                        {!["aritmatika", "visual", "koran"].includes(
                          kategori,
                        ) && "📝 Pilihan Ganda"}
                      </span>
                    </div>
                  </div>

                  <Link
                    href={`/ujian/${tes.id}`}
                    className="w-full bg-indigo-600 text-white font-semibold py-3.5 rounded-xl hover:bg-indigo-700 shadow-md shadow-indigo-200 transition-all text-center group-hover:shadow-lg group-hover:shadow-indigo-300 block"
                  >
                    Mulai Sekarang
                  </Link>
                </div>
              );
            })
          ) : (
            <div className="col-span-full text-center py-20 bg-white rounded-3xl border-2 border-dashed border-slate-200">
              <div className="text-5xl mb-4 opacity-50">📭</div>
              <p className="text-slate-500 font-medium">
                Belum ada jadwal tes yang tersedia saat ini.
              </p>
            </div>
          )}
        </div>

        {/* SECTION TITLE: GRAFIK HASIL BELAJAR */}
        {chartData.length > 0 && (
          <div className="bg-white p-6 md:p-8 rounded-3xl shadow-sm border border-slate-100">
            {/* Header Grafik & Tombol Filter */}
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-8 gap-6">
              <div className="flex items-center gap-3">
                <div className="h-8 w-2 bg-emerald-500 rounded-full"></div>
                <div>
                  <h2 className="text-xl font-bold text-slate-700">
                    Grafik Perkembangan Belajarmu
                  </h2>
                  <p className="text-sm text-slate-500 font-medium mt-1">
                    Pantau tren nilai kamu berdasarkan jenis ujian
                  </p>
                </div>
              </div>

              {/* TABS FILTER DINAMIS */}
              <div className="flex flex-wrap gap-2 bg-slate-50 p-1.5 rounded-2xl border border-slate-100">
                {uniqueTabs.map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`px-5 py-2 rounded-xl text-sm font-bold transition-all ${
                      activeTab === tab
                        ? "bg-white text-emerald-600 shadow-sm border border-slate-200"
                        : "text-slate-500 hover:text-slate-800 hover:bg-slate-200/50"
                    }`}
                  >
                    {tab}
                  </button>
                ))}
              </div>
            </div>

            {/* Render Grafik */}
            <div className="h-[400px] w-full">
              {filteredChartData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    data={filteredChartData}
                    margin={{ top: 20, right: 20, left: -20, bottom: 0 }}
                  >
                    <CartesianGrid
                      strokeDasharray="3 3"
                      vertical={false}
                      stroke="#f1f5f9"
                    />
                    <XAxis
                      dataKey="tanggal"
                      stroke="#94a3b8"
                      fontSize={12}
                      tickLine={false}
                      axisLine={false}
                      dy={10}
                    />
                    <YAxis
                      stroke="#94a3b8"
                      fontSize={12}
                      tickLine={false}
                      axisLine={false}
                      domain={[0, 100]}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Line
                      type="monotone"
                      dataKey="skor"
                      name="Skor"
                      stroke="#10b981"
                      strokeWidth={4}
                      dot={{
                        fill: "#10b981",
                        strokeWidth: 2,
                        r: 5,
                        stroke: "#fff",
                      }}
                      activeDot={{ r: 8, strokeWidth: 0, fill: "#059669" }}
                      animationDuration={1500}
                    />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-slate-400 font-medium bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                  Belum ada data untuk kategori ini.
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
