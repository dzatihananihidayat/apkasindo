"use client";
import { useState, useEffect } from "react";
import { createClient } from "@/utils/supabase";
import { useRouter } from "next/navigation";

export default function AdminPage() {
  const supabase = createClient();
  const router = useRouter();

  // States
  const [tests, setTests] = useState<any[]>([]);
  const [rekapNilai, setRekapNilai] = useState<any[]>([]);
  const [daftarSoal, setDaftarSoal] = useState<any[]>([]); // STATE BARU UNTUK BANK SOAL

  // States Form
  const [editId, setEditId] = useState<string | null>(null); // STATE UNTUK MODE EDIT
  const [selectedTest, setSelectedTest] = useState("");
  const [pertanyaan, setPertanyaan] = useState("");
  const [jawaban, setJawaban] = useState({ a: "", b: "", c: "", d: "" });
  const [kunci, setKunci] = useState("a");
  const [pembahasan, setPembahasan] = useState("");
  const [fileGambar, setFileGambar] = useState<File | null>(null);
  const [fileGambarOps, setFileGambarOps] = useState<{
    a: File | null;
    b: File | null;
    c: File | null;
    d: File | null;
  }>({ a: null, b: null, c: null, d: null });

  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(true);

  // Ambil Data Saat Halaman Dimuat
  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user || user.email !== "guru@ujian.com") {
      alert("Akses Ditolak!");
      router.push("/dashboard");
      return;
    }

    // 1. Ambil Kategori Tes
    const { data: dataTes } = await supabase.from("daftar_tes").select("*");
    if (dataTes) setTests(dataTes);

    // 2. Ambil Rekap Nilai (Sekarang dengan email_siswa)
    const { data: dataNilai } = await supabase
      .from("hasil_ujian")
      .select(`id, skor, tanggal, email_siswa, daftar_tes (nama_tes)`)
      .order("tanggal", { ascending: false });
    if (dataNilai) setRekapNilai(dataNilai);

    // 3. Ambil Semua Soal (BARU)
    const { data: dataSoal } = await supabase
      .from("soal")
      .select(`*, daftar_tes (nama_tes)`)
      .order("created_at", { ascending: false });
    if (dataSoal) setDaftarSoal(dataSoal);

    setLoading(false);
  };

  // FUNGSI SIMPAN / UPDATE SOAL
  const handleSimpanSoal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTest) return alert("Pilih jenis tes dulu!");
    setUploading(true);

    let urlGambar = "";
    let urlGambarOps = { a: "", b: "", c: "", d: "" };

    // Upload Gambar Utama (Jika ada file baru)
    if (fileGambar) {
      const fileName = `${Date.now()}_${fileGambar.name}`;
      const { error } = await supabase.storage
        .from("gambar-soal")
        .upload(fileName, fileGambar);
      if (!error) {
        const { data: publicUrl } = supabase.storage
          .from("gambar-soal")
          .getPublicUrl(fileName);
        urlGambar = publicUrl.publicUrl;
      }
    }

    // Upload Gambar Opsi (Jika ada file baru)
    for (const o of ["a", "b", "c", "d"]) {
      const file = fileGambarOps[o as keyof typeof fileGambarOps];
      if (file) {
        const fileName = `${Date.now()}_${o.toUpperCase()}_${file.name}`;
        const { error } = await supabase.storage
          .from("gambar-opsi")
          .upload(fileName, file);
        if (!error) {
          const { data: publicUrl } = supabase.storage
            .from("gambar-opsi")
            .getPublicUrl(fileName);
          urlGambarOps[o as keyof typeof urlGambarOps] = publicUrl.publicUrl;
        }
      }
    }

    // Siapkan Payload Data
    const payload: any = {
      tes_id: selectedTest,
      pertanyaan,
      opsi_a: jawaban.a,
      opsi_b: jawaban.b,
      opsi_c: jawaban.c,
      opsi_d: jawaban.d,
      jawaban_benar: kunci,
      pembahasan,
    };

    // Hanya timpa URL gambar di database jika ada gambar baru yang diupload
    if (urlGambar) payload.url_gambar = urlGambar;
    if (urlGambarOps.a) payload.url_opsi_a = urlGambarOps.a;
    if (urlGambarOps.b) payload.url_opsi_b = urlGambarOps.b;
    if (urlGambarOps.c) payload.url_opsi_c = urlGambarOps.c;
    if (urlGambarOps.d) payload.url_opsi_d = urlGambarOps.d;

    if (editId) {
      // MODE UPDATE
      const { error } = await supabase
        .from("soal")
        .update(payload)
        .eq("id", editId);
      if (error) alert("Gagal update soal: " + error.message);
      else alert("Soal berhasil diupdate!");
    } else {
      // MODE INSERT BARU
      const { error } = await supabase.from("soal").insert([payload]);
      if (error) alert("Gagal simpan soal: " + error.message);
      else alert("Soal berhasil ditambahkan!");
    }

    // Reset Form & Refresh Data
    resetForm();
    fetchData();
    setUploading(false);
  };

  // FUNGSI KLIK EDIT SOAL
  const klikEdit = (soal: any) => {
    setEditId(soal.id);
    setSelectedTest(soal.tes_id);
    setPertanyaan(soal.pertanyaan);
    setJawaban({
      a: soal.opsi_a || "",
      b: soal.opsi_b || "",
      c: soal.opsi_c || "",
      d: soal.opsi_d || "",
    });
    setKunci(soal.jawaban_benar);
    setPembahasan(soal.pembahasan || "");
    window.scrollTo({ top: 0, behavior: "smooth" }); // Scroll otomatis ke atas
  };

  // FUNGSI HAPUS SOAL
  const klikHapus = async (id: string) => {
    if (!confirm("Yakin ingin menghapus soal ini secara permanen?")) return;
    const { error } = await supabase.from("soal").delete().eq("id", id);
    if (error) {
      alert("Gagal menghapus: " + error.message);
    } else {
      setDaftarSoal(daftarSoal.filter((s) => s.id !== id));
      alert("Soal berhasil dihapus!");
    }
  };

  const resetForm = () => {
    setEditId(null);
    setPertanyaan("");
    setFileGambar(null);
    setFileGambarOps({ a: null, b: null, c: null, d: null });
    setPembahasan("");
    setJawaban({ a: "", b: "", c: "", d: "" });
  };

  if (loading)
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50">
        <div className="w-12 h-12 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
      </div>
    );

  return (
    <div className="min-h-screen bg-slate-50 p-6 md:p-10 space-y-12 font-sans selection:bg-indigo-100 pb-20">
      {/* HEADER PANEL */}
      <div className="flex flex-col md:flex-row justify-between items-center max-w-6xl mx-auto bg-white p-6 rounded-3xl shadow-sm border border-slate-100 gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-800 tracking-tight">
            Dapur Admin
          </h1>
          <p className="text-slate-500 mt-1 font-medium">
            Kelola Soal, Edit, Hapus, dan Pantau Nilai Siswa.
          </p>
        </div>
        <button
          onClick={() => router.push("/dashboard")}
          className="font-semibold text-slate-600 bg-slate-100 px-6 py-3 rounded-xl hover:bg-slate-200 transition-colors text-sm whitespace-nowrap"
        >
          Kembali ke Dashboard
        </button>
      </div>

      {/* 1. FORM TAMBAH / EDIT SOAL */}
      <div
        className={`max-w-6xl mx-auto bg-white p-10 rounded-3xl shadow-xl border-2 transition-all ${editId ? "border-amber-300 shadow-amber-100" : "border-slate-100 shadow-slate-100"}`}
      >
        <div className="flex items-center justify-between mb-8 border-b border-slate-100 pb-6">
          <div className="flex items-center gap-3">
            <div
              className={`w-12 h-12 rounded-xl flex items-center justify-center shadow-inner text-xl ${editId ? "bg-amber-50 text-amber-600" : "bg-indigo-50 text-indigo-600"}`}
            >
              {editId ? "✏️" : "➕"}
            </div>
            <h2 className="text-2xl font-bold text-slate-800">
              {editId ? "Edit Pertanyaan" : "Tambah Pertanyaan Baru"}
            </h2>
          </div>
          {editId && (
            <button
              onClick={resetForm}
              className="text-sm font-bold text-slate-400 hover:text-rose-500 transition-colors"
            >
              Batal Edit ✖
            </button>
          )}
        </div>

        <form onSubmit={handleSimpanSoal} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                Pilih Kategori Tes
              </label>
              <select
                className="w-full p-3.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-100 text-slate-900"
                value={selectedTest}
                onChange={(e) => setSelectedTest(e.target.value)}
                required
              >
                <option value="">-- Pilih Tes --</option>
                {tests.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.nama_tes}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                Gambar Soal Utama {editId && "(Upload untuk ganti)"}
              </label>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => setFileGambar(e.target.files?.[0] || null)}
                className="w-full text-sm text-slate-500 file:mr-4 file:py-3 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">
              Pertanyaan
            </label>
            <textarea
              className="w-full p-4 border border-slate-200 rounded-xl h-28 focus:ring-2 focus:ring-indigo-100 text-slate-900 placeholder:text-slate-400"
              value={pertanyaan}
              onChange={(e) => setPertanyaan(e.target.value)}
              placeholder="Tulis soal di sini..."
              required
            />
          </div>

          <div className="space-y-6">
            <h4 className="text-sm font-bold text-slate-500 uppercase tracking-wider ml-1">
              Opsi Jawaban:
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {["a", "b", "c", "d"].map((o) => (
                <div
                  key={o}
                  className="bg-slate-50 p-6 rounded-3xl border border-slate-100 space-y-4"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center font-black bg-indigo-50 text-indigo-600 shadow-inner">
                      {o.toUpperCase()}
                    </div>
                    <label className="block text-lg font-semibold text-slate-800 flex-1">
                      Isi Opsi {o.toUpperCase()}
                    </label>
                  </div>
                  <input
                    type="text"
                    className="w-full p-3 border border-slate-200 rounded-xl text-slate-900 placeholder:text-slate-400"
                    value={(jawaban as any)[o]}
                    onChange={(e) =>
                      setJawaban({ ...jawaban, [o]: e.target.value })
                    }
                    placeholder={`Teks pilihan ${o.toUpperCase()}`}
                  />
                  <div className="bg-white p-4 rounded-xl border border-slate-100 space-y-2 shadow-sm">
                    <label className="block text-sm font-semibold text-slate-700">
                      Gambar Opsi {o.toUpperCase()}{" "}
                      {editId && "(Upload untuk ganti)"}
                    </label>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) =>
                        setFileGambarOps({
                          ...fileGambarOps,
                          [o]: e.target.files?.[0] || null,
                        })
                      }
                      className="w-full text-xs file:mr-3 file:py-2 file:px-3 file:rounded-lg file:border-0 file:bg-indigo-50 file:text-indigo-700"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex flex-col md:flex-row gap-6 bg-slate-50 p-6 rounded-2xl border border-slate-100">
            <div className="w-full md:w-1/3">
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                Kunci Jawaban
              </label>
              <select
                className="w-full p-3 border border-slate-200 rounded-xl font-bold text-indigo-700"
                value={kunci}
                onChange={(e) => setKunci(e.target.value)}
              >
                {["a", "b", "c", "d"].map((o) => (
                  <option key={o} value={o}>
                    Opsi {o.toUpperCase()}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex-1">
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                Pembahasan (Opsional)
              </label>
              <input
                type="text"
                className="w-full p-3 border border-slate-200 rounded-xl text-slate-900"
                value={pembahasan}
                onChange={(e) => setPembahasan(e.target.value)}
                placeholder="Penjelasan singkat jawaban benar"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={uploading}
            className={`w-full text-white py-4 rounded-2xl font-bold shadow-lg transition disabled:opacity-50 ${editId ? "bg-amber-500 hover:bg-amber-600 shadow-amber-200" : "bg-indigo-600 hover:bg-indigo-700 shadow-indigo-200"}`}
          >
            {uploading
              ? "Memproses..."
              : editId
                ? "💾 Update Soal Ini"
                : "✨ Simpan Soal Baru"}
          </button>
        </form>
      </div>

      {/* 2. DATABASE BANK SOAL (FITUR BARU) */}
      <div className="max-w-6xl mx-auto bg-white p-10 rounded-3xl shadow-sm border border-slate-100">
        <div className="flex items-center gap-3 mb-8 border-b border-slate-100 pb-6">
          <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center shadow-inner text-xl">
            📚
          </div>
          <h2 className="text-2xl font-bold text-slate-800">
            Database Bank Soal
          </h2>
        </div>

        <div className="overflow-x-auto rounded-2xl border border-slate-200">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-100 text-slate-700">
                <th className="p-4 font-bold border-b">Soal</th>
                <th className="p-4 font-bold border-b">Kategori Tes</th>
                <th className="p-4 font-bold border-b text-center">Kunci</th>
                <th className="p-4 font-bold border-b text-center">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {daftarSoal.length > 0 ? (
                daftarSoal.map((soal) => (
                  <tr
                    key={soal.id}
                    className="hover:bg-slate-50 border-b border-slate-100 last:border-0 group"
                  >
                    <td className="p-4">
                      <p className="text-sm font-semibold text-slate-800 line-clamp-2">
                        {soal.pertanyaan}
                      </p>
                      {soal.url_gambar && (
                        <span className="text-xs text-indigo-500 font-bold mt-1 inline-block">
                          📷 Ada Gambar
                        </span>
                      )}
                    </td>
                    <td className="p-4 text-sm font-medium text-slate-600">
                      <span className="bg-slate-100 px-3 py-1 rounded-lg border border-slate-200 whitespace-nowrap">
                        {soal.daftar_tes?.nama_tes || "Unknown"}
                      </span>
                    </td>
                    <td className="p-4 text-center">
                      <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 font-black flex items-center justify-center mx-auto uppercase">
                        {soal.jawaban_benar}
                      </div>
                    </td>
                    <td className="p-4 text-center">
                      <div className="flex justify-center gap-2 opacity-100 md:opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => klikEdit(soal)}
                          className="bg-blue-50 text-blue-600 p-2 rounded-lg hover:bg-blue-100 transition"
                          title="Edit Soal"
                        >
                          ✏️
                        </button>
                        <button
                          onClick={() => klikHapus(soal.id)}
                          className="bg-rose-50 text-rose-600 p-2 rounded-lg hover:bg-rose-100 transition"
                          title="Hapus Soal"
                        >
                          🗑️
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td
                    colSpan={4}
                    className="p-10 text-center text-slate-500 font-medium"
                  >
                    Belum ada soal di database.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 3. TABEL REKAP NILAI */}
      <div className="max-w-6xl mx-auto bg-white p-10 rounded-3xl shadow-sm border border-slate-100">
        <div className="flex items-center gap-3 mb-8 border-b border-slate-100 pb-6">
          <div className="w-12 h-12 bg-slate-100 text-slate-600 rounded-xl flex items-center justify-center shadow-inner text-xl">
            📊
          </div>
          <h2 className="text-2xl font-bold text-slate-800">
            Rekap Nilai Siswa
          </h2>
        </div>

        <div className="overflow-x-auto rounded-2xl border border-slate-100">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-900 text-white">
                <th className="p-4 border border-slate-800">Tanggal</th>
                <th className="p-4 border border-slate-800">Siswa (Email)</th>
                <th className="p-4 border border-slate-800">Jenis Tes</th>
                <th className="p-4 border border-slate-800">Skor</th>
              </tr>
            </thead>
            <tbody>
              {rekapNilai.length > 0 ? (
                rekapNilai.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50">
                    <td className="p-4 border text-slate-600 text-sm whitespace-nowrap">
                      {new Date(item.tanggal).toLocaleDateString("id-ID", {
                        day: "numeric",
                        month: "long",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </td>
                    {/* MENAMPILKAN EMAIL SISWA */}
                    <td className="p-4 border font-bold text-indigo-700">
                      {item.email_siswa || "Data Lama (Tanpa Email)"}
                    </td>
                    <td className="p-4 border font-semibold text-slate-800">
                      {item.daftar_tes?.nama_tes}
                    </td>
                    <td
                      className={`p-4 border font-extrabold text-2xl ${item.skor >= 70 ? "text-emerald-500" : "text-rose-500"}`}
                    >
                      {item.skor}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={4} className="p-10 text-center text-slate-500">
                    Belum ada data nilai.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
