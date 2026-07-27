import os
import numpy as np
import onnx
from onnx import helper, TensorProto, numpy_helper

def build_time_series_model():
    # Input info: shape [1, 'sequence_length'] - dynamic sequence length
    input_tensor = helper.make_tensor_value_info(
        "input", 
        TensorProto.FLOAT, 
        [1, "sequence_length"]
    )
    
    # Output info: shape [1, 'sequence_length'] - same dynamic shape
    output_tensor = helper.make_tensor_value_info(
        "output", 
        TensorProto.FLOAT, 
        [1, "sequence_length"]
    )
    
    # Initializers for Mul and Add
    scale_val = np.array([1.5], dtype=np.float32)
    scale = numpy_helper.from_array(scale_val, name="scale")
    
    bias_val = np.array([2.0], dtype=np.float32)
    bias = numpy_helper.from_array(bias_val, name="bias")
    
    # Graph nodes
    nodes = [
        helper.make_node("Mul", ["input", "scale"], ["mul_out"]),
        helper.make_node("Add", ["mul_out", "bias"], ["output"])
    ]
    
    # Make graph
    graph = helper.make_graph(
        nodes,
        "time_series_multiplier",
        [input_tensor],
        [output_tensor],
        initializer=[scale, bias]
    )
    
    # Create model
    model = helper.make_model(
        graph, 
        producer_name="time-series-generator",
        opset_imports=[helper.make_opsetid("", 17)]
    )
    model.ir_version = 8
    
    # Verify model structure
    onnx.checker.check_model(model)
    return model

if __name__ == "__main__":
    model = build_time_series_model()
    output_path = "time_series_model.onnx"
    onnx.save(model, output_path)
    print(f"[OK] Model time series dengan input dinamis berhasil dibuat dan disimpan di: {os.path.abspath(output_path)}")
