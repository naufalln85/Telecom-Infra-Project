"""
Melatih model klasifikasi ASLI (bukan bobot random) memakai dataset Iris
(built-in scikit-learn), lalu convert ke ONNX.
"""
from sklearn.datasets import load_iris
from sklearn.linear_model import LogisticRegression
from sklearn.model_selection import train_test_split
from skl2onnx import convert_sklearn
from skl2onnx.common.data_types import FloatTensorType

X, y = load_iris(return_X_y=True)
X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

model = LogisticRegression(max_iter=200)
model.fit(X_train, y_train)

accuracy = model.score(X_test, y_test)
print(f"Akurasi model pada data uji: {accuracy:.2%}")

onnx_model = convert_sklearn(
    model,
    initial_types=[("input", FloatTensorType([None, 4]))],
    target_opset=17,
)
onnx_model.ir_version = 8

with open("uploads/model_iris_real.onnx", "wb") as f:
    f.write(onnx_model.SerializeToString())

print("Model ONNX asli tersimpan di uploads/model_iris_real.onnx")

sample = X_test[0]
print(f"\nContoh input uji (data asli): {sample.tolist()}")
print(f"Label sebenarnya: {y_test[0]} (0=setosa, 1=versicolor, 2=virginica)")
