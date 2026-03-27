import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center font-sans px-6 relative overflow-hidden">
      {/* Dekorasi Background Latar Belakang (Opsional untuk estetika) */}
      <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-indigo-200 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob"></div>
      <div className="absolute top-[20%] right-[-10%] w-96 h-96 bg-purple-200 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob animation-delay-2000"></div>

      <main className="max-w-5xl w-full text-center space-y-12 relative z-10 py-20">
        {/* BAGIAN HERO (Sambutan Utama) */}
        <div className="space-y-6">
          <div className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-indigo-50 border border-indigo-100 text-indigo-700 font-bold text-sm mb-4 shadow-sm">
            ✨ Platform Simulasi CBT Modern
          </div>

          <h1 className="text-5xl md:text-6xl lg:text-7xl font-extrabold text-slate-800 tracking-tight leading-tight">
            Siap Hadapi Ujian dengan <br className="hidden md:block" />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-purple-600">
              Percaya Diri?
            </span>
          </h1>

          <p className="text-lg md:text-xl text-slate-500 max-w-2xl mx-auto font-medium leading-relaxed">
            Berlatih soal ujian kini jauh lebih menyenangkan. Kerjakan simulasi,
            pantau sisa waktu, dan lihat hasil evaluasimu secara instan.
          </p>
        </div>

        {/* TOMBOL AKSI UTAMA */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
          <Link
            href="/login"
            className="w-full sm:w-auto px-10 py-4 bg-indigo-600 text-white font-bold text-lg rounded-2xl hover:bg-indigo-700 shadow-xl shadow-indigo-200 transition-all hover:-translate-y-1 flex items-center justify-center gap-3 group"
          >
            Mulai Belajar Sekarang
            <span className="group-hover:translate-x-1 transition-transform">
              →
            </span>
          </Link>
        </div>

        {/* KARTU FITUR (Untuk meyakinkan siswa) */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-16 md:pt-24">
          {/* Fitur 1 */}
          <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100 hover:shadow-xl hover:shadow-indigo-500/10 hover:-translate-y-1 transition-all text-left">
            <div className="w-14 h-14 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mb-6 text-2xl">
              ⏱️
            </div>
            <h3 className="text-xl font-bold text-slate-800 mb-2">
              Waktu Real-time
            </h3>
            <p className="text-slate-500 font-medium text-sm leading-relaxed">
              Latih manajemen waktumu dengan sistem *timer* yang berjalan persis
              seperti ujian aslinya.
            </p>
          </div>

          {/* Fitur 2 */}
          <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100 hover:shadow-xl hover:shadow-indigo-500/10 hover:-translate-y-1 transition-all text-left">
            <div className="w-14 h-14 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center mb-6 text-2xl">
              📊
            </div>
            <h3 className="text-xl font-bold text-slate-800 mb-2">
              Hasil Instan
            </h3>
            <p className="text-slate-500 font-medium text-sm leading-relaxed">
              Tidak perlu menunggu lama. Begitu selesai, skormu akan langsung
              terhitung secara otomatis.
            </p>
          </div>

          {/* Fitur 3 */}
          <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100 hover:shadow-xl hover:shadow-indigo-500/10 hover:-translate-y-1 transition-all text-left">
            <div className="w-14 h-14 bg-purple-50 text-purple-600 rounded-2xl flex items-center justify-center mb-6 text-2xl">
              📱
            </div>
            <h3 className="text-xl font-bold text-slate-800 mb-2">
              Akses Kapan Saja
            </h3>
            <p className="text-slate-500 font-medium text-sm leading-relaxed">
              Desain yang sangat ringan dan responsif. Belajar dengan nyaman
              lewat laptop maupun layar HP.
            </p>
          </div>
        </div>
      </main>

      {/* FOOTER */}
      <footer className="absolute bottom-6 text-center text-slate-400 text-sm font-medium w-full">
        © {new Date().getFullYear()} Simulasi CBT. Siap bantu kamu lulus.
      </footer>
    </div>
  );
}
