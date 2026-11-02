import type { Metadata } from "next";
import { notFound } from "next/navigation";
import OrderSuccess from "@/components/OrderSuccess";

export const metadata: Metadata = {
  title: "Đặt hàng thành công",
};

export default async function OrderSuccessPage({
  params,
}: PageProps<"/orders/[id]/success">) {
  const { id } = await params;
  const orderId = Number(id);
  if (!/^[1-9]\d*$/.test(id) || !Number.isSafeInteger(orderId)) notFound();

  return <OrderSuccess orderId={orderId} />;
}
