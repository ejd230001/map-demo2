import React, { useMemo, useRef, useState } from "react";
import "leaflet/dist/leaflet.css";
import "leaflet-draw/dist/leaflet.draw.css";
import {
    MapContainer,
    TileLayer,
    ImageOverlay,
    FeatureGroup,
    useMap,
} from "react-leaflet";
import { LayersControl } from "react-leaflet";

import { EditControl } from "react-leaflet-draw";

const OVERLAY_IMAGE_URL = "/harvey-before-37.png";

const INITIAL_BOUNDS = [
    [29.8830856914, -95.6338352173], [29.8861926377, -95.6289374866], // NE
];

function fmt(n) {
    return Number(n).toFixed(10);
}

function MapJump({ jumpLat, jumpLng, jumpTrigger }) {
    const map = useMap();

    React.useEffect(() => {
        if (!jumpTrigger) return;

        const lat = Number(jumpLat);
        const lng = Number(jumpLng);

        if (Number.isNaN(lat) || Number.isNaN(lng)) return;

        map.setView([lat, lng], 17);
    }, [jumpTrigger, jumpLat, jumpLng, map]);

    return null;
}

export default function App() {
    const featureGroupRef = useRef(null);
    const rectLayerRef = useRef(null); // ✅ holds the Leaflet rectangle layer

    const [jumpTrigger, setJumpTrigger] = useState(0);
    const [jumpLat, setJumpLat] = useState("");
    const [jumpLng, setJumpLng] = useState("");
    const [bounds, setBounds] = useState(INITIAL_BOUNDS);
    const [opacity, setOpacity] = useState(0.65);
    const [step, setStep] = useState(0.00001);

    const center = useMemo(() => {
        const sw = bounds[0];
        const ne = bounds[1];
        return [(sw[0] + ne[0]) / 2, (sw[1] + ne[1]) / 2];
    }, [bounds]);

    const derived = useMemo(() => {
        const sw = bounds[0];
        const ne = bounds[1];
        return {
            lat_min: Math.min(sw[0], ne[0]),
            lat_max: Math.max(sw[0], ne[0]),
            lon_min: Math.min(sw[1], ne[1]),
            lon_max: Math.max(sw[1], ne[1]),
        };
    }, [bounds]);

    function updateBoundsFromLayer(layer) {
        const b = layer.getBounds();
        const sw = b.getSouthWest();
        const ne = b.getNorthEast();

        setBounds([
            [sw.lat, sw.lng],
            [ne.lat, ne.lng],
        ]);
    }

    function applyBounds(nextBounds) {
        // update overlay (React state)
        setBounds(nextBounds);

        // update the editable rectangle layer (Leaflet)
        if (rectLayerRef.current) {
            rectLayerRef.current.setBounds(nextBounds);
        }
    }

    // ✅ Move functions now update BOTH overlay + rectangle
    function move(dxLng, dyLat) {
        const next = [
            [bounds[0][0] + dyLat, bounds[0][1] + dxLng],
            [bounds[1][0] + dyLat, bounds[1][1] + dxLng],
        ];
        applyBounds(next);
    }

    function resize(delta) {
        const next = [
            [bounds[0][0] - delta, bounds[0][1] - delta],
            [bounds[1][0] + delta, bounds[1][1] + delta],
        ];
        applyBounds(next);
    }

    const onCreated = (e) => {
        const fg = featureGroupRef.current;
        if (!fg) return;

        fg.clearLayers();
        fg.addLayer(e.layer);

        // ✅ keep ref so our buttons can move it
        rectLayerRef.current = e.layer;

        updateBoundsFromLayer(e.layer);
    };

    const onEdited = (e) => {
        e.layers.eachLayer((layer) => {
            // ✅ keep ref in case it changes
            rectLayerRef.current = layer;
            updateBoundsFromLayer(layer);
        });
    };

    const onDeleted = () => {
        rectLayerRef.current = null;
        setBounds(INITIAL_BOUNDS);
    };

    return (
        <div
            style={{
                height: "100vh",
                display: "flex",
                flexDirection: "column",
            }}
        >
            {/* Controls */}
            <div style={{ padding: 12, borderBottom: "1px solid #ddd" }}>
                <div style={{ fontFamily: "monospace" }}>
                    <div>
                        <b>lon_min</b>={fmt(derived.lon_min)} | <b>lon_max</b>=
                        {fmt(derived.lon_max)}
                    </div>
                    <div>
                        <b>lat_min</b>={fmt(derived.lat_min)} | <b>lat_max</b>=
                        {fmt(derived.lat_max)}
                    </div>
                    <div>
                      <b>[{fmt(derived.lat_min)}, {fmt(derived.lon_min)}], [{fmt(derived.lat_max)}, {fmt(derived.lon_max)}]</b>
                    </div>
                </div>

                <div style={{ marginTop: 10 }}>
                    Opacity: {opacity.toFixed(2)}
                    <input
                        type="range"
                        min="0"
                        max="1"
                        step="0.01"
                        value={opacity}
                        onChange={(e) => setOpacity(Number(e.target.value))}
                        style={{ width: 220, marginLeft: 10 }}
                    />
                </div>

                <div style={{ marginTop: 10 }}>
                    Step:
                    <input
                        type="number"
                        value={step}
                        step="0.00001"
                        onChange={(e) => setStep(Number(e.target.value))}
                        style={{ marginLeft: 10, width: 140 }}
                    />
                </div>
                <div
                    style={{
                        marginTop: 10,
                        display: "flex",
                        gap: 8,
                        alignItems: "center",
                    }}
                >
                    <span>Jump to:</span>
                    <input
                        type="number"
                        placeholder="Latitude"
                        value={jumpLat}
                        step="0.000001"
                        onChange={(e) => setJumpLat(e.target.value)}
                        style={{ width: 140 }}
                    />
                    <input
                        type="number"
                        placeholder="Longitude"
                        value={jumpLng}
                        step="0.000001"
                        onChange={(e) => setJumpLng(e.target.value)}
                        style={{ width: 140 }}
                    />
                </div>
                <button
                    onClick={() => setJumpTrigger((v) => v + 1)}
                    style={{ marginTop: 8 }}
                >
                    Jump to coordinate
                </button>

                <div
                    style={{
                        marginTop: 12,
                        display: "flex",
                        gap: 8,
                        alignItems: "center",
                    }}
                >
                    <button onClick={() => move(0, step)}>⬆</button>
                    <button onClick={() => move(-step, 0)}>⬅</button>
                    <button onClick={() => move(step, 0)}>➡</button>
                    <button onClick={() => move(0, -step)}>⬇</button>

                    <span style={{ width: 16 }} />

                    <button onClick={() => resize(step)}>🔍➕</button>
                    <button onClick={() => resize(-step)}>🔍➖</button>

                    <span style={{ color: "#666", marginLeft: 10 }}>
                        (Tip: draw a rectangle once so the buttons know what to
                        move)
                    </span>
                </div>
            </div>

            {/* Map */}
            <div style={{ flex: 1 }}>
                <MapContainer
                    center={center}
                    zoom={15}
                    style={{ height: "100%", width: "100%" }}
                >
                    <LayersControl position="topright">
                        <LayersControl.BaseLayer checked name="Map">
                            <TileLayer
                                attribution="© OpenStreetMap contributors"
                                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                            />
                        </LayersControl.BaseLayer>

                        <LayersControl.BaseLayer name="Satellite">
                            <TileLayer
                                attribution="© Esri"
                                url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
                            />
                        </LayersControl.BaseLayer>
                    </LayersControl>
                    <MapJump
                        jumpLat={jumpLat}
                        jumpLng={jumpLng}
                        jumpTrigger={jumpTrigger}
                    />

                    <TileLayer
                        attribution="© OpenStreetMap contributors"
                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    />

                    <ImageOverlay
                        url={OVERLAY_IMAGE_URL}
                        bounds={bounds}
                        opacity={opacity}
                    />

                    <FeatureGroup ref={featureGroupRef}>
                        <EditControl
                            position="topleft"
                            onCreated={onCreated}
                            onEdited={onEdited}
                            onDeleted={onDeleted}
                            draw={{
                                polygon: false,
                                polyline: false,
                                circle: false,
                                circlemarker: false,
                                marker: false,
                                rectangle: {},
                            }}
                            edit={{
                                edit: {},
                                remove: {},
                            }}
                        />
                    </FeatureGroup>
                </MapContainer>
            </div>
        </div>
    );
}
