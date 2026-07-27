import { useState } from "react";
import { Power, Check, Zap } from "lucide-react";
import confetti from "canvas-confetti";

function BooleanWidget({ title, value, onToggle }) {
  const [isOn, setIsOn] = useState(Boolean(value));
  const [tasks, setTasks] = useState([
    { id: 1, text: "AI Leaf Inspection (Passed 98%)", done: true },
    { id: 2, text: "Soil Moisture Rule (Normal)", done: true },
    { id: 3, text: "Telegram Dispatcher Active", done: false },
    { id: 4, text: "Weekly Sensor Calibration", done: false },
  ]);

  const handleToggleActuator = () => {
    const newState = !isOn;
    setIsOn(newState);

    if (newState) {
      // Trigger confetti celebration!
      confetti({
        particleCount: 40,
        spread: 60,
        origin: { y: 0.8 },
        colors: ["#10B981", "#A7F3D0", "#34D399"]
      });
    }

    if (onToggle) onToggle(newState);
  };

  const toggleTask = (id) => {
    setTasks((prev) =>
      prev.map((t) => (t.id === id ? { ...t, done: !t.done } : t))
    );
  };

  const completedCount = tasks.filter((t) => t.done).length;

  return (
    <div className="widget-bento-card dark-theme">
      <div className="card-header-bento">
        <h3>
          <span className="card-header-icon">
            <Zap size={16} />
          </span>
          {title || "Actuator & Automation"}
        </h3>
        <span style={{ fontSize: 11, fontWeight: 700, background: "rgba(255,255,255,0.15)", color: "#A7F3D0", padding: "3px 8px", borderRadius: 999 }}>
          Modul A Engine
        </span>
      </div>

      <div className="dark-task-card-content">
        <div className="dark-task-header-progress">
          <div>
            <span style={{ fontSize: 12, color: "var(--dark-text-muted)", fontWeight: 600 }}>Automation Tasks</span>
            <div className="dark-task-progress-num">{completedCount}/{tasks.length} Completed</div>
          </div>
          <span style={{ fontSize: 20 }}>🌿</span>
        </div>

        <div className="task-list-group">
          {tasks.map((task) => (
            <div
              key={task.id}
              className={`task-item-row ${task.done ? "completed" : ""}`}
              onClick={() => toggleTask(task.id)}
            >
              <div className={`task-check-icon ${task.done ? "checked" : ""}`}>
                {task.done && <Check size={12} />}
              </div>
              <span>{task.text}</span>
            </div>
          ))}
        </div>

        <button
          type="button"
          className={`actuator-btn-confetti ${isOn ? "is-active" : ""}`}
          onClick={handleToggleActuator}
        >
          <Power size={16} />
          <span>{isOn ? "ACTUATOR RUNNING (PUMP ON)" : "TURN ON WATER PUMP"}</span>
        </button>
      </div>
    </div>
  );
}

export default BooleanWidget;