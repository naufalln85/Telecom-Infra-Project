#!/usr/bin/env python3
"""
generate_test_models.py
=========================
Modul: AI Inference Sandbox — IoT Platform (Non-Skripsi)
Mahasiswa D

Membuat 2 model ONNX untuk menguji onnx_operator_validator.py:

1. model_clean.onnx
   CNN klasifikasi sederhana (mirip use case sensor/citra platform ini):
   Conv -> Relu -> MaxPool -> Flatten -> Gemm -> Softmax
   Semua operator ada di whitelist -> HARUS lolos validasi.

2. model_blocked_loop.onnx
   Model kecil yang sengaja menyisipkan node "Loop" (control flow ONNX).
   Operator ini TIDAK ada di whitelist -> HARUS ditolak validasi.
   Ini mensimulasikan model jahat/berisiko yang bisa dipakai untuk
   membuat komputasi tak terbatas di dalam graph.

Output ditulis ke folder ./test_models/
"""

import os
import numpy as np
import onnx
from onnx import helper, TensorProto, numpy_helper

OUT_DIR = os.path.join(os.path.dirname(__file__), "test_models")
os.makedirs(OUT_DIR, exist_ok=True)


def build_clean_model():
    """CNN kecil: input citra 1x1x28x28 -> 10 kelas (mirip MNIST-style)."""
    input_tensor = helper.make_tensor_value_info("input", TensorProto.FLOAT, [1, 1, 28, 28])
    output_tensor = helper.make_tensor_value_info("output", TensorProto.FLOAT, [1, 10])

    rng = np.random.default_rng(42)
    conv_w = numpy_helper.from_array(
        rng.standard_normal((4, 1, 3, 3)).astype(np.float32), name="conv_w"
    )
    conv_b = numpy_helper.from_array(np.zeros(4, dtype=np.float32), name="conv_b")
    gemm_w = numpy_helper.from_array(
        rng.standard_normal((10, 4 * 13 * 13)).astype(np.float32) * 0.01, name="gemm_w"
    )
    gemm_b = numpy_helper.from_array(np.zeros(10, dtype=np.float32), name="gemm_b")

    nodes = [
        helper.make_node("Conv", ["input", "conv_w", "conv_b"], ["conv_out"],
                          kernel_shape=[3, 3], strides=[1, 1]),
        helper.make_node("Relu", ["conv_out"], ["relu_out"]),
        helper.make_node("MaxPool", ["relu_out"], ["pool_out"],
                          kernel_shape=[2, 2], strides=[2, 2]),
        helper.make_node("Flatten", ["pool_out"], ["flat_out"], axis=1),
        helper.make_node("Gemm", ["flat_out", "gemm_w", "gemm_b"], ["gemm_out"],
                          transB=1),
        helper.make_node("Softmax", ["gemm_out"], ["output"], axis=1),
    ]

    graph = helper.make_graph(
        nodes, "clean_cnn_classifier",
        [input_tensor], [output_tensor],
        initializer=[conv_w, conv_b, gemm_w, gemm_b],
    )
    model = helper.make_model(graph, producer_name="mahasiswa-d-sandbox-test",
                               opset_imports=[helper.make_opsetid("", 17)])
    model.ir_version = 8
    onnx.checker.check_model(model)
    return model


def build_blocked_loop_model():
    """
    Model kecil yang membungkus node Loop -- operator ini TIDAK di whitelist.
    Loop body-nya sengaja simpel (akumulasi penjumlahan) hanya untuk contoh;
    yang penting operator "Loop" muncul di graph supaya validator mendeteksinya.
    """
    input_tensor = helper.make_tensor_value_info("input", TensorProto.FLOAT, [1, 4])
    output_tensor = helper.make_tensor_value_info("output", TensorProto.FLOAT, [1, 4])

    # --- Body sub-graph untuk Loop ---
    iter_num = helper.make_tensor_value_info("iter_num", TensorProto.INT64, [])
    cond_in = helper.make_tensor_value_info("cond_in", TensorProto.BOOL, [])
    acc_in = helper.make_tensor_value_info("acc_in", TensorProto.FLOAT, [1, 4])

    cond_out = helper.make_tensor_value_info("cond_out", TensorProto.BOOL, [])
    acc_out = helper.make_tensor_value_info("acc_out", TensorProto.FLOAT, [1, 4])

    body_add = helper.make_node("Add", ["acc_in", "acc_in"], ["acc_out"])
    body_identity_cond = helper.make_node("Identity", ["cond_in"], ["cond_out"])

    body_graph = helper.make_graph(
        [body_add, body_identity_cond],
        "loop_body",
        [iter_num, cond_in, acc_in],
        [cond_out, acc_out],
    )

    trip_count = numpy_helper.from_array(np.array(5, dtype=np.int64), name="trip_count")
    init_cond = numpy_helper.from_array(np.array(True, dtype=bool), name="init_cond")

    loop_node = helper.make_node(
        "Loop",
        ["trip_count", "init_cond", "input"],
        ["output"],
        body=body_graph,
    )

    graph = helper.make_graph(
        [loop_node], "blocked_model_with_loop",
        [input_tensor], [output_tensor],
        initializer=[trip_count, init_cond],
    )
    model = helper.make_model(graph, producer_name="mahasiswa-d-sandbox-test",
                               opset_imports=[helper.make_opsetid("", 17)])
    model.ir_version = 8
    onnx.checker.check_model(model)
    return model


if __name__ == "__main__":
    clean = build_clean_model()
    clean_path = os.path.join(OUT_DIR, "model_clean.onnx")
    onnx.save(clean, clean_path)
    print(f"[OK] Model bersih ditulis ke: {clean_path}")

    blocked = build_blocked_loop_model()
    blocked_path = os.path.join(OUT_DIR, "model_blocked_loop.onnx")
    onnx.save(blocked, blocked_path)
    print(f"[OK] Model dengan operator terlarang (Loop) ditulis ke: {blocked_path}")

    print("\nUji dengan:")
    print(f"  python onnx_operator_validator.py {clean_path}")
    print(f"  python onnx_operator_validator.py {blocked_path}")
