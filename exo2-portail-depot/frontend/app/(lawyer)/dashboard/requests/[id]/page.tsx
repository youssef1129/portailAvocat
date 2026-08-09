import RequestDetailClient from "../../../../../components/requests/RequestDetail.client";

export default async function RequestDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <RequestDetailClient id={id} />;
}
