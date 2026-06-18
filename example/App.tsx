import React, { useCallback, useEffect, useState } from 'react';
import {
  Button,
  Linking,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {
  Attribution,
  checkDeferredOnFirstLaunch,
  configure,
  getAttribution,
  handleLink,
} from 'next-affiliate-sdk';

// --- Dev config -------------------------------------------------------------
// Point this at your dev NEX deployment. Tracking links are served from a
// per-merchant subdomain: https://<slug>.<BASE_DOMAIN>/trk/<shortCode>.
const BASE_DOMAIN = 'next-ads-server-dev.com';
const APP_SCHEME = 'myapp';

// Placeholder S2S conversion endpoint for the "Send test conversion" demo.
const CONVERSION_URL = 'https://example.com/conversion';

configure({ baseDomain: BASE_DOMAIN, scheme: APP_SCHEME });

export default function App(): React.JSX.Element {
  const [attribution, setAttribution] = useState<Attribution | null>(null);
  const [log, setLog] = useState<string>('Ready.');

  const refresh = useCallback(async () => {
    setAttribution(await getAttribution());
  }, []);

  // Wire real deep-link handling: cold start + warm (already-running) links.
  useEffect(() => {
    let mounted = true;

    (async () => {
      const initialUrl = await Linking.getInitialURL();
      if (initialUrl) {
        await handleLink(initialUrl);
      }
      if (mounted) {
        await refresh();
      }
    })();

    const sub = Linking.addEventListener('url', async ({ url }) => {
      await handleLink(url);
      await refresh();
    });

    return () => {
      mounted = false;
      sub.remove();
    };
  }, [refresh]);

  const onCheckDeferred = useCallback(async () => {
    const result = await checkDeferredOnFirstLaunch();
    setLog(`checkDeferredOnFirstLaunch → ${result ? JSON.stringify(result) : 'null'}`);
    await refresh();
  }, [refresh]);

  const onSimulateScheme = useCallback(async () => {
    await handleLink(`${APP_SCHEME}://open?nx_pb=DEMO_TOKEN&nx_click_id=demo-click`);
    setLog('Simulated scheme link.');
    await refresh();
  }, [refresh]);

  const onSendConversion = useCallback(async () => {
    const current = await getAttribution();
    const nxPb = current?.nxPb;
    if (!nxPb) {
      setLog('No nx_pb stored — nothing to forward.');
      return;
    }
    try {
      await fetch(CONVERSION_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nx_pb: nxPb }),
      });
      setLog(`Posted test conversion with nx_pb=${nxPb}`);
    } catch (e) {
      setLog(`Conversion POST failed (placeholder URL): ${String(e)}`);
    }
  }, []);

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>NEX Attribution SDK</Text>

        <View style={styles.card}>
          <Row label="nxPb" value={attribution?.nxPb ?? '—'} />
          <Row label="clickId" value={attribution?.clickId ?? '—'} />
          <Row label="source" value={attribution?.source ?? '—'} />
          <Row label="isAttributed" value={String(attribution?.isAttributed ?? false)} />
        </View>

        <View style={styles.buttons}>
          <Button title="Check deferred" onPress={onCheckDeferred} />
          <Button title="Simulate scheme link" onPress={onSimulateScheme} />
          <Button title="Send test conversion" onPress={onSendConversion} />
        </View>

        <Text style={styles.log}>{log}</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

function Row({ label, value }: { label: string; value: string }): React.JSX.Element {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#fff' },
  container: { padding: 20, gap: 20 },
  title: { fontSize: 22, fontWeight: '700' },
  card: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    gap: 8,
  },
  row: { flexDirection: 'row', justifyContent: 'space-between' },
  rowLabel: { fontWeight: '600', color: '#444' },
  rowValue: { flexShrink: 1, marginLeft: 12, textAlign: 'right', color: '#111' },
  buttons: { gap: 12 },
  log: { color: '#666', fontFamily: 'Courier' },
});
