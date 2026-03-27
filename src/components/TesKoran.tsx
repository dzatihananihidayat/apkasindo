"use client";
import { useState, useEffect, useRef } from "react";
import { createClient } from "@/utils/supabase";
import { useRouter } from "next/navigation"; // Tambahkan useRouter

interface InputData {
  id: string;
  globalIndex: number;
  value: string;
  correctAnswer: number;
  isReadOnly: boolean;
  status: "idle" | "correct" | "wrong";
}

interface ColumnData {
  id: number;
  numbers: number[];
  inputs: InputData[];
}

export default function TesKoran({
  dataTes,
  tesId,
}: {
  dataTes: any;
  tesId: string;
}) {
  const supabase = createClient();
  const router = useRouter(); // Inisialisasi router

  const [timeLimit, setTimeLimit] = useState<number>(
    dataTes?.durasi_menit || 2,
  );
  const [timeLeft, setTimeLeft] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [isFinished, setIsFinished] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [gridData, setGridData] = useState<ColumnData[]>([]);

  const [score, setScore] = useState({
    correct: 0,
    wrong: 0,
    filled: 0,
    empty: 0,
  });
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const columnsCount = 15;
  const rowsCount = 12;
  const totalSoal = columnsCount * rowsCount;

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (isPlaying && timeLeft > 0) {
      timer = setInterval(() => {
        setTimeLeft((prev) => prev - 1);
      }, 1000);
    } else if (isPlaying && timeLeft <= 0) {
      endGame();
    }
    return () => clearInterval(timer);
  }, [isPlaying, timeLeft]);

  const generateGrid = () => {
    let newGrid: ColumnData[] = [];
    let inputIndexCounter = 0;
    inputRefs.current = new Array(totalSoal).fill(null);

    for (let c = 0; c < columnsCount; c++) {
      let colData: ColumnData = { id: c, numbers: [], inputs: [] };
      let prevNum = Math.floor(Math.random() * 10);
      colData.numbers.push(prevNum);

      for (let r = 0; r < rowsCount; r++) {
        let currentNum = Math.floor(Math.random() * 10);
        let correctAnswer = (prevNum + currentNum) % 10;

        colData.numbers.push(currentNum);
        colData.inputs.push({
          id: `input-${c}-${r}`,
          globalIndex: inputIndexCounter++,
          value: "",
          correctAnswer: correctAnswer,
          isReadOnly: false,
          status: "idle",
        });
        prevNum = currentNum;
      }
      newGrid.push(colData);
    }
    setGridData(newGrid);
  };

  const startGame = () => {
    if (timeLimit <= 0) {
      alert("Masukkan waktu yang valid!");
      return;
    }
    setIsFinished(false);
    setIsPlaying(true);
    setScore({ correct: 0, wrong: 0, filled: 0, empty: 0 });
    setTimeLeft(timeLimit * 60);
    generateGrid();

    setTimeout(() => {
      if (inputRefs.current[0]) {
        inputRefs.current[0].focus();
      }
    }, 100);
  };

  const endGame = async () => {
    setIsPlaying(false);
    setIsFinished(true);
    setIsSaving(true);

    let correctCount = 0;
    let totalFilled = 0;
    let wrongCount = 0;
    let grafikPerKolom: any[] = [];

    // Evaluasi Grid sekaligus menghitung statistik secara presisi
    const evaluatedGrid = gridData.map((col, index) => {
      let benarDiKolom = 0;
      let salahDiKolom = 0;

      const evalInputs = col.inputs.map((input) => {
        let finalStatus: "idle" | "correct" | "wrong" = "idle";

        // Cek jika input benar-benar memiliki isi
        if (input.value.trim() !== "") {
          totalFilled++;
          if (parseInt(input.value) === input.correctAnswer) {
            correctCount++;
            benarDiKolom++;
            finalStatus = "correct";
          } else {
            wrongCount++;
            salahDiKolom++;
            finalStatus = "wrong";
          }
        }

        return { ...input, isReadOnly: true, status: finalStatus };
      });

      grafikPerKolom.push({
        name: `K-${index + 1}`,
        Benar: benarDiKolom,
        Salah: salahDiKolom,
      });

      return { ...col, inputs: evalInputs };
    });

    setGridData(evaluatedGrid);

    // Total kosong adalah sisa dari total soal dikurangi yang diisi
    const emptyCount = totalSoal - totalFilled;

    setScore({
      correct: correctCount,
      wrong: wrongCount,
      filled: totalFilled,
      empty: emptyCount,
    });

    // Simpan ke Supabase di background
    const skorAkhir =
      totalFilled > 0 ? Math.round((correctCount / totalFilled) * 100) : 0;
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user) {
      await supabase.from("hasil_ujian").insert([
        {
          user_id: user.id,
          email_siswa: user.email,
          tes_id: tesId,
          skor: skorAkhir,
          tanggal: new Date().toISOString(),
          durasi: `${timeLimit} Menit`,
          jawaban_siswa: {
            kategori: "koran",
            total_benar: correctCount,
            total_diisi: totalFilled,
            total_salah: wrongCount,
            total_kosong: emptyCount,
            grafik: grafikPerKolom,
          },
        },
      ]);
    }

    setIsSaving(false);
  };

  const handleInputChange = (
    colIndex: number,
    inputIndex: number,
    globalIndex: number,
    val: string,
  ) => {
    const cleanVal = val.replace(/[^0-9]/g, "");
    if (!cleanVal) return;

    const newGrid = [...gridData];
    newGrid[colIndex].inputs[inputIndex].value = cleanVal;
    newGrid[colIndex].inputs[inputIndex].isReadOnly = true;
    setGridData(newGrid);

    if (globalIndex + 1 < inputRefs.current.length) {
      const nextInput = inputRefs.current[globalIndex + 1];
      if (nextInput) {
        nextInput.focus();
        nextInput.scrollIntoView({
          behavior: "smooth",
          block: "nearest",
          inline: "center",
        });
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    const forbiddenKeys = [
      "Backspace",
      "ArrowUp",
      "ArrowLeft",
      "ArrowRight",
      "ArrowDown",
    ];
    if (forbiddenKeys.includes(e.key)) {
      e.preventDefault();
    }
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60)
      .toString()
      .padStart(2, "0");
    const s = (seconds % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  };

  return (
    <div className="max-w-4xl mx-auto w-full flex flex-col items-center py-8 px-4 font-sans selection:bg-indigo-100">
      {/* HEADER CONTROLS */}
      <div className="bg-white p-6 md:p-8 rounded-3xl shadow-sm border border-slate-100 w-full mb-6 flex flex-col md:flex-row justify-between items-center gap-6">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">
            {dataTes?.nama_tes || "Latihan Tes Koran"}
          </h2>
          <p className="text-slate-500 font-medium mt-1 text-sm">
            Jumlahkan angka atas & bawah. Tulis angka belakangnya saja.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-4">
          {!isPlaying && !isFinished && (
            <div className="flex items-center gap-3">
              <label className="text-slate-600 font-semibold text-sm">
                Waktu (Menit):
              </label>
              <input
                type="number"
                value={timeLimit}
                onChange={(e) => setTimeLimit(Number(e.target.value))}
                disabled={isPlaying}
                className="w-16 p-2 text-center border-2 border-slate-200 rounded-xl font-bold text-indigo-600 focus:border-indigo-500 outline-none transition-all"
                min={1}
              />
            </div>
          )}

          {isPlaying || isFinished ? (
            <div className="bg-rose-50 text-rose-600 px-6 py-2.5 rounded-xl font-bold text-xl tracking-wider shadow-sm border border-rose-100">
              {formatTime(timeLeft)}
            </div>
          ) : null}

          {!isPlaying && (
            <button
              onClick={isFinished ? () => window.location.reload() : startGame}
              className="bg-indigo-600 text-white px-6 py-2.5 rounded-xl font-semibold hover:bg-indigo-700 shadow-md transition-all hover:-translate-y-0.5"
            >
              {isFinished ? "Ulangi Latihan" : "Mulai Tes"}
            </button>
          )}

          {isPlaying && (
            <button
              onClick={endGame}
              className="bg-slate-800 text-white px-6 py-2.5 rounded-xl font-semibold hover:bg-slate-700 shadow-md transition-all hover:-translate-y-0.5"
            >
              Akhiri Tes
            </button>
          )}
        </div>
      </div>

      {/* RANGKUMAN METRIK LENGKAP */}
      {isFinished && (
        <div className="bg-emerald-50 border border-emerald-200 p-6 md:p-8 rounded-3xl w-full mb-6 text-center shadow-sm">
          <h3 className="text-2xl font-bold text-emerald-800 mb-6">
            Tes Selesai! Berikut Rangkumannya:
          </h3>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-white p-4 rounded-2xl border border-emerald-100 shadow-sm">
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">
                Terjawab
              </p>
              <p className="text-2xl font-black text-blue-600">
                {score.filled}
              </p>
            </div>
            <div className="bg-white p-4 rounded-2xl border border-emerald-100 shadow-sm">
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">
                Tdk Terjawab
              </p>
              <p className="text-2xl font-black text-slate-400">
                {score.empty}
              </p>
            </div>
            <div className="bg-white p-4 rounded-2xl border border-emerald-100 shadow-sm">
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">
                Jawaban Benar
              </p>
              <p className="text-2xl font-black text-emerald-600">
                {score.correct}
              </p>
            </div>
            <div className="bg-white p-4 rounded-2xl border border-emerald-100 shadow-sm">
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">
                Jawaban Salah
              </p>
              <p className="text-2xl font-black text-rose-500">{score.wrong}</p>
            </div>
          </div>

          <div className="mb-6">
            {isSaving ? (
              <span className="text-sm font-medium text-emerald-600 flex items-center justify-center gap-2">
                <div className="w-4 h-4 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin"></div>
                Menyimpan hasil ke database...
              </span>
            ) : (
              <span className="text-sm font-bold text-emerald-700">
                ✓ Hasil ujian dan grafik telah tersimpan
              </span>
            )}
          </div>

          {/* TOMBOL KEMBALI */}
          <div className="flex justify-center mt-2">
            <button
              onClick={() => router.back()}
              className="bg-emerald-600 text-white px-8 py-3 rounded-xl font-bold hover:bg-emerald-700 shadow-md transition-all flex items-center gap-2 hover:-translate-y-0.5"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M10 19l-7-7m0 0l7-7m-7 7h18"
                />
              </svg>
              Kembali
            </button>
          </div>
        </div>
      )}

      {/* AREA GRID PERMAINAN & EVALUASI */}
      {(isPlaying || isFinished) && (
        <div className="w-full bg-white p-6 rounded-3xl shadow-sm border border-slate-100 overflow-x-auto scroll-smooth custom-scrollbar">
          <div className="flex justify-start gap-4 md:gap-6 min-w-max pb-4">
            {gridData.map((col) => (
              <div key={col.id} className="flex flex-row relative">
                <div className="flex flex-col border-r border-slate-200">
                  {col.numbers.map((num, i) => (
                    <div
                      key={`num-${i}`}
                      className="w-[38px] md:w-[46px] h-[38px] md:h-[46px] flex items-center justify-center text-slate-800 font-semibold text-lg border-b border-l border-t border-slate-200 bg-slate-50 first:rounded-tl-lg last:rounded-bl-lg"
                    >
                      {num}
                    </div>
                  ))}
                </div>

                <div className="flex flex-col mt-[19px] md:mt-[23px] -ml-[1px]">
                  {col.inputs.map((input) => (
                    <input
                      key={input.id}
                      ref={(el) => {
                        inputRefs.current[input.globalIndex] = el;
                      }}
                      type="tel"
                      inputMode="numeric"
                      maxLength={1}
                      disabled={isFinished}
                      readOnly={input.isReadOnly}
                      value={input.value}
                      onChange={(e) =>
                        handleInputChange(
                          col.id,
                          col.inputs.indexOf(input),
                          input.globalIndex,
                          e.target.value,
                        )
                      }
                      onKeyDown={handleKeyDown}
                      className={`
                        w-[38px] md:w-[46px] h-[38px] md:h-[46px] text-center font-bold text-lg md:text-xl outline-none border transition-all z-10
                        ${input.isReadOnly && input.status === "idle" ? "bg-slate-50 text-slate-400 border-slate-200 cursor-default" : ""}
                        ${input.status === "correct" ? "bg-emerald-100 text-emerald-700 border-emerald-300 cursor-default" : ""}
                        ${input.status === "wrong" ? "bg-rose-100 text-rose-700 border-rose-300 cursor-default" : ""}
                        ${!input.isReadOnly ? "bg-white text-indigo-600 border-slate-300 focus:border-2 focus:border-indigo-600 focus:shadow-md hover:bg-slate-50 cursor-text" : ""}
                      `}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
