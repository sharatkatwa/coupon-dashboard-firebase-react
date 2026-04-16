const postWhatsAppMessage = async (payload) => {
  const response = await fetch("/api/send-whatsapp", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  const responseText = await response.text();
  let data = {};

  if (responseText) {
    try {
      data = JSON.parse(responseText);
    } catch {
      data = { error: responseText };
    }
  }

  if (!response.ok) {
    throw new Error(
      data.error ||
        `Unable to send WhatsApp message. Server responded with ${response.status}.`
    );
  }

  return data;
};

export async function sendCustomerWhatsAppMessage(customer) {
  return postWhatsAppMessage({
    type: "customer",
    to: `+91${customer.phoneNumber}`,
    templateParameters: [
      customer.customerName,
      String(customer.couponCount),
      customer.couponNumbers.join(", "),
      customer.drawDate,
    ],
    fallbackBody: `Hello ${customer.customerName},\n\nThank you for shopping with Pry's.\nYou have received ${customer.couponCount} lucky draw coupon${customer.couponCount > 1 ? "s" : ""}.\nCoupon Code${customer.couponCount > 1 ? "s" : ""}: ${customer.couponNumbers.join(", ")}\nDraw Date: ${customer.drawDate}\n\nPlease keep this coupon safe for the announcement.`,
  });
}

export async function sendWinnerWhatsAppMessage(winner) {
  return postWhatsAppMessage({
    type: "winner",
    to: `+91${winner.phoneNumber}`,
    templateParameters: [
      winner.customerName,
      winner.couponNumber,
      winner.drawDate,
    ],
    fallbackBody: `Congratulations ${winner.customerName}!\n\nYou are the lucky draw winner for Pry's.\nWinning Coupon: ${winner.couponNumber}\nDraw Date: ${winner.drawDate}\n\nOur team will contact you with the prize details.`,
  });
}
