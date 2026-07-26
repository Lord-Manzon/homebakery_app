import { useMemo, useState } from 'react';
import { Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';
import { useTheme } from '../../contexts/ThemeContext';

type Props = {
  visible: boolean;
  initialLat: number;
  initialLng: number;
  onConfirm: (lat: number, lng: number) => void;
  onClose: () => void;
};

export default function AddressPinModal({
  visible,
  initialLat,
  initialLng,
  onConfirm,
  onClose,
}: Props) {
  const Colors = useTheme();
  const insets = useSafeAreaInsets();
  const styles = useMemo(() => getStyles(Colors), [Colors]);
  const [pin, setPin] = useState({ lat: initialLat, lng: initialLng });

  const html = useMemo(
    () => `
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
    var map = L.map('map').setView([${initialLat}, ${initialLng}], 16);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors',
      maxZoom: 19
    }).addTo(map);
    var marker = L.marker([${initialLat}, ${initialLng}], { draggable: true }).addTo(map);
    function send(lat, lng) {
      window.ReactNativeWebView.postMessage(JSON.stringify({ lat: lat, lng: lng }));
    }
    marker.on('dragend', function (e) {
      var pos = e.target.getLatLng();
      send(pos.lat, pos.lng);
    });
    map.on('click', function (e) {
      marker.setLatLng(e.latlng);
      send(e.latlng.lat, e.latlng.lng);
    });
  </script>
</body>
</html>`,
    [initialLat, initialLng]
  );

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={styles.container}>
        <View style={[styles.header, { paddingTop: insets.top + 14 }]}>
          <TouchableOpacity onPress={onClose}>
            <Text style={styles.cancelText}>Cancel</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Adjust pin</Text>
          <TouchableOpacity onPress={() => onConfirm(pin.lat, pin.lng)}>
            <Text style={styles.confirmText}>Confirm</Text>
          </TouchableOpacity>
        </View>
        <Text style={styles.hint}>Tap or drag the pin to the exact location</Text>
        <WebView
          source={{ html }}
          style={{ flex: 1 }}
          onMessage={(event) => {
            try {
              const data = JSON.parse(event.nativeEvent.data);
              setPin({ lat: data.lat, lng: data.lng });
            } catch (err) {
              console.error('Pin message parse error:', err);
            }
          }}
        />
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
    cancelText: { fontSize: 14, color: Colors.textMuted },
    confirmText: { fontSize: 14, color: Colors.primary, fontWeight: '700' },
    hint: {
      fontSize: 12,
      color: Colors.textSecondary,
      textAlign: 'center',
      paddingVertical: 8,
      backgroundColor: Colors.card,
    },
  });