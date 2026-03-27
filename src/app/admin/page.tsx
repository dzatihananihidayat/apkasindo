"use client";
import { useState, useEffect, useRef } from "react";
import { createClient } from "@/utils/supabase";
import { useRouter } from "next/navigation";

export default function AdminPage() {
  const supabase = createClient();
  const router = useRouter();
  const formRef = useRef<HTMLDivElement>(null);

  // States Utama
  const [tests, setTests] = useState<any[]>([]);
  const [rekapNilai, setRekapNilai] = useState<any[]>([]);
  const [daftarSoal, setDaftarSoal] = useState<any[]>([]);

  // States Form Tambah/Edit Soal
  const [editId, setEditId] = useState<string | null>(null);
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

  // ==========================================
  // STATES UNTUK FILTER & PAGINATION (BARU)
  // ==========================================
  const ITEMS_PER_PAGE = 10;

  // State Filter Bank Soal
  const [searchSoal, setSearchSoal] = useState("");
  const [filterTesSoal, setFilterTesSoal] = useState("");
  const [currentPageSoal, setCurrentPageSoal] = useState(1);

  // State Filter Rekap Nilai
  const [searchEmail, setSearchEmail] = useState("");
  const [filterTesNilai, setFilterTesNilai] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [currentPageNilai, setCurrentPageNilai] = useState(1);

  // Reset page ke 1 kalau filter diganti
  useEffect(() => {
    setCurrentPageSoal(1);
  }, [searchSoal, filterTesSoal]);
  useEffect(() => {
    setCurrentPageNilai(1);
  }, [searchEmail, filterTesNilai, startDate, endDate]);

  // ==========================================
  // PENGAMBILAN DATA
  // ==========================================
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

    // Ambil Data Tes
    const { data: dataTes } = await supabase.from("daftar_tes").select("*");
    if (dataTes) setTests(dataTes);

    // Ambil Data Rekap Nilai
    const { data: dataNilai } = await supabase
      .from("hasil_ujian")
      .select("*")
      .order("tanggal", { ascending: false });
    if (dataNilai && dataTes) {
      const formattedNilai = dataNilai.map((n) => {
        const t = dataTes.find((x) => x.id === n.tes_id);
        return { ...n, nama_tes: t ? t.nama_tes : "Unknown" };
      });
      setRekapNilai(formattedNilai);
    }

    // Ambil Data Bank Soal
    const { data: dataSoal, error: errorSoal } = await supabase
      .from("soal")
      .select("*");
    if (errorSoal) console.error("Error Get Soal:", errorSoal);
    if (dataSoal && dataTes) {
      const formattedSoal = dataSoal.map((s) => {
        const t = dataTes.find((x) => x.id === s.tes_id);
        return { ...s, nama_tes: t ? t.nama_tes : "Unknown" };
      });
      // Urutkan manual (karena tanpa .order dari supabase)
      const sortedSoal = formattedSoal.sort(
        (a, b) =>
          new Date(b.created_at || 0).getTime() -
          new Date(a.created_at || 0).getTime(),
      );
      setDaftarSoal(sortedSoal);
    }

    setLoading(false);
  };

  // ==========================================
  // FUNGSI SIMPAN, EDIT, HAPUS SOAL
  // ==========================================
  const handleSimpanSoal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTest) return alert("Pilih jenis tes dulu!");
    setUploading(true);

    let urlGambar = "";
    let urlGambarOps = { a: "", b: "", c: "", d: "" };

    if (fileGambar) {
      const fileName = `${Date.now()}_${fileGambar.name}`;
      const { error } = await supabase.storage
        .from("gambar-soal")
        .upload(fileName, fileGambar);
      if (!error)
        urlGambar = supabase.storage.from("gambar-soal").getPublicUrl(fileName)
          .data.publicUrl;
    }

    for (const o of ["a", "b", "c", "d"]) {
      const file = fileGambarOps[o as keyof typeof fileGambarOps];
      if (file) {
        const fileName = `${Date.now()}_${o.toUpperCase()}_${file.name}`;
        const { error } = await supabase.storage
          .from("gambar-opsi")
          .upload(fileName, file);
        if (!error)
          urlGambarOps[o as keyof typeof urlGambarOps] = supabase.storage
            .from("gambar-opsi")
            .getPublicUrl(fileName).data.publicUrl;
      }
    }

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

    if (urlGambar) payload.url_gambar = urlGambar;
    if (urlGambarOps.a) payload.url_opsi_a = urlGambarOps.a;
    if (urlGambarOps.b) payload.url_opsi_b = urlGambarOps.b;
    if (urlGambarOps.c) payload.url_opsi_c = urlGambarOps.c;
    if (urlGambarOps.d) payload.url_opsi_d = urlGambarOps.d;

    if (editId) {
      const { error } = await supabase
        .from("soal")
        .update(payload)
        .eq("id", editId);
      if (error) alert("Gagal update soal: " + error.message);
      else alert("Soal berhasil diupdate!");
    } else {
      const { error } = await supabase.from("soal").insert([payload]);
      if (error) alert("Gagal simpan soal: " + error.message);
      else alert("Soal berhasil ditambahkan!");
    }

    resetForm();
    fetchData();
    setUploading(false);
  };

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
    formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const klikHapus = async (id: string) => {
    if (!confirm("Yakin ingin menghapus soal ini secara permanen?")) return;
    const { error } = await supabase.from("soal").delete().eq("id", id);
    if (error) alert("Gagal menghapus: " + error.message);
    else {
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

  // ==========================================
  // LOGIKA FILTER & PAGINATION DATA
  // ==========================================

  // 1. Pemrosesan Data Bank Soal
  const filteredSoal = daftarSoal.filter((soal) => {
    const matchSearch = soal.pertanyaan
      ?.toLowerCase()
      .includes(searchSoal.toLowerCase());
    const matchTes = filterTesSoal ? soal.tes_id === filterTesSoal : true;
    return matchSearch && matchTes;
  });
  const totalPagesSoal = Math.ceil(filteredSoal.length / ITEMS_PER_PAGE);
  const paginatedSoal = filteredSoal.slice(
    (currentPageSoal - 1) * ITEMS_PER_PAGE,
    currentPageSoal * ITEMS_PER_PAGE,
  );

  // 2. Pemrosesan Data Rekap Nilai
  const filteredNilai = rekapNilai.filter((nilai) => {
    const matchEmail = (nilai.email_siswa || "")
      .toLowerCase()
      .includes(searchEmail.toLowerCase());
    const matchTes = filterTesNilai ? nilai.tes_id === filterTesNilai : true;

    // Logika Rentang Tanggal
    let matchDate = true;
    if (startDate || endDate) {
      const nDate = new Date(nilai.tanggal);
      nDate.setHours(0, 0, 0, 0); // Normalisasi jam untuk perbandingan akurat

      if (startDate) {
        const sDate = new Date(startDate);
        sDate.setHours(0, 0, 0, 0);
        if (nDate < sDate) matchDate = false;
      }
      if (endDate) {
        const eDate = new Date(endDate);
        eDate.setHours(23, 59, 59, 999);
        if (nDate > eDate) matchDate = false;
      }
    }
    return matchEmail && matchTes && matchDate;
  });
  const totalPagesNilai = Math.ceil(filteredNilai.length / ITEMS_PER_PAGE);
  const paginatedNilai = filteredNilai.slice(
    (currentPageNilai - 1) * ITEMS_PER_PAGE,
    currentPageNilai * ITEMS_PER_PAGE,
  );

  if (loading)
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50">
        <div className="w-12 h-12 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
      </div>
    );

  return (
    <div className="min-h-screen bg-slate-50 p-6 md:p-10 space-y-12 font-sans selection:bg-indigo-100 pb-20">
      {/* HEADER PANEL */}
      <div className="flex flex-col md:flex-row justify-between items-center max-w-7xl mx-auto bg-white p-6 rounded-3xl shadow-sm border border-slate-100 gap-4">
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
        ref={formRef}
        className={`max-w-7xl mx-auto bg-white p-8 md:p-10 rounded-3xl shadow-xl border-2 transition-all ${editId ? "border-amber-300 shadow-amber-100" : "border-slate-100 shadow-slate-100"}`}
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
              className="text-sm font-bold bg-rose-50 px-4 py-2 rounded-lg text-rose-500 hover:bg-rose-100 transition-colors"
            >
              Batal Edit ✖
            </button>
          )}
        </div>

        <form onSubmit={handleSimpanSoal} className="space-y-6">
          {/* (Bagian form input soal dibiarkan utuh karena sudah sempurna) */}
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
                Gambar Soal Utama{" "}
                {editId && "(Biarkan kosong jika tidak ganti)"}
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
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {["a", "b", "c", "d"].map((o) => (
                <div
                  key={o}
                  className="bg-slate-50 p-5 rounded-2xl border border-slate-100 space-y-4"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center font-black bg-indigo-50 text-indigo-600 shadow-inner">
                      {o.toUpperCase()}
                    </div>
                    <label className="block font-semibold text-slate-800 flex-1">
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
              ))}
            </div>
          </div>

          <div className="flex flex-col md:flex-row gap-6 bg-slate-50 p-6 rounded-2xl border border-slate-100">
            <div className="w-full md:w-1/3">
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                Kunci Jawaban Benar
              </label>
              <select
                className="w-full p-3 border border-slate-200 rounded-xl font-bold text-emerald-700 bg-emerald-50 outline-none"
                value={kunci}
                onChange={(e) => setKunci(e.target.value)}
              >
                {["a", "b", "c", "d"].map((o) => (
                  <option key={o} value={o}>
                    Pilihan {o.toUpperCase()}
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
              ? "Memproses Data..."
              : editId
                ? "💾 Simpan Perubahan"
                : "✨ Tambahkan ke Bank Soal"}
          </button>
        </form>
      </div>

      {/* 2. DATABASE BANK SOAL (DENGAN FILTER & PAGINATION) */}
      <div className="max-w-7xl mx-auto bg-white p-6 md:p-10 rounded-3xl shadow-sm border border-slate-100">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between mb-8 border-b border-slate-100 pb-6 gap-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center shadow-inner text-xl">
              📚
            </div>
            <div>
              <h2 className="text-2xl font-bold text-slate-800">
                Database Bank Soal
              </h2>
              <p className="text-sm font-medium text-slate-500 mt-1">
                Total: {filteredSoal.length} Soal Ditemukan
              </p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 w-full lg:w-auto">
            {/* Input Pencarian */}
            <input
              type="text"
              placeholder="🔍 Cari teks soal..."
              value={searchSoal}
              onChange={(e) => setSearchSoal(e.target.value)}
              className="px-4 py-2 placeholder:text-slate-400 text-slate-900 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-100 outline-none w-full sm:w-64"
            />
            {/* Dropdown Filter Kategori */}
            <select
              value={filterTesSoal}
              onChange={(e) => setFilterTesSoal(e.target.value)}
              className="px-4 py-2 border border-slate-200 rounded-xl text-sm font-medium text-slate-600 focus:ring-2 focus:ring-indigo-100 outline-none w-full sm:w-auto bg-slate-50"
            >
              <option value="">Semua Kategori Tes</option>
              {tests.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.nama_tes}
                </option>
              ))}
            </select>
            <button
              onClick={() => {
                resetForm();
                formRef.current?.scrollIntoView({
                  behavior: "smooth",
                  block: "start",
                });
              }}
              className="flex items-center justify-center gap-2 bg-slate-800 text-white px-5 py-2.5 rounded-xl font-semibold hover:bg-slate-700 transition-all text-sm whitespace-nowrap"
            >
              <span>➕</span> Tambah Soal
            </button>
          </div>
        </div>

        <div className="overflow-x-auto rounded-2xl border border-slate-200 shadow-sm mb-4">
          <table className="w-full text-left border-collapse min-w-[800px]">
            <thead>
              <tr className="bg-slate-50 text-slate-700 border-b border-slate-200">
                <th className="p-4 font-bold w-16 text-center">No</th>
                <th className="p-4 font-bold w-1/3">Pertanyaan & Kategori</th>
                <th className="p-4 font-bold">Pilihan Jawaban</th>
                <th className="p-4 font-bold text-center">Kunci</th>
                <th className="p-4 font-bold text-center w-32">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {paginatedSoal.length > 0 ? (
                paginatedSoal.map((soal, index) => (
                  <tr
                    key={soal.id}
                    className="hover:bg-slate-50/80 border-b border-slate-100 last:border-0 transition-colors"
                  >
                    {/* Nomor Urut menyesuaikan halaman */}
                    <td className="p-4 text-center text-slate-400 font-bold">
                      {(currentPageSoal - 1) * ITEMS_PER_PAGE + index + 1}
                    </td>
                    <td className="p-4 align-top">
                      <span className="inline-block bg-indigo-50 text-indigo-600 text-xs font-bold px-2.5 py-1 rounded-md mb-2">
                        {soal.nama_tes}
                      </span>
                      <p className="text-sm font-semibold text-slate-800 leading-relaxed mb-2">
                        {soal.pertanyaan}
                      </p>
                    </td>
                    <td className="p-4 align-top">
                      <ul className="text-sm text-slate-600 space-y-1.5 font-medium">
                        <li
                          className={
                            soal.jawaban_benar === "a"
                              ? "text-emerald-600 font-bold"
                              : ""
                          }
                        >
                          A. {soal.opsi_a || "-"}
                        </li>
                        <li
                          className={
                            soal.jawaban_benar === "b"
                              ? "text-emerald-600 font-bold"
                              : ""
                          }
                        >
                          B. {soal.opsi_b || "-"}
                        </li>
                        <li
                          className={
                            soal.jawaban_benar === "c"
                              ? "text-emerald-600 font-bold"
                              : ""
                          }
                        >
                          C. {soal.opsi_c || "-"}
                        </li>
                        <li
                          className={
                            soal.jawaban_benar === "d"
                              ? "text-emerald-600 font-bold"
                              : ""
                          }
                        >
                          D. {soal.opsi_d || "-"}
                        </li>
                      </ul>
                    </td>
                    <td className="p-4 text-center align-top">
                      <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 font-black flex items-center justify-center mx-auto uppercase">
                        {soal.jawaban_benar}
                      </div>
                    </td>
                    <td className="p-4 align-top">
                      <div className="flex justify-center gap-2">
                        <button
                          onClick={() => klikEdit(soal)}
                          className="bg-blue-50 text-blue-600 px-3 py-2 rounded-lg hover:bg-blue-600 hover:text-white transition font-semibold text-xs"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => klikHapus(soal.id)}
                          className="bg-rose-50 text-rose-600 px-3 py-2 rounded-lg hover:bg-rose-600 hover:text-white transition font-semibold text-xs"
                        >
                          Hapus
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td
                    colSpan={5}
                    className="p-12 text-center text-slate-500 font-medium bg-slate-50/50"
                  >
                    Soal tidak ditemukan.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* PAGINATION SOAL */}
        {totalPagesSoal > 1 && (
          <div className="flex items-center justify-between bg-white border border-slate-100 p-4 rounded-xl">
            <button
              onClick={() =>
                setCurrentPageSoal((prev) => Math.max(prev - 1, 1))
              }
              disabled={currentPageSoal === 1}
              className="px-4 py-2 bg-slate-100 text-slate-600 rounded-lg disabled:opacity-50 font-semibold text-sm hover:bg-slate-200 transition"
            >
              ← Sebelumnya
            </button>
            <span className="text-sm font-bold text-slate-500">
              Halaman {currentPageSoal} dari {totalPagesSoal}
            </span>
            <button
              onClick={() =>
                setCurrentPageSoal((prev) => Math.min(prev + 1, totalPagesSoal))
              }
              disabled={currentPageSoal === totalPagesSoal}
              className="px-4 py-2 bg-slate-100 text-slate-600 rounded-lg disabled:opacity-50 font-semibold text-sm hover:bg-slate-200 transition"
            >
              Selanjutnya →
            </button>
          </div>
        )}
      </div>

      {/* 3. TABEL REKAP NILAI (DENGAN FILTER TANGGAL & PAGINATION) */}
      <div className="max-w-7xl mx-auto bg-white p-6 md:p-10 rounded-3xl shadow-sm border border-slate-100">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between mb-8 border-b border-slate-100 pb-6 gap-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center shadow-inner text-xl">
              📊
            </div>
            <div>
              <h2 className="text-2xl font-bold text-slate-800">
                Rekap Nilai Siswa
              </h2>
              <p className="text-sm font-medium text-slate-500 mt-1">
                Total: {filteredNilai.length} Riwayat Ditemukan
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 w-full lg:w-auto">
            {/* Cari Email */}
            <input
              type="text"
              placeholder="🔍 Cari email siswa..."
              value={searchEmail}
              onChange={(e) => setSearchEmail(e.target.value)}
              className="px-4 py-2.5 placeholder:text-slate-400 text-slate-900 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-100 outline-none"
            />
            {/* Filter Tes */}
            <select
              value={filterTesNilai}
              onChange={(e) => setFilterTesNilai(e.target.value)}
              className="px-4 py-2.5 border border-slate-200 rounded-xl text-sm font-medium text-slate-600 bg-slate-50 outline-none"
            >
              <option value="">Semua Tes</option>
              {tests.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.nama_tes}
                </option>
              ))}
            </select>
            {/* Mulai Tanggal */}
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="px-4 py-2.5 border border-slate-200 rounded-xl text-sm text-slate-600 outline-none"
              title="Dari Tanggal"
            />
            {/* Sampai Tanggal */}
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="px-4 py-2.5 border border-slate-200 rounded-xl text-sm text-slate-600 outline-none"
              title="Sampai Tanggal"
            />
          </div>
        </div>

        <div className="overflow-x-auto rounded-2xl border border-slate-100 mb-4">
          <table className="w-full text-left border-collapse min-w-[700px]">
            <thead>
              <tr className="bg-slate-900 text-white">
                <th className="p-4 border border-slate-800">Tanggal Ujian</th>
                <th className="p-4 border border-slate-800">Siswa (Email)</th>
                <th className="p-4 border border-slate-800">Jenis Tes</th>
                <th className="p-4 border border-slate-800 text-center">
                  Skor
                </th>
              </tr>
            </thead>
            <tbody>
              {paginatedNilai.length > 0 ? (
                paginatedNilai.map((item) => (
                  <tr
                    key={item.id}
                    className="hover:bg-slate-50 border-b border-slate-100"
                  >
                    <td className="p-4 text-slate-600 text-sm whitespace-nowrap">
                      {new Date(item.tanggal).toLocaleDateString("id-ID", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </td>
                    <td className="p-4 font-bold text-indigo-700">
                      {item.email_siswa || "Data Lama"}
                    </td>
                    <td className="p-4 font-semibold text-slate-800">
                      {item.nama_tes}
                    </td>
                    <td
                      className={`p-4 font-extrabold text-2xl text-center ${item.skor >= 70 ? "text-emerald-500" : "text-rose-500"}`}
                    >
                      {item.skor}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={4} className="p-10 text-center text-slate-500">
                    Tidak ada riwayat nilai untuk filter tersebut.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* PAGINATION NILAI */}
        {totalPagesNilai > 1 && (
          <div className="flex items-center justify-between bg-white border border-slate-100 p-4 rounded-xl">
            <button
              onClick={() =>
                setCurrentPageNilai((prev) => Math.max(prev - 1, 1))
              }
              disabled={currentPageNilai === 1}
              className="px-4 py-2 bg-slate-100 text-slate-600 rounded-lg disabled:opacity-50 font-semibold text-sm hover:bg-slate-200 transition"
            >
              ← Sebelumnya
            </button>
            <span className="text-sm font-bold text-slate-500">
              Halaman {currentPageNilai} dari {totalPagesNilai}
            </span>
            <button
              onClick={() =>
                setCurrentPageNilai((prev) =>
                  Math.min(prev + 1, totalPagesNilai),
                )
              }
              disabled={currentPageNilai === totalPagesNilai}
              className="px-4 py-2 bg-slate-100 text-slate-600 rounded-lg disabled:opacity-50 font-semibold text-sm hover:bg-slate-200 transition"
            >
              Selanjutnya →
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
