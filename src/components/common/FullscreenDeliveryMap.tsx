import { X } from 'lucide-react-native';
import { useMemo } from 'react';
import { Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';
import { useTheme } from '../../contexts/ThemeContext';
import { ActiveDeliveryLocation } from '../../services/dashboard';

type Props = {
  visible: boolean;
  locations: ActiveDeliveryLocation[];
  originLat: number | null;
  originLng: number | null;
  focusLocationId: string | null;
  onClose: () => void;
};

function escapeHtml(str: string): string {
  return str.replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] as string)
  );
}

export default function FullscreenDeliveryMap({
  visible,
  locations,
  originLat,
  originLng,
  focusLocationId,
  onClose,
}: Props) {
  const Colors = useTheme();
  const insets = useSafeAreaInsets();
  const styles = useMemo(() => getStyles(Colors), [Colors]);

  const focusLocation = locations.find((l) => l.id === focusLocationId) ?? null;
  const centerLat = focusLocation?.delivery_lat ?? originLat ?? locations[0]?.delivery_lat ?? 14.5995;
  const centerLng = focusLocation?.delivery_lng ?? originLng ?? locations[0]?.delivery_lng ?? 120.9842;
  const zoom = focusLocation ? 16 : 13;

  const html = useMemo(() => {
    const markersJs = locations
      .map(
        (loc) => `
      L.marker([${loc.delivery_lat}, ${loc.delivery_lng}])
        .addTo(map)
        .bindPopup(${JSON.stringify(
          `<b>${escapeHtml(loc.customer_name)}</b><br>${escapeHtml(loc.delivery_address ?? '')}`
        )})${loc.id === focusLocationId ? '.openPopup()' : ''};`
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
    var map = L.map('map').setView([${centerLat}, ${centerLng}], ${zoom});
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors',
      maxZoom: 19
    }).addTo(map);
    ${originMarkerJs}
    ${markersJs}
  </script>
</body>
</html>`;
  }, [locations, originLat, originLng, centerLat, centerLng, zoom, focusLocationId]);

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={styles.container}>
        <View style={[styles.header, { paddingTop: insets.top + 14 }]}>
          <Text style={styles.title}>
            {focusLocation ? focusLocation.customer_name : 'Active Deliveries'}
          </Text>
          <TouchableOpacity onPress={onClose}>
            <X size={22} color={Colors.textPrimary} />
          </TouchableOpacity>
        </View>
        <WebView source={{ html }} style={{ flex: 1 }} />
      </View>
    </Modal>
  );
}

const getStyles = (Colors: Record<string, string>) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: Colors.background },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      paddingVertical: 14,
      borderBottomWidth: 1,
      borderBottomColor: Colors.border,
    },
    title: { fontSize: 16, fontWeight: '700', color: Colors.textPrimary },
  });