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
      String(customer.purchaseAmount),
      customer.couponNumbers.join(", "),
      customer.drawDate,
    ],
    fallbackBody: `Hello ${customer.customerName},\n\nThank you for your purchase of Rs. ${customer.purchaseAmount}.\nYour entry number for the draw is ${customer.couponNumbers.join(", ")}.\nThe draw will be held on ${customer.drawDate}.\nWe will notify you with the results.\n\nThank you for choosing us.`,
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
      winner.prizeLabel || "the announced prize",
    ],
    fallbackBody: `Hello ${winner.customerName},\n\nYour entry ${winner.couponNumber} has been selected in the draw held on ${winner.drawDate}.\nYou are eligible to receive ${winner.prizeLabel || "the announced prize"}.\nOur team will contact you with further details.\nThank you for participating.`,
  });
}

export async function sendDrawAnnouncementWhatsAppMessage(customer, winner) {
  return postWhatsAppMessage({
    type: "announcement",
    to: `+91${customer.phoneNumber}`,
    templateParameters: [
      customer.customerName,
      winner.drawDate,
      winner.couponNumber,
    ],
    fallbackBody: `Hello ${customer.customerName},\n\nThe draw conducted on ${winner.drawDate} has concluded.\nThe winning entry number is ${winner.couponNumber}.\nThank you for participating, and we wish you better luck next time.\n\nWe appreciate your support.`,
  });
}
