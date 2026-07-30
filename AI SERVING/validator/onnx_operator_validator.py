#!/usr/bin/env python3
"""
onnx_operator_validator.py
============================
Modul: AI Inference Sandbox — IoT Platform (Non-Skripsi)
Mahasiswa D

Fungsi: memvalidasi file model ONNX yang diupload user SEBELUM model
diizinkan masuk ke sandbox (gVisor/nsjail). Validasi ini adalah lapisan
pertahanan pertama (defense in depth) sebelum isolasi runtime.

Kebijakan: DEFAULT DENY.
Model HANYA lolos kalau SEMUA operator yang dipakai ada di whitelist.
Operator apa pun yang tidak dikenal / tidak ada di whitelist -> ditolak.
Ini sengaja dibuat allow-list, bukan block-list, supaya operator baru
yang belum dievaluasi timnya otomatis DITOLAK, bukan otomatis DITERIMA.

Cara pakai:
    python onnx_operator_validator.py path/to/model.onnx
    python onnx_operator_validator.py path/to/model.onnx --max-size-mb 50 --tier free

Exit code:
    0 = model valid, boleh lanjut ke tahap deploy sandbox
    1 = model DITOLAK (operator tidak diizinkan / gagal parsing / dll)
"""

import argparse
import sys
import os

try:
    import onnx
    from onnx import checker, shape_inference
except ImportError:
    print("[FATAL] Library 'onnx' belum terinstall. Jalankan: pip install onnx --break-system-packages")
    sys.exit(1)


# ---------------------------------------------------------------------------
# WHITELIST OPERATOR ONNX
# ---------------------------------------------------------------------------
# Dasar pemilihan: cukup untuk kasus penggunaan umum platform ini
# (klasifikasi/regresi dari data sensor & citra sederhana: CNN kecil,
# MLP, model tabular). Semua operator di bawah ini adalah computational
# ops murni: input tensor -> output tensor, tanpa akses filesystem,
# network, environment variable, subprocess, atau branching yang bisa
# menyebabkan resource-exhaustion (infinite loop).
#
# Kategori operator yang SENGAJA TIDAK dimasukkan (alasan di dokumen
# spesifikasi terpisah "Whitelist Operator ONNX.docx"):
#   - Control flow: Loop, If, Scan -> bisa dibuat infinite/berat tanpa
#     batas jelas dari sisi graph statis, sulit di-bound waktunya.
#   - Custom op / function op (domain selain "" dan "ai.onnx") -> jalur
#     eksekusi kode arbitrer di luar kontrol whitelist.
#   - Sequence/Map ops (SequenceInsert, SplitToSequence, dll) -> tidak
#     dibutuhkan use case saat ini, permukaan serangan tidak perlu dibuka.
#   - RNN/LSTM/GRU -> dikeluarkan dulu di MVP ini karena kompleksitas
#     numerik yang tinggi untuk resource-bound sandbox; bisa dievaluasi
#     ulang fase 2 kalau ada use case time-series yang butuh ini.
OPERATOR_WHITELIST = {
    # --- Struktur graph & identitas ---
    "Identity", "Constant", "ConstantOfShape",

    # --- Manipulasi bentuk tensor (murni reshape/index, tanpa I/O) ---
    "Reshape", "Flatten", "Transpose", "Squeeze", "Unsqueeze",
    "Concat", "Split", "Slice", "Gather", "GatherElements",
    "Pad", "Expand", "Tile", "Shape", "Size",

    # --- Operasi matematis elementwise & aljabar linear ---
    "Add", "Sub", "Mul", "Div", "MatMul", "Gemm", "Pow", "Sqrt",
    "Exp", "Log", "Abs", "Neg", "Reciprocal", "Sum", "Mean",
    "Min", "Max", "Clip", "Where", "Equal", "Greater", "Less",
    "And", "Or", "Not",

    # --- Reduksi (agregasi) ---
    "ReduceMean", "ReduceSum", "ReduceMax", "ReduceMin", "ReduceProd",
    "ArgMax", "ArgMin",

    # --- Convolution & pooling (tulang punggung CNN klasifikasi citra) ---
    "Conv", "MaxPool", "AveragePool", "GlobalAveragePool",
    "GlobalMaxPool", "BatchNormalization", "LRN",

    # --- Fungsi aktivasi ---
    "Relu", "LeakyRelu", "PRelu", "Sigmoid", "Tanh", "Softmax",
    "Elu", "Selu", "HardSigmoid", "Softplus", "Softsign",

    # --- Regularisasi (no-op saat inference, tapi node bisa tetap ada) ---
    "Dropout",

    # --- Tipe data ---
    "Cast", "CastLike",
    "LinearClassifier", "Normalizer", "ZipMap",
}

# Domain operator yang diizinkan. "" = domain default ONNX (ai.onnx).
# Domain lain (mis. custom domain vendor, domain eksekusi Python custom)
# DITOLAK karena itu jalur untuk custom-op di luar kendali whitelist.
ALLOWED_DOMAINS = {"", "ai.onnx", "ai.onnx.ml"}


class ValidationResult:
    def __init__(self):
        self.ok = True
        self.errors = []
        self.warnings = []
        self.operators_used = set()
        self.blocked_operators = set()

    def fail(self, msg):
        self.ok = False
        self.errors.append(msg)

    def warn(self, msg):
        self.warnings.append(msg)


def validate_model(path: str, max_size_mb: float = 50.0) -> ValidationResult:
    result = ValidationResult()

    # 1. Cek ukuran file dulu SEBELUM di-parse, supaya file raksasa
    #    tidak membebani proses parsing/orchestrator (mitigasi DoS
    #    paling murah: tolak sebelum kerja berat dimulai).
    if not os.path.isfile(path):
        result.fail(f"File tidak ditemukan: {path}")
        return result

    size_mb = os.path.getsize(path) / (1024 * 1024)
    if size_mb > max_size_mb:
        result.fail(f"Ukuran model {size_mb:.2f} MB melebihi batas {max_size_mb} MB untuk tier ini.")
        return result

    # 2. Parse sebagai protobuf ONNX. Kalau file bukan ONNX yang valid
    #    (mis. file pickle yang di-rename jadi .onnx), parsing akan
    #    gagal di sini -> ditolak sebelum sempat coba dieksekusi.
    try:
        model = onnx.load(path)
    except Exception as e:
        result.fail(f"Gagal parsing sebagai model ONNX: {e}")
        return result

    # 3. Jalankan ONNX checker resmi -> validasi struktural graph
    #    (node terhubung dengan benar, tipe konsisten, dsb).
    try:
        checker.check_model(model, full_check=True)
    except Exception as e:
        result.fail(f"Model tidak lolos ONNX checker (struktur graph tidak valid): {e}")
        return result

    # 4. Cek domain semua opset import. Domain custom = ditolak.
    for opset in model.opset_import:
        if opset.domain not in ALLOWED_DOMAINS:
            result.fail(f"Domain operator tidak diizinkan: '{opset.domain}' (kemungkinan custom-op).")

    # 5. Kumpulkan semua operator yang dipakai di seluruh graph
    #    (termasuk sub-graph kalau ada, misalnya di dalam If/Loop —
    #    walau If/Loop sendiri sudah pasti akan diblokir di bawah).
    def walk_graph(graph):
        for node in graph.node:
            result.operators_used.add(node.op_type)
            if node.op_type not in OPERATOR_WHITELIST:
                result.blocked_operators.add(node.op_type)
            # Rekursif ke sub-graph (attribute bertipe GRAPH), penting
            # supaya operator terlarang yang "disembunyikan" di dalam
            # body Loop/If tetap terdeteksi.
            for attr in node.attribute:
                if attr.type == onnx.AttributeProto.GRAPH:
                    walk_graph(attr.g)
                elif attr.type == onnx.AttributeProto.GRAPHS:
                    for g in attr.graphs:
                        walk_graph(g)

    walk_graph(model.graph)

    if result.blocked_operators:
        result.fail(
            "Model memakai operator yang TIDAK ada di whitelist: "
            + ", ".join(sorted(result.blocked_operators))
        )

    # 6. Cek shape inference — kalau gagal, biasanya indikasi graph
    #    aneh/dibuat manual untuk mengakali checker dasar.
    try:
        shape_inference.infer_shapes(model, strict_mode=True)
    except Exception as e:
        result.warn(f"Shape inference gagal (tidak otomatis menolak, tapi perlu dicek manual): {e}")

    return result


def main():
    parser = argparse.ArgumentParser(description="Validasi model ONNX terhadap whitelist operator sandbox.")
    parser.add_argument("model_path", help="Path ke file .onnx yang mau divalidasi")
    parser.add_argument("--max-size-mb", type=float, default=50.0,
                         help="Batas ukuran file model dalam MB (default 50, sesuaikan per tier)")
    parser.add_argument("--tier", default="free", choices=["free", "paid"],
                         help="Tier user, mempengaruhi batas ukuran default")
    args = parser.parse_args()

    tier_limits = {"free": 50.0, "paid": 200.0}
    max_size = args.max_size_mb if args.max_size_mb != 50.0 else tier_limits[args.tier]

    print(f"[INFO] Memvalidasi: {args.model_path}")
    print(f"[INFO] Tier: {args.tier} | Batas ukuran: {max_size} MB")
    print("-" * 60)

    result = validate_model(args.model_path, max_size_mb=max_size)

    if result.operators_used:
        print(f"[INFO] Operator yang terdeteksi di model ({len(result.operators_used)}):")
        for op in sorted(result.operators_used):
            mark = "BLOCKED" if op in result.blocked_operators else "ok"
            print(f"    [{mark}] {op}")

    if result.warnings:
        print("\n[WARNING]")
        for w in result.warnings:
            print(f"    - {w}")

    print("-" * 60)
    if result.ok:
        print("[HASIL] MODEL DITERIMA — lolos validasi, boleh dilanjutkan ke deploy sandbox.")
        sys.exit(0)
    else:
        print("[HASIL] MODEL DITOLAK")
        for e in result.errors:
            print(f"    - {e}")
        sys.exit(1)


if __name__ == "__main__":
    main()
