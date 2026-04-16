/* global process */

const GRAPH_API_VERSION = "v23.0";

const getRequiredEnv = (key) => {
  const value = process.env[key];

  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }

  return value;
};

const normalizePhoneNumber = (value) => {
  const trimmedValue = String(value || "").trim();

  if (!trimmedValue) {
    return "";
  }

  return trimmedValue.startsWith("+") ? trimmedValue : `+${trimmedValue}`;
};

const getTemplateConfig = (type) => {
  if (type === "winner") {
    return {
      name: process.env.WHATSAPP_WINNER_TEMPLATE_NAME || "",
      languageCode:
        process.env.WHATSAPP_WINNER_TEMPLATE_LANGUAGE_CODE ||
        process.env.WHATSAPP_TEMPLATE_LANGUAGE_CODE ||
        "en_US",
    };
  }

  return {
    name: process.env.WHATSAPP_CUSTOMER_TEMPLATE_NAME || "",
    languageCode:
      process.env.WHATSAPP_CUSTOMER_TEMPLATE_LANGUAGE_CODE ||
      process.env.WHATSAPP_TEMPLATE_LANGUAGE_CODE ||
      "en_US",
  };
};

const mapTemplateParameters = (templateParameters = []) =>
  templateParameters.map((parameter) => ({
    type: "text",
    text: String(parameter ?? ""),
  }));

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const accessToken = getRequiredEnv("WHATSAPP_ACCESS_TOKEN");
    const phoneNumberId = getRequiredEnv("WHATSAPP_PHONE_NUMBER_ID");
    const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
    const {
      type = "customer",
      to,
      templateParameters = [],
      fallbackBody = "",
    } = body || {};

    const normalizedRecipient = normalizePhoneNumber(to);

    if (!normalizedRecipient) {
      return res.status(400).json({ error: "Recipient phone number is required." });
    }

    const templateConfig = getTemplateConfig(type);
    const requestBody = {
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to: normalizedRecipient,
    };

    if (templateConfig.name) {
      requestBody.type = "template";
      requestBody.template = {
        name: templateConfig.name,
        language: {
          code: templateConfig.languageCode,
        },
        components: [
          {
            type: "body",
            parameters: mapTemplateParameters(templateParameters),
          },
        ],
      };
    } else if (fallbackBody) {
      requestBody.type = "text";
      requestBody.text = {
        preview_url: false,
        body: fallbackBody,
      };
    } else {
      return res.status(400).json({
        error:
          "No WhatsApp template configured and no fallback body was provided.",
      });
    }

    const response = await fetch(
      `https://graph.facebook.com/${GRAPH_API_VERSION}/${phoneNumberId}/messages`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      }
    );

    const responseText = await response.text();
    let responseData = {};

    if (responseText) {
      try {
        responseData = JSON.parse(responseText);
      } catch {
        responseData = { error: { message: responseText } };
      }
    }

    if (!response.ok) {
      return res.status(response.status).json({
        error:
          responseData?.error?.message ||
          "WhatsApp Cloud API rejected the request.",
        details: responseData?.error || null,
      });
    }

    return res.status(200).json({
      messageId: responseData?.messages?.[0]?.id || null,
      contactWaId: responseData?.contacts?.[0]?.wa_id || null,
    });
  } catch (error) {
    return res.status(500).json({
      error: error.message || "Unable to send WhatsApp message.",
    });
  }
}
