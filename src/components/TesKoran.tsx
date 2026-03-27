"use client";
import { useState, useEffect } from "react";

export default function TesKoran({
  durasi,
  onFinish,
}: {
  durasi: number;
  onFinish: (hasil: any) => void;
}) {
  const [grid, setGrid] = useState<number[][]>([]);
  const [jawaban, setJawaban] = useState<{ [key: string]: string }>({});
  const [sisaWaktu, setSisaWaktu] = useState(durasi * 60);

  // 1. Generate angka acak saat komponen muncul (10 kolom x 12 baris)
  useEffect(() => {
    const baris = 12;
    const kolom = 10;
    const angkaBaru = Array.from({ length: kolom }, () =>
      Array.from({ length: baris }, () => Math.floor(Math.random() * 10)),
    );
    setGrid(angkaBaru);
  }, []);

  // 2. Timer Ujian Koran
  useEffect(() => {
    if (sisaWaktu <= 0) {
      hitungHasil();
      return;
    }
    const timer = setInterval(() => setSisaWaktu((prev) => prev - 1), 1000);
    return () => clearInterval(timer);
  }, [sisaWaktu]);

  const hitungHasil = () => {
    let benar = 0;
    let terjawab = 0;

    grid.forEach((kolom, kIdx) => {
      kolom.forEach((angka, bIdx) => {
        if (bIdx === 0) return; // Angka pertama tidak ada pasangan atasnya

        const kunci = `${kIdx}-${bIdx}`;
        const inputUser = jawaban[kunci];

        if (inputUser !== undefined && inputUser !== "") {
          terjawab++;
          // Logika Tes Koran: (Angka 1 + Angka 2) ambil digit terakhir
          const total = (grid[kIdx][bIdx - 1] + grid[kIdx][bIdx]) % 10;
          if (parseInt(inputUser) === total) {
            benar++;
          }
        }
      });
    });

    onFinish({ benar, terjawab });
  };

  return (
    <div className="p-4 bg-white rounded-xl shadow-lg">
      <div className="text-center mb-6">
        <div className="text-2xl font-bold text-red-500">
          {Math.floor(sisaWaktu / 60)}:
          {(sisaWaktu % 60).toString().padStart(2, "0")}
        </div>
        <p className="text-sm text-gray-500">
          Jumlahkan 2 angka berurutan, ambil angka terakhirnya saja.
        </p>
      </div>

      <div className="flex gap-4 overflow-x-auto pb-4 justify-center">
        {grid.map((kolom, kIdx) => (
          <div
            key={kIdx}
            className="flex flex-col gap-2 bg-gray-50 p-2 rounded border"
          >
            {kolom.map((angka, bIdx) => (
              <div key={bIdx} className="flex flex-col items-center">
                <div className="w-10 h-10 flex items-center justify-center font-bold text-lg">
                  {angka}
                </div>
                {bIdx < kolom.length - 1 && (
                  <input
                    type="text"
                    maxLength={1}
                    className="w-8 h-8 text-center border-2 border-blue-300 rounded focus:border-blue-500 outline-none text-sm"
                    onChange={(e) =>
                      setJawaban({
                        ...jawaban,
                        [`${kIdx}-${bIdx + 1}`]: e.target.value,
                      })
                    }
                  />
                )}
              </div>
            ))}
          </div>
        ))}
      </div>

      <button
        onClick={hitungHasil}
        className="mt-6 w-full bg-blue-600 text-white py-3 rounded-lg font-bold"
      >
        Selesai & Lihat Hasil
      </button>
    </div>
  );
}
