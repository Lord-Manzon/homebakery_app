import { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { WebView } from 'react-native-webview';
import { ActiveDeliveryLocation } from '../../services/dashboard';

type Props = {
  locations: ActiveDeliveryLocation[];
  originLat: number | null;
  originLng: number | null;
};

function escapeHtml(str: string): string {
  return str.replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] as string)
  );
}

export default function ActiveDeliveriesMap({ locations, originLat, originLng }: Props) {
  const centerLat = originLat ?? locations[0]?.delivery_lat ?? 14.5995;
  const centerLng = originLng ?? locations[0]?.delivery_lng ?? 120.9842;

  const html = useMemo(() => {
    const markersJs = locations
      .map(
        (loc) => `
      L.marker([${loc.delivery_lat}, ${loc.delivery_lng}])
        .addTo(map)
        .bindPopup(${JSON.stringify(
          `<b>${escapeHtml(loc.customer_name)}</b><br>${escapeHtml(loc.delivery_address ?? '')}`
        )});`
      )
      .join('\n');

    const originMarkerJs =
      originLat != null && originLng != null
        ? `
      L.circleMarker([${originLat}, ${originLng}], {
        radius: 8, color: '#2563eb', fillColor: '#2563eb', fillOpacity: 1, weight: 2
      }).addTo(map).bindPopup('Bakery');`
        : '';

    return `
<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
  <style>html,body,#map{height:100%;margin:0;padding:0;}</style>
</head>
<body>
  <div id="map"></div>
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <script>
    var map = L.map('map', { zoomControl: false }).setView([${centerLat}, ${centerLng}], 13);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors',
      maxZoom: 19
    }).addTo(map);
    ${originMarkerJs}
    ${markersJs}
  </script>
</body>
</html>`;
  }, [locations, originLat, originLng, centerLat, centerLng]);

  return (
    <View style={styles.wrapper}>
      <WebView source={{ html }} style={styles.webview} scrollEnabled={false} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { height: 220, borderRadius: 16, overflow: 'hidden' },
  webview: { flex: 1 },
});