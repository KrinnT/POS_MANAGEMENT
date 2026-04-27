import SmartOrderingClient from "./SmartOrderingClient";

export default async function SmartOrderingPage(props: { params: Promise<{ qrToken: string }> }) {
  const { qrToken } = await props.params;
  return <SmartOrderingClient qrToken={qrToken} />;
}
