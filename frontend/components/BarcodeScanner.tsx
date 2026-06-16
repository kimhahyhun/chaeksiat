"use client";

import { useEffect, useRef, useState } from "react";

interface BarcodeScannerProps {
  onDetected: (isbn: string) => void;
  onClose: () => void;
}

export default function BarcodeScanner({ onDetected, onClose }: BarcodeScannerProps) {
  const containerId = "barcode-scanner-region";
  const scannerRef = useRef<unknown>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let stopped = false;

    import("html5-qrcode").then(({ Html5Qrcode }) => {
      if (stopped) return;
      const scanner = new Html5Qrcode(containerId);
      scannerRef.current = scanner;

      scanner
        .start(
          { facingMode: "environment" },
          { fps: 10, qrbox: { width: 250, height: 150 } },
          (decodedText) => {
            // EAN-13 바코드는 13자리 숫자
            const digits = decodedText.replace(/\D/g, "");
            if (digits.length === 13) {
              onDetected(digits);
            }
          },
          () => {
            // 인식 실패는 매 프레임마다 발생하므로 무시
          }
        )
        .catch(() => {
          setError("카메라를 시작할 수 없어요. 카메라 권한을 확인해주세요.");
        });
    });

    return () => {
      stopped = true;
      const scanner = scannerRef.current as { stop: () => Promise<void>; clear: () => void } | null;
      if (scanner) {
        scanner.stop().then(() => scanner.clear()).catch(() => {});
      }
    };
  }, [onDetected]);

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[60] px-4">
      <div className="bg-white rounded-3xl p-5 w-full max-w-sm shadow-xl">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-black text-gray-800">📷 바코드 스캔</h3>
          <button onClick={onClose} className="text-gray-400 text-xl">×</button>
        </div>
        {error ? (
          <div className="text-center py-10 text-gray-400">
            <div className="text-4xl mb-2">😢</div>
            <p className="text-sm">{error}</p>
          </div>
        ) : (
          <>
            <div id={containerId} className="rounded-2xl overflow-hidden bg-black" />
            <p className="text-xs text-gray-400 mt-3 text-center">
              책 뒷면 바코드를 카메라에 비춰주세요
            </p>
          </>
        )}
      </div>
    </div>
  );
}
