import { useState } from "react";
import { Sliders, Zap } from "lucide-react";

function SliderWidget({ title = "Analog Value Slider", value = 50, unit = "%", min = 0, max = 100, onChange }) {
  const [currentValue, setCurrentValue] = useState(value !== undefined ? value : 50);

  const handleChange = (e) => {
    const newVal = Number(e.target.value);
    setCurrentValue(newVal);
    if (onChange) onChange(newVal);
  };

  return (
    <div className="slider-widget-container">
      <div className="widget-header-flex">
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <Sliders size={16} className="widget-icon-emerald" />
          <h4 className="widget-title-text">{title}</h4>
        </div>
        <span className="slider-val-badge">
          {currentValue} {unit}
        </span>
      </div>

      <div className="slider-body">
        <div className="slider-range-labels">
          <span>{min} {unit}</span>
          <span>{max} {unit}</span>
        </div>
        <input
          type="range"
          min={min}
          max={max}
          value={currentValue}
          onChange={handleChange}
          className="blynk-range-input"
        />
        <div className="slider-footer-hint">
          <Zap size={12} style={{ color: "#22C55E" }} />
          <span>Mengirim Perintah PWM / Setpoint ke Node</span>
        </div>
      </div>
    </div>
  );
}

export default SliderWidget;
