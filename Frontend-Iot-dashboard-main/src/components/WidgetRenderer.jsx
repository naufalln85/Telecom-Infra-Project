import StatusWidget from "./widgets/StatusWidget";
import ChartWidget from "./widgets/ChartWidget";
import GaugeWidget from "./widgets/GaugeWidget";
import BooleanWidget from "./widgets/BooleanWidget";
import MapWidget from "./widgets/MapWidget";
import ImageWidget from "./widgets/ImageWidget";
import CalendarLogWidget from "./widgets/CalendarLogWidget";
import TableWidget from "./widgets/TableWidget";
import SliderWidget from "./widgets/SliderWidget";

function WidgetRenderer({ widget, sensorData, history, onToggle }) {
  switch (widget.type) {
    case "status":
      return (
        <StatusWidget
          title={widget.title}
          value={sensorData[widget.channel]}
          unit={widget.unit}
        />
      );

    case "boolean":
      return (
        <BooleanWidget
          title={widget.title}
          value={sensorData[widget.channel]}
          onToggle={onToggle}
        />
      );

    case "chart":
      return (
        <ChartWidget
          title={widget.title}
          data={history}
          dataKey={widget.channel}
          unit={widget.unit}
        />
      );

    case "gauge":
      return (
        <GaugeWidget
          title={widget.title}
          value={sensorData[widget.channel]}
          unit={widget.unit}
        />
      );

    case "map":
      return (
        <MapWidget
          title={widget.title}
          latitude={sensorData[widget.config?.latChannel]}
          longitude={sensorData[widget.config?.lngChannel]}
        />
      );

    case "image":
      return (
        <ImageWidget
          title={widget.title}
          image={sensorData[widget.config?.imageChannel]}
          label={sensorData[widget.config?.labelChannel]}
          confidence={sensorData[widget.config?.confidenceChannel]}
        />
      );

    case "calendar":
      return <CalendarLogWidget title={widget.title} />;

    case "table":
      return (
        <TableWidget
          title={widget.title}
          history={history}
          deviceId={widget.deviceId}
        />
      );

    case "slider":
      return (
        <SliderWidget
          title={widget.title}
          value={sensorData[widget.channel]}
          unit={widget.unit || "%"}
          onChange={(val) => onToggle && onToggle(widget.channel, val)}
        />
      );

    default:
      console.warn("Unknown widget type:", widget.type);
      return null;
  }
}

export default WidgetRenderer;